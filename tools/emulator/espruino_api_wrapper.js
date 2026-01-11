// Espruino API wrapper for emulator
// Provides: g (drawing), Bangle (stubs), E, Storage path helper, timers, setWatch
const path = require("path");

module.exports = function setupEspruinoAPI(opts) {
  opts = opts || {};
  const sendEvent = opts.sendEvent || function () {};

  // --- Utilities ---
  function toNum(v, def) {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return isFinite(n) ? n : def;
    }
    try {
      if (v && typeof v.valueOf === "function") {
        const n = Number(v.valueOf());
        return isFinite(n) ? n : def;
      }
    } catch (e) {}
    return def;
  }

  function clipCoord(v) {
    if (typeof v !== "number" || !isFinite(v)) return 0;
    if (v < 0) return 0;
    if (v > 175) return 175;
    return Math.floor(v);
  }

  // --- g (graphics) ---
  const PALETTE = [
    "#000000",
    "#0000FF",
    "#00FF00",
    "#00FFFF",
    "#FF0000",
    "#FF00FF",
    "#FFFF00",
    "#FFFFFF",
  ];
  let _color = PALETTE[7];
  let _font = { name: "6x8", size: 1 };

  function normalizeColor(c) {
    if (typeof c === "number") return PALETTE[c & 7];
    if (typeof c === "string") {
      if (/^\d+$/.test(c)) return PALETTE[parseInt(c, 10) & 7];
      return c;
    }
    return _color;
  }

  function charWidthForFont(font) {
    const name = (font && font.name) || "6x8";
    const size = (font && font.size) || 1;
    const lname = String(name).toLowerCase();
    if (lname.indexOf("4x6") !== -1) return 4 * size;
    if (lname.indexOf("12x20") !== -1) return 12 * size;
    return 6 * size; // default 6x8
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  const fs = require("fs");
  let __builtin6x8 = null;
  function _loadBuiltin6x8() {
    if (__builtin6x8) return __builtin6x8;
    try {
      const fontPath = path.resolve(
        __dirname,
        "..",
        "..",
        "docs~",
        "modules",
        "Font6x8.js"
      );
      const data = fs.readFileSync(fontPath, "utf8");
      const mFont = data.match(
        /var\s+font\s*=\s*atob\((['"])([A-Za-z0-9+/=]+)\1\)/
      );
      const mWidths = data.match(
        /var\s+widths\s*=\s*atob\((['"])([A-Za-z0-9+/=]+)\1\)/
      );
      if (!mFont || !mWidths) return (__builtin6x8 = null);
      const fontB64 = mFont[2];
      const widthsB64 = mWidths[2];
      const fontBuf = Buffer.from(fontB64, "base64");
      const widthsBuf = Buffer.from(widthsB64, "base64");
      const glyphs = [];
      let off = 0;
      for (let i = 0; i < widthsBuf.length; ++i) {
        const w = widthsBuf[i];
        const cols = [];
        for (let c = 0; c < w; ++c) cols.push(fontBuf[off++]);
        glyphs.push({ w: w, cols: cols });
      }
      __builtin6x8 = { glyphs: glyphs, height: 8, firstChar: 32 };
      return __builtin6x8;
    } catch (e) {
      return (__builtin6x8 = null);
    }
  }

  function renderTextAsSvgImage(text, font, color) {
    const name = (font && font.name) || "6x8";
    const size = Math.max(1, (font && font.size) || 1);
    const lname = String(name).toLowerCase();
    const fg = color || _color || "#000";

    if (lname.indexOf("6x8") !== -1) {
      const f = _loadBuiltin6x8();
      if (f && f.glyphs && f.glyphs.length) {
        const scale = size;
        const chars = String(text).split("");
        const glyphs = [];
        let totalW = 0;
        for (let ch of chars) {
          const code = ch.charCodeAt(0);
          const idx = code - f.firstChar;
          const g =
            idx >= 0 && idx < f.glyphs.length
              ? f.glyphs[idx]
              : { w: 3, cols: [0, 0, 0] };
          glyphs.push(g);
          totalW += g.w + 1;
        }
        if (totalW > 0) totalW -= 1;
        const h = f.height * scale;
        const w = totalW * scale;
        let svg =
          "<svg xmlns='http://www.w3.org/2000/svg' width='" +
          w +
          "' height='" +
          h +
          "' viewBox='0 0 " +
          w +
          " " +
          h +
          "'>";
        svg += "<rect width='100%' height='100%' fill='transparent'/>";
        let x = 0;
        for (let gi = 0; gi < glyphs.length; ++gi) {
          const g = glyphs[gi];
          for (let col = 0; col < g.w; ++col) {
            const b = g.cols[col];
            for (let row = 0; row < f.height; ++row) {
              if (b & (1 << row)) {
                const rx = x + col;
                const ry = row;
                svg +=
                  "<rect x='" +
                  rx * scale +
                  "' y='" +
                  ry * scale +
                  "' width='" +
                  scale +
                  "' height='" +
                  scale +
                  "' fill='" +
                  fg +
                  "'/>";
              }
            }
          }
          x += g.w + 1;
        }
        svg += "</svg>";
        return { type: "svg", svg: svg, width: w, height: h };
      }
    }

    // fallback to simple SVG text
    let baseH = 8,
      baseW = 6;
    if (lname.indexOf("4x6") !== -1) {
      baseW = 4;
      baseH = 6;
    } else if (lname.indexOf("12x20") !== -1) {
      baseW = 12;
      baseH = 20;
    } else if (lname.indexOf("6x8") !== -1) {
      baseW = 6;
      baseH = 8;
    }
    const fontPx = Math.max(1, Math.round(baseH * size));
    const width = Math.max(
      1,
      Math.ceil(charWidthForFont(font) * String(text).length)
    );
    const height = Math.max(fontPx, Math.ceil(fontPx * 1.1));
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" +
      width +
      "' height='" +
      height +
      "' viewBox='0 0 " +
      width +
      " " +
      height +
      "'>" +
      "<rect width='100%' height='100%' fill='transparent'/>" +
      "<text x='0' y='" +
      fontPx +
      "' font-family='monospace' font-size='" +
      fontPx +
      "' fill='" +
      fg +
      "'>" +
      escapeXml(text) +
      "</text></svg>";
    return { type: "svg", svg: svg, width: width, height: height };
  }

  function normalizeRectArgs(args) {
    try {
      if (args.length === 1) {
        const a = args[0];
        if (Array.isArray(a))
          return [
            toNum(a[0], 0),
            toNum(a[1], 0),
            toNum(a[2], 0),
            toNum(a[3], 0),
          ];
        if (a && typeof a === "object")
          return [
            toNum(a.x1 || a.x || 0, 0),
            toNum(a.y1 || a.y || 0, 0),
            toNum(a.x2 || a.w || 0, 0),
            toNum(a.y2 || a.h || 0, 0),
          ];
        if (typeof a === "number") return [a, 0, a, 0];
      }
      return [
        toNum(args[0], 0),
        toNum(args[1], 0),
        toNum(args[2], 0),
        toNum(args[3], 0),
      ];
    } catch (e) {
      return [0, 0, 0, 0];
    }
  }

  function normalizeLineArgs(args) {
    return normalizeRectArgs(args);
  }
  function normalizeCircleArgs(args) {
    try {
      if (args.length === 1) {
        const a = args[0];
        if (Array.isArray(a))
          return [toNum(a[0], 0), toNum(a[1], 0), Math.max(0, toNum(a[2], 0))];
        if (a && typeof a === "object")
          return [
            toNum(a.x || 0, 0),
            toNum(a.y || 0, 0),
            Math.max(0, toNum(a.r || a.radius || 0)),
          ];
        if (typeof a === "number") return [a, 0, 0];
      }
      return [
        toNum(args[0], 0),
        toNum(args[1], 0),
        Math.max(0, toNum(args[2], 0)),
      ];
    } catch (e) {
      return [0, 0, 0];
    }
  }

  function normalizePoly(pts) {
    const out = [];
    try {
      if (Array.isArray(pts)) {
        if (pts.length > 0 && typeof pts[0] === "number") {
          for (let i = 0; i < pts.length; i += 2)
            out.push([clipCoord(pts[i] || 0), clipCoord(pts[i + 1] || 0)]);
        } else {
          pts.forEach((p) => {
            if (Array.isArray(p) && p.length >= 2)
              out.push([clipCoord(p[0]), clipCoord(p[1])]);
            else
              out.push([
                clipCoord(toNum(p && p.x, 0)),
                clipCoord(toNum(p && p.y, 0)),
              ]);
          });
        }
      } else if (pts && typeof pts[Symbol.iterator] === "function") {
        Array.from(pts).forEach((p) => {
          if (Array.isArray(p) && p.length >= 2)
            out.push([clipCoord(p[0]), clipCoord(p[1])]);
          else
            out.push([
              clipCoord(toNum(p && p.x, 0)),
              clipCoord(toNum(p && p.y, 0)),
            ]);
        });
      }
    } catch (e) {}
    return out;
  }

  const g = {
    clear: () => sendEvent({ cmd: "clear" }),
    setColor: function (c) {
      const nc = normalizeColor(c);
      _color = nc;
      return {
        fillRect: function () {
          const [x1, y1, x2, y2] = normalizeRectArgs(arguments);
          const X1 = clipCoord(Math.min(x1, x2));
          const Y1 = clipCoord(Math.min(y1, y2));
          const X2 = clipCoord(Math.max(x1, x2));
          const Y2 = clipCoord(Math.max(y1, y2));
          sendEvent({
            cmd: "fillRect",
            color: nc,
            x1: X1,
            y1: Y1,
            x2: X2,
            y2: Y2,
            inclusive: true,
          });
        },
      };
    },
    setFont: function (f, s) {
      _font = { name: f || _font.name, size: s || _font.size };
      return {
        centerString: (txt, x, y) => {
          sendEvent({
            cmd: "centerString",
            text: String(txt),
            font: _font,
            color: _color,
            x: clipCoord(toNum(x, 0)),
            y: clipCoord(toNum(y, 0)),
          });
        },
        drawString: (txt, x, y) => {
          sendEvent({
            cmd: "drawString",
            text: String(txt),
            font: _font,
            color: _color,
            x: clipCoord(toNum(x, 0)),
            y: clipCoord(toNum(y, 0)),
          });
        },
      };
    },
    drawString: function (txt, x, y) {
      sendEvent({
        cmd: "drawString",
        text: String(txt),
        font: _font,
        color: _color,
        x: clipCoord(toNum(x, 0)),
        y: clipCoord(toNum(y, 0)),
      });
    },
    centerString: function (txt, x, y) {
      sendEvent({
        cmd: "centerString",
        text: String(txt),
        font: _font,
        color: _color,
        x: clipCoord(toNum(x, 0)),
        y: clipCoord(toNum(y, 0)),
      });
    },
    drawRect: function () {
      const [x1, y1, x2, y2] = normalizeRectArgs(arguments);
      sendEvent({
        cmd: "drawRect",
        x1: clipCoord(x1),
        y1: clipCoord(y1),
        x2: clipCoord(x2),
        y2: clipCoord(y2),
      });
    },
    fillRect: function () {
      const [x1, y1, x2, y2] = normalizeRectArgs(arguments);
      sendEvent({
        cmd: "fillRect",
        x1: clipCoord(x1),
        y1: clipCoord(y1),
        x2: clipCoord(x2),
        y2: clipCoord(y2),
        inclusive: true,
      });
    },
    fillPoly: function (pts) {
      sendEvent({ cmd: "fillPoly", pts: normalizePoly(pts) });
    },
    drawLine: function () {
      const [x1, y1, x2, y2] = normalizeLineArgs(arguments);
      sendEvent({
        cmd: "drawLine",
        x1: clipCoord(x1),
        y1: clipCoord(y1),
        x2: clipCoord(x2),
        y2: clipCoord(y2),
      });
    },
    drawCircle: function () {
      const [x, y, r] = normalizeCircleArgs(arguments);
      sendEvent({
        cmd: "drawCircle",
        x: clipCoord(x),
        y: clipCoord(y),
        r: Math.max(0, Math.floor(r)),
      });
    },
    stringWidth: function (s, font) {
      const f = font || _font;
      return s ? charWidthForFont(f) * String(s).length : 0;
    },
    drawImage: function (img, x, y, opts) {
      if (
        arguments.length === 1 &&
        img &&
        typeof img === "object" &&
        !ArrayBuffer.isView(img) &&
        !(img instanceof ArrayBuffer)
      ) {
        const o = img;
        return sendEvent({
          cmd: "drawImage",
          img: o.img || o,
          x: clipCoord(toNum(o.x, 0)),
          y: clipCoord(toNum(o.y, 0)),
          opts: o.opts || o.options || {},
        });
      }
      const X = toNum(x, 0),
        Y = toNum(y, 0);
      return sendEvent({
        cmd: "drawImage",
        img: img,
        x: clipCoord(X),
        y: clipCoord(Y),
        opts: opts || {},
      });
    },
    flip: () => sendEvent({ cmd: "flip" }),
  };

  // --- Bangle stub ---
  let _watches = [];
  let _listeners = {};

  const Bangle = opts.Bangle || {
    setLCDBrightness: (v) => sendEvent({ cmd: "lcd_brightness", v }),
    on: function (ev, cb) {
      _listeners[ev] = _listeners[ev] || [];
      _listeners[ev].push(cb);
    },
    isLCDOn: () => true,
    setLCDPower: (p) => sendEvent({ cmd: "lcd", on: !!p }),
    buzz: (t, v) => sendEvent({ cmd: "buzz", t, v }),
  };

  // storagePath helper
  function storagePath(baseDir) {
    return path.join(baseDir || __dirname, "storage_stub.js");
  }

  // --- E utilities ---
  const E = {
    toArrayBuffer: function (str) {
      if (typeof str !== "string") return str;
      const buf = new ArrayBuffer(str.length);
      const v = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) v[i] = str.charCodeAt(i);
      return buf;
    },
    setTimeZone: function (v) {
      sendEvent({ cmd: "log", msg: "[E.setTimeZone] " + v });
    },
    getTemperature: function () {
      return 25;
    },
  };

  // --- timers ---
  let _nextTimerId = 1;
  const _timers = new Map();
  function setTimeoutShim(cb, ms) {
    const id = _nextTimerId++;
    const ref = setTimeout(() => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
      _timers.delete(id);
    }, ms);
    _timers.set(id, { type: "timeout", ref });
    return id;
  }
  function setIntervalShim(cb, ms) {
    const id = _nextTimerId++;
    const ref = setInterval(() => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    }, ms);
    _timers.set(id, { type: "interval", ref });
    return id;
  }
  function clearTimerShim(id) {
    const t = _timers.get(id);
    if (!t) return;
    try {
      if (t.type === "timeout") clearTimeout(t.ref);
      else if (t.type === "interval") clearInterval(t.ref);
    } catch (e) {}
    _timers.delete(id);
  }

  // --- watches/events ---
  function bind(host) {
    if (!host) return;
    if (host.watches && Array.isArray(host.watches)) _watches = host.watches;
    if (host.listeners && typeof host.listeners === "object")
      _listeners = host.listeners;
  }

  function setWatch(cb, btn, opts) {
    opts = opts || {};
    const w = { cb, btn, opts, lastTime: 0 };
    _watches.push(w);
    return w;
  }

  function triggerWatch(btnName, state) {
    const now = Date.now();
    _watches.slice().forEach((w) => {
      try {
        if (w.btn && w.btn !== btnName) return;
        const opts = w.opts || {};
        if (opts.debounce && now - (w.lastTime || 0) < opts.debounce) return;
        const edge = opts.edge || "both";
        const trigEdge =
          state === 0 || state === 1
            ? state
              ? "rising"
              : "falling"
            : "rising";
        if (edge === "both" || edge === trigEdge) {
          try {
            w.cb({
              time: now,
              pin: btnName,
              state: state === undefined ? 1 : state,
            });
          } catch (e) {
            console.error(e);
          }
          w.lastTime = now;
          if (opts.repeat === false) {
            const pos = _watches.indexOf(w);
            if (pos !== -1) _watches.splice(pos, 1);
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  function triggerEvent(ev, data) {
    (_listeners[ev] || []).forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function cleanup() {
    try {
      _watches.length = 0;
      Object.keys(_listeners).forEach((k) => delete _listeners[k]);
      _timers.forEach((t, id) => {
        clearTimerShim(id);
      });
    } catch (e) {}
  }

  return {
    g: g,
    Bangle: Bangle,
    storagePath: storagePath,
    cleanup: cleanup,
    E: E,
    setWatch: setWatch,
    bind: bind,
    triggerWatch: triggerWatch,
    triggerEvent: triggerEvent,
    setTimeoutShim: setTimeoutShim,
    setIntervalShim: setIntervalShim,
    clearTimerShim: clearTimerShim,
  };
};
