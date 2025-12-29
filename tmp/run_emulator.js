// Minimal Node-based smoke runner to emulate Espruino/Bangle APIs
const path = require("path");
const Module = require("module");
// Patch module resolution so bare requires like 'bpw_state.js' resolve to app/ files
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  const known = [
    "bpw_state.js",
    "bpw_draw.js",
    "bpw_theme.js",
    "bpw_data.js",
    "utils.js",
    "game.js",
    "bangle_pokewalker.app.js",
  ];
  if (known.includes(request)) {
    const mapped = path.join(__dirname, "..", "app", request);
    return origResolve.call(this, mapped, parent, isMain, options);
  }
  // map Espruino built-ins
  if (request === "Storage")
    return origResolve.call(
      this,
      path.join(__dirname, "storage_stub.js"),
      parent,
      isMain,
      options
    );
  return origResolve.call(this, request, parent, isMain, options);
};

// Provide minimal globals used by the app
global.BTN1 = 1;
global.setWatch = function (cb, btn, opts) {
  console.log("[setWatch] registered", btn, opts);
};
global.setInterval = setInterval;
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

global.g = {
  clear: () => console.log("[g] clear"),
  flip: () => console.log("[g] flip"),
  setColor: function () {
    return this;
  },
  fillRect: (...a) => console.log("[g] fillRect", a),
  drawString: (...a) => console.log("[g] drawString", a),
  stringWidth: (s) => (s ? s.length * 6 : 0),
  drawImage: (...a) => console.log("[g] drawImage", a),
  drawRect: (...a) => console.log("[g] drawRect", a),
  fillRect: (...a) => console.log("[g] fillRect", a),
  drawLine: (...a) => console.log("[g] drawLine", a),
  drawCircle: (...a) => console.log("[g] drawCircle", a),
  fillPoly: (...a) => console.log("[g] fillPoly", a),
  setFont: function (f, s) {
    return this;
  },
};

global.Bangle = {
  buzz: (t, v) => console.log("[Bangle] buzz", t, v),
  setLCDBrightness: (c) => console.log("[Bangle] setLCDBrightness", c),
  setLCDPower: (p) => console.log("[Bangle] setLCDPower", p),
  on: (ev, cb) => console.log("[Bangle] on", ev),
  isLCDOn: () => true,
};

console.log("Starting smoke-run of app...");
try {
  // require app - it will call applySettings() and draw()
  require(path.join(__dirname, "..", "app", "bangle_pokewalker.app.js"));
  console.log("App required successfully");
} catch (e) {
  console.error("Error while requiring app:", e);
  process.exit(1);
}

// Keep process alive briefly for intervals
setTimeout(() => {
  console.log("Smoke-run finished");
  process.exit(0);
}, 1500);
