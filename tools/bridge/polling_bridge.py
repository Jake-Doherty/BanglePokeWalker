#!/usr/bin/env python3
"""
File-polling Bridge for DraStic <-> Bangle.js
- Polls a request file written by DraStic Lua (hex or comma-separated bytes).
- Sends the bytes to the Bangle (BLE via Bleak) or forwards them to a WebSocket/HTTP bridge.
- Writes the response bytes to a response file for the DraStic Lua script to pick up.

Requirements:
- Python 3.8+
- pip install bleak

Configure characteristic UUIDs to match the Bangle service you use.
"""

import asyncio
import argparse
import os
import re
import time
import logging

try:
    from bleak import BleakClient, BleakScanner
except Exception:
    BleakClient = None

# Default placeholders - replace with actual UUIDs for your Bangle service
WRITE_CHAR_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb"  # Write to device
NOTIFY_CHAR_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb"  # Notifications from device

# Whitening byte used by Pokéwalker protocol
WHITEN_XOR = 0xAA

log = logging.getLogger("polling_bridge")


def parse_bytes_from_text(s: str) -> bytes:
    s = s.strip()
    if not s:
        return b""
    # Try hex string (0a1b2c... or 0A 1B 2C)
    hex_candidate = re.sub(r"[^0-9A-Fa-f]", "", s)
    if len(hex_candidate) >= 2 and len(hex_candidate) % 2 == 0:
        try:
            return bytes.fromhex(hex_candidate)
        except Exception:
            pass
    # Try comma/space separated decimals
    nums = re.findall(r"\d+", s)
    if nums:
        return bytes([int(x) & 0xFF for x in nums])
    # Fallback: return empty
    return b""


def bytes_to_hex(b: bytes) -> str:
    return b.hex()


def whiten_bytes(b: bytes) -> bytes:
    return bytes(x ^ WHITEN_XOR for x in b)


def unwhiten_bytes(b: bytes) -> bytes:
    # same operation is its own inverse
    return whiten_bytes(b)


async def ble_send_and_get_response(address, write_uuid, notify_uuid, data, timeout=3.0):
    if BleakClient is None:
        raise RuntimeError("Bleak not installed")
    log.info(f"Scanning for {address or 'device'}...")
    client = None
    if address is None:
        # try to find by name
        devices = await BleakScanner.discover(timeout=2.0)
        target = None
        for d in devices:
            log.debug(f"Found BLE: {d}")
            if address and d.address == address:
                target = d
                break
        if not target:
            # fallback: pick first device with a name
            for d in devices:
                if d.name:
                    target = d
                    break
        if not target:
            raise RuntimeError("No BLE device found")
        address = target.address

    async with BleakClient(address) as client:
        log.info("Connected to BLE device")
        # subscribe to notifications
        response_future = asyncio.get_event_loop().create_future()

        def _notif_handler(_, data_bytes: bytearray):
            if not response_future.done():
                response_future.set_result(bytes(data_bytes))

        await client.start_notify(notify_uuid, _notif_handler)
        await client.write_gatt_char(write_uuid, data)
        try:
            res = await asyncio.wait_for(response_future, timeout=timeout)
            await client.stop_notify(notify_uuid)
            return bytes(res)
        except asyncio.TimeoutError:
            await client.stop_notify(notify_uuid)
            raise


async def bridge_loop(args):
    req_path = args.request_file
    resp_path = args.response_file

    last_mtime = 0
    while True:
        try:
            if os.path.exists(req_path):
                mtime = os.path.getmtime(req_path)
                if mtime > last_mtime:
                    last_mtime = mtime
                    txt = open(req_path, "r").read()
                    log.info("Detected new request file")
                    pkt = parse_bytes_from_text(txt)
                    if not pkt:
                        log.warn("Parsed empty packet")
                        open(resp_path, "w").write("")
                    else:
                        # Optionally unwhiten if file contents are whitened
                        if args.unwhiten:
                            pkt = unwhiten_bytes(pkt)

                        log.info(f"Packet to send to Bangle (len={len(pkt)}): {bytes_to_hex(pkt)}")

                        # send over BLE or use echo
                        resp = b""
                        if args.ble_address or args.ble_name:
                            try:
                                resp = await ble_send_and_get_response(
                                    args.ble_address or args.ble_name,
                                    args.write_uuid or WRITE_CHAR_UUID,
                                    args.notify_uuid or NOTIFY_CHAR_UUID,
                                    pkt,
                                    timeout=args.ble_timeout,
                                )
                                log.info(f"Received response from BLE device (len={len(resp)}): {bytes_to_hex(resp)}")
                            except Exception as e:
                                log.exception("BLE transaction failed")
                                resp = b""
                        else:
                            log.info("No BLE configured; echoing back packet")
                            resp = pkt

                        # Optionally whiten before writing response back to DraStic
                        if args.whiten:
                            resp = whiten_bytes(resp)

                        open(resp_path, "wb").write(resp)
                        log.info(f"Wrote response ({len(resp)} bytes) to {resp_path}")
            await asyncio.sleep(args.poll_interval)
        except Exception:
            log.exception("Bridge loop error")
            await asyncio.sleep(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--request-file", default="./drastic_request.bin", help="File the Lua script will write requests to")
    parser.add_argument("--response-file", default="./drastic_response.bin", help="File this bridge will write responses to")
    parser.add_argument("--poll-interval", default=0.3, type=float, help="Seconds between polls")
    parser.add_argument("--ble-address", default=None, help="BLE address of the Bangle device (or None to scan)")
    parser.add_argument("--ble-name", default=None, help="BLE name to scan for (alternative to address)")
    parser.add_argument("--write-uuid", default=None, help="GATT char UUID to write to (device-specific)")
    parser.add_argument("--notify-uuid", default=None, help="GATT notify char UUID to subscribe to (device-specific)")
    parser.add_argument("--ble-timeout", default=3.0, type=float, help="Timeout for BLE response (seconds)")
    parser.add_argument("--whiten", action="store_true", help="Whiten response bytes before writing to response file")
    parser.add_argument("--unwhiten", action="store_true", help="Unwhiten request bytes read from request file")
    parser.add_argument("--debug", action="store_true")

    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)

    try:
        asyncio.run(bridge_loop(args))
    except KeyboardInterrupt:
        print("Interrupted")


if __name__ == '__main__':
    main()
