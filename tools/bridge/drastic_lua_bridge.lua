-- drastic_lua_bridge.lua
-- DraStic Lua helper for Pokéwalker bridging (file-polling mode).
--
-- Purpose:
--  - Monitor the DS SPI registers used by HG/SS for Pokéwalker IR.
--  - When the game writes outgoing IR bytes, write them to a request file.
--  - Poll for a response file created by an external Python bridge and inject
--    the response bytes back into the game's SPI buffer so the game continues.
--
-- Notes:
--  - This script assumes DraStic exposes these functions: drastic.read_u8,
--    drastic.write_u8, drastic.read_u16, drastic.write_u16 and a frame-yield
--    helper. DraStic's exact API can vary between builds; adjust the yield
--    function at the top of the file if necessary.
--  - No luasocket is used. Communication with the external bridge is via the
--    emulator/device filesystem: the Lua script writes request files and waits
--    for response files to appear. The Python bridge polls the request file,
--    performs BLE comms and writes the response file.
--  - Paths: set REQUEST_FILE and RESPONSE_FILE to a folder DraStic can access
--    (on Android: /sdcard/DrasticBridge/ or similar). Create that folder on the
--    device and make sure the Python bridge uses the same paths.
--
-- WARNING: Timing is important for the Pokéwalker protocol. This simple file-
-- polling bridge adds latency. Use short poll intervals and test reliability.

-- Configuration
local REQUEST_FILE  = "/sdcard/DrasticBridge/request.hex"  -- file the Lua writes outgoing bytes to (hex)
local RESPONSE_FILE = "/sdcard/DrasticBridge/response.hex" -- file the Python bridge writes incoming bytes to
local POLL_TIMEOUT_SEC = 5                               -- how long to wait for a response before giving up
local POLL_SLEEP_FRAMES = 1                              -- frames to yield between polls (1 = next frame)

-- DS SPI registers used by the game (ARM9 address space)
local SPI_DATA_ADDR   = 0x040001C0  -- 8-bit SPI Data register
local SPI_CTRL_ADDR   = 0x040001C2  -- 16-bit SPI Control register (status/control bits)

-- Chip-select mask heuristics: adjust if necessary
local IR_CS_MASK = 0x0B00  -- bits that indicate chip select / specific device access

-- Helper: yield for a frame. DraStic uses different names across builds;
-- try to replace this with the right function if this one isn't valid.
local function frame_yield()
  -- Preferred: DraStic's API may provide 'drastic.frameadvance()' or 'emu.frameadvance()'.
  -- If neither exists, this will attempt a short busy wait using os.clock().
  if drastic and drastic.frameadvance then
    drastic.frameadvance()
    return
  end
  if emu and emu.frameadvance then
    emu.frameadvance()
    return
  end
  -- Fallback: sleep-ish busy loop to yield CPU briefly.
  local t0 = os.clock()
  while os.clock() - t0 < (1/60) do end
end

-- Small helpers for file operations
local function write_hex_file(path, hexstr)
  local f, err = io.open(path, "w")
  if not f then
    print("drastic_lua_bridge: write_hex_file open error:", err)
    return false
  end
  f:write(hexstr)
  f:close()
  return true
end

local function read_hex_file(path)
  local f, err = io.open(path, "r")
  if not f then return nil end
  local s = f:read("*a")
  f:close()
  return s
end

local function delete_file(path)
  os.remove(path)
end

-- Convert byte (0-255) to two-char hex
local function byte_to_hex(b)
  return string.format("%02X", b & 0xFF)
end

-- Convert hex string (maybe with whitespace) to bytes table
local function hex_to_bytes(hexstr)
  if not hexstr then return nil end
  local cleaned = string.gsub(hexstr, "%s+", "")
  if #cleaned % 2 ~= 0 then
    -- odd length, cannot parse
    return nil
  end
  local bytes = {}
  for i = 1, #cleaned, 2 do
    local byte = tonumber(string.sub(cleaned, i, i+1), 16)
    if not byte then return nil end
    table.insert(bytes, byte)
  end
  return bytes
end

-- Main loop
print("drastic_lua_bridge: starting (request=", REQUEST_FILE, ")")
while true do
  -- Read SPI control to see if the game is addressing the IR chip
  local spi_ctrl = drastic.read_u16(SPI_CTRL_ADDR)
  -- Check chip select bits (tweak mask if needed)
  if (spi_ctrl & IR_CS_MASK) ~= 0 then
    -- The game is selecting the IR chip; read the outgoing byte
    local out_byte = drastic.read_u8(SPI_DATA_ADDR)

    -- Write the outgoing byte(s) to the request file in hex format
    local ok = write_hex_file(REQUEST_FILE, byte_to_hex(out_byte))
    if not ok then
      print("drastic_lua_bridge: failed writing request file")
    else
      print("drastic_lua_bridge: wrote request byte", string.format("0x%02X", out_byte))
    end

    -- Wait up to POLL_TIMEOUT_SEC for a response file
    local t0 = os.time()
    local resp_hex = nil
    while os.time() - t0 < POLL_TIMEOUT_SEC do
      frame_yield()  -- give emulator a frame
      -- attempt to read response
      resp_hex = read_hex_file(RESPONSE_FILE)
      if resp_hex and #resp_hex > 0 then break end
    end

    if not resp_hex or #resp_hex == 0 then
      print("drastic_lua_bridge: response timeout")
      -- Optionally inject 0x00 or leave bus unchanged
    else
      -- Parse hex and inject bytes back into SPI data register
      local bytes = hex_to_bytes(resp_hex)
      if bytes and #bytes >= 1 then
        -- Inject only the first byte; the game expects byte-per-transfer
        local resp_byte = bytes[1]
        drastic.write_u8(SPI_DATA_ADDR, resp_byte)
        print("drastic_lua_bridge: injected response byte", string.format("0x%02X", resp_byte))
        -- Toggle status/control bits so game sees data available.
        -- Which bit to toggle depends on the game; try setting bit 0 (example).
        local ctrl_now = drastic.read_u16(SPI_CTRL_ADDR)
        drastic.write_u16(SPI_CTRL_ADDR, bit32.bor(ctrl_now, 0x0001))
      else
        print("drastic_lua_bridge: invalid response hex")
      end
      -- remove response to mark consumed
      delete_file(RESPONSE_FILE)
    end
  end

  -- yield for a frame to avoid hogging CPU
  for i=1,POLL_SLEEP_FRAMES do frame_yield() end
end
