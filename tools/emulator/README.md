tools/emulator README

This folder contains helper scripts and stubs for running a local Node-based emulator/smoke-runner for the app.

Files:
- run_emulator.js  : Node script that stubs Bangle/g APIs and runs the app code for quick testing.
- storage_stub.js  : Simple Storage shim used by the Node runner.

Notes:
- These are developer tools only and are not used on the device.
- You can modify or expand the stubs to emulate BLE, input events, or different hardware behaviors.
