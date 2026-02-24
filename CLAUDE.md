# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BanglePokeWalker is a fan-made recreation of the Pokémon HeartGold/SoulSilver PokeWalker peripheral, built as a Bangle.js 2 smartwatch app using Espruino (JavaScript). The app targets the Bangle.js 2's 176×176 display with a 3-bit (8-color) green-tinted palette to mimic the original PokeWalker LCD aesthetic.

## Commands

```bash
# Run emulator with browser UI (localhost:3000)
npm run emu:start

# Run emulator without opening browser
npm run emu:no-open

# Run image converter (converts GIFs from assets/showdown/ → assets/dist/)
npm run "start converter"

# Emulator lifecycle
npm run emu:stop       # stop background instance
npm run emu:status     # check PID/status
npm run emu:restart    # restart background instance
```

There are no automated tests. Manual testing is done via the emulator at `localhost:3000`.

## Architecture

### Espruino Module System
All app files use the Espruino `require()` pattern wrapped in an IIFE:
```js
(function(exports) {
  // ...
  exports.foo = foo;
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
```
This makes each file work both in Espruino (on-device) and in Node.js (emulator/testing).

### App Modules (`app/`)

| File | Role |
|------|------|
| `bangle_pokewalker.app.js` | Entry point: main `draw()` loop, input handling (`BTN1`, touch, gesture, step events), view state machine dispatch |
| `bpw_state.js` | Singleton game state object; merges persisted JSON from `Storage` on load |
| `bpw_draw.js` | All rendering functions — one per screen/view; also contains `drawFromPack()` for sprite rendering |
| `bpw_data.js` | Static data: menu items, icon names, route names, volume/contrast label arrays |
| `bpw_theme.js` | Color palette constants (`P_BG`, `P_FG`) and 16-color Uint16Array palette |
| `game.js` | Mini-game logic: radar search/battle and dowsing machine state transitions |
| `utils.js` | Shared utilities: `save()`, `vibrate()`, `applySettings()`, `showPokeMessage()`, menu navigation |
| `ble_transport.js` | BLE stub (not yet implemented); placeholder for host↔watch communication |
| `install.js` | Helper for flashing files to the device via the Espruino Web IDE REPL |

### View State Machine
`STATE.state.view` drives all rendering. The `draw()` function in `bangle_pokewalker.app.js` dispatches to a `DRAW.*` or `GAME.*` function based on the current view string:

```
MAIN → MENU → RADAR / DOWSING / CONNECT / STATS / INVENTORY / SETTINGS
RADAR → RADAR_SEARCH or RADAR_BATTLE
```

`SLEEP` turns off the LCD; `MESSAGE` is a modal overlay that auto-dismisses or requires CENTER to exit.

### Input Model
- `BTN1` (physical side button) → `"CENTER"`
- Touch left (x < 60) → `"LEFT"`, Touch right (x > 116) → `"RIGHT"`
- Long press gesture on MAIN → SLEEP mode

### Persistence
`utils.save()` serializes `STATE.state` to `pokewalker.json` via Espruino `Storage`. State is loaded in `bpw_state.js` by merging the stored JSON over `baseState`. Getters (`volume`, `contrast`) are intentionally skipped during merge.

### Sprite System
Pokemon sprites are stored as binary asset packs in `assets/dist/`:
- `pws.assets` — packed 3-bit sprite data (64×64px, header: `[width, height, bpp]`)
- `pws.index` — binary index: 8 bytes per entry (4-byte offset + 4-byte length), indexed by `(pokeID * 2 + frame) * 8`
- Files are split into `pws.part0.index` / `pws.part0.assets` etc. on the device due to Espruino storage limits

`drawFromPack(id, frame)` in `bpw_draw.js` reads from these part files. The converter (`converter~/image-converter/image-converter.js`) takes animated GIFs from `assets/showdown/` (named `{dexID}.gif`) and produces these binary packs using `sharp`.

### Emulator (`tools/emulator/`)
A Node.js-based emulator that stubs the Espruino API (`g`, `Bangle`, `Storage`, timers, `setWatch`). The UI variant (`run_emulator_ui.js`) starts an HTTP server at `localhost:3000` rendering a canvas via `tools/emulator/ui/`. Storage is simulated in `tools/emulator/tmp_emu_storage/pokewalker.json`.

## Espruino / Bangle.js 2 Constraints

- **Target resolution:** 176×176 pixels
- **Color mode:** 3-bit (8 colors). The green LCD palette is defined in `bpw_theme.js`
- **Fonts:** Bitmap fonts only — `"6x8"`, `"4x6"`, `"12x20"` (scale with second arg, e.g. `g.setFont("6x8", 2)`)
- **`g.fillRect` is inclusive** — width = `(x2 - x1) + 1`
- **ES5-compatible syntax preferred** for on-device code — avoid `class`, arrow functions are OK but use sparingly
- **No `fetch` or `fs`** inside app code; use Espruino `Storage` for persistence
- `g.centerString(str, x, y)` is polyfilled in `bpw_draw.js` (not a native Espruino method)
- `E.setTimeZone()` sets the watch timezone; currently hardcoded to UTC-8 in `drawMain`

## Deploying to Device

Use the Espruino Web IDE:
1. Copy-paste file contents into `install.js`'s `FILES` object
2. In the REPL: `require('install.js').install()`

Or upload files directly via the Web IDE's file uploader.
