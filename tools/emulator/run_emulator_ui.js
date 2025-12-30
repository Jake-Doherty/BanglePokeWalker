// Simple SSE-based UI server for the Bangle emulator
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const UI_DIR = path.join(__dirname, "ui");
const PORT = 3000;

const PID_FILE = path.join(__dirname, 'emulator.pid');
const LOG_FILE = path.join(__dirname, 'emulator.log');

let sseClients = [];

// Early CLI: support `stop` and `status`
if (process.argv[2] === 'stop') {
  try {
    if (!fs.existsSync(PID_FILE)) {
      console.log('No pid file found at', PID_FILE);
      process.exit(1);
    }
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    if (!pid) throw new Error('Invalid pid');
    try { process.kill(pid); console.log('Sent termination to pid', pid); } catch (e) { console.error('Failed to kill pid', pid, e.message); }
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
    process.exit(0);
  } catch (e) {
    console.error('Stop failed', e);
    process.exit(2);
  }
}

if (process.argv[2] === 'status') {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    console.log('emulator pid:', pid);
  } else console.log('emulator not running (no pid file)');
  process.exit(0);
}

function sendEvent(obj) {
  const data = "data: " + JSON.stringify(obj) + "\n\n";
  sseClients.forEach((res) => {
    try {
      res.write(data);
    } catch (e) {}
  });
}

function handleInput(obj) {
  if (!obj || !obj.type) return;
  if (obj.type === "button") {
    console.log('[INPUT] button', obj.btn);
    // Map CENTER UI button to BTN1 (physical button) so setWatch handlers fire
    if (obj.btn === 'CENTER') {
      const btnName = 'BTN1';
      watches.forEach((w) => {
        try {
          if (!w.btn || w.btn === btnName) w.cb();
        } catch (e) {
          console.error(e);
        }
      });
      // echo to UI for visual feedback
      sendEvent({ cmd: 'input', type: 'button', btn: 'CENTER' });
      return;
    }
    // Map LEFT/RIGHT UI buttons to touchscreen events (side presses)
    if (obj.btn === 'LEFT' || obj.btn === 'RIGHT') {
      const x = obj.btn === 'LEFT' ? 10 : 160;
      const e = { x: x, y: 88 };
      (listeners['touch'] || []).forEach((cb) => {
        try {
          cb(0, e);
        } catch (e) {
          console.error(e);
        }
      });
      // echo to UI for visual feedback
      sendEvent({ cmd: 'input', type: 'button', btn: obj.btn });
      return;
    }
  } else if (obj.type === "touch") {
    // echo to UI for visual feedback
    sendEvent({ cmd: 'input', type: 'touch', x: obj.x, y: obj.y });
    const e = { x: obj.x, y: obj.y };
    (listeners["touch"] || []).forEach((cb) => {
      try {
        cb(0, e);
      } catch (e) {
        console.error(e);
      }
    });
  } else if (obj.type === "gesture") {
    (listeners["gesture"] || []).forEach((cb) => {
      try {
        cb(obj);
      } catch (e) {
        console.error(e);
      }
    });
  } else if (obj.type === "step") {
    (listeners["step"] || []).forEach((cb) => {
      try {
        cb(obj);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    sseClients.push(res);
    req.on("close", () => {
      sseClients = sseClients.filter((r) => r !== res);
    });
    return;
  }
  if (url === "/input" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const obj = JSON.parse(body);
        handleInput(obj);
        res.writeHead(204);
        res.end();
      } catch (e) {
        res.writeHead(400);
        res.end("bad");
      }
    });
    return;
  }

  // Serve static files from ui dir
  const f = url === "/" ? "/index.html" : url;
  const p = path.join(UI_DIR, decodeURIComponent(f));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    fs.createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log("UI server listening at http://localhost:" + PORT);
  // open browser unless --no-open passed
  if (!process.argv.includes('--no-open')){
    const start =
      process.platform === "win32"
        ? "start"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";
    exec(`${start} http://localhost:${PORT}`);
  }
});

// Setup logging and PID file if requested (detached or --log)
let logStream = null;
function startLoggingIfNeeded(){
  const shouldLog = process.env.__EMULATOR_DETACHED === '1' || process.argv.includes('--log') || process.argv.includes('--detach');
  if(!shouldLog) return;
  try{
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    const origLog = console.log;
    const origErr = console.error;
    console.log = function(){ origLog.apply(console, arguments); try{ logStream.write(new Date().toISOString() + ' LOG: ' + Array.from(arguments).join(' ') + '\n'); }catch(e){} };
    console.error = function(){ origErr.apply(console, arguments); try{ logStream.write(new Date().toISOString() + ' ERR: ' + Array.from(arguments).join(' ') + '\n'); }catch(e){} };
  }catch(e){ console.error('Failed to open log file', e); }
}

function writePid(){
  try{ fs.writeFileSync(PID_FILE, String(process.pid)); console.log('Wrote pid', process.pid, 'to', PID_FILE); }catch(e){ console.error('Failed to write pid file', e); }
}

function cleanupAndExit(code){
  try{ if(fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); }catch(e){}
  try{ if(logStream) logStream.end(); }catch(e){}
  process.exit(code||0);
}

process.on('SIGTERM', ()=>{ console.log('SIGTERM received, shutting down'); server.close(()=> cleanupAndExit(0)); });
process.on('SIGINT', ()=>{ console.log('SIGINT received, shutting down'); server.close(()=> cleanupAndExit(0)); });

// Start logging and write pid when server is ready
startLoggingIfNeeded();
if(process.env.__EMULATOR_DETACHED === '1' || process.argv.includes('--detach')) writePid();

// --------------------
// Emulated globals
// --------------------
global.sendToUI = sendEvent;

const watches = [];
const listeners = {};

// Basic g shim with common drawing primitives used by the app
global.g = (() => {
  let _color = '#fff';
  let _font = { name: '6x8', size: 2 };
  return {
    clear: () => sendEvent({ cmd: 'clear' }),
    setColor: (c) => { _color = c; return { fillRect: (x1,y1,x2,y2) => sendEvent({ cmd:'fillRect', color:c, x1,y1,x2,y2 }) }; },
    setFont: (f,s) => { _font = { name: f, size: s }; return { centerString: (txt,x,y) => sendEvent({ cmd:'centerString', text:txt, x,y, font:f, size:s }), drawString: (txt,x,y) => sendEvent({ cmd:'drawString', text:txt, x,y, font:f, size:s }) }; },
    drawString: (txt,x,y) => sendEvent({ cmd:'drawString', text:txt, x,y, font:_font }),
    centerString: (txt,x,y) => sendEvent({ cmd:'centerString', text:txt, x,y, font:_font }),
    drawRect: (x1,y1,x2,y2) => sendEvent({ cmd:'drawRect', x1,y1,x2,y2 }),
    fillRect: (x1,y1,x2,y2) => sendEvent({ cmd:'fillRect', x1,y1,x2,y2 }),
    fillPoly: (pts) => sendEvent({ cmd:'fillPoly', pts }),
    drawLine: (x1,y1,x2,y2) => sendEvent({ cmd:'drawLine', x1,y1,x2,y2 }),
    drawCircle: (x,y,r) => sendEvent({ cmd:'drawCircle', x,y,r }),
    stringWidth: (s) => (s ? s.length * 6 : 0),
    drawImage: (img,x,y,opts) => sendEvent({ cmd:'drawImage', img, x,y,opts }),
    flip: () => sendEvent({ cmd:'flip' })
  };
})();

// Minimal showPokeMessage global to avoid ReferenceErrors (delegates if utils available)
global.showPokeMessage = function(title, body, ms){
  try{ const u = global.require && global.require('utils.js'); if(u && u.showPokeMessage) return u.showPokeMessage(title, body, ms); }catch(e){}
  sendEvent({ cmd:'message', title, body, ms });
};

// Extend Bangle shim with brightness API used by the app
if(!global.Bangle) global.Bangle = {};
global.Bangle.setLCDBrightness = global.Bangle.setLCDBrightness || function(v){ sendEvent({ cmd:'lcd_brightness', v }); };

global.setWatch = (cb, btn, opts) => {
  watches.push({ cb, btn, opts });
  console.log("[setWatch] registered", btn, opts);
};

global.BTN1 = "BTN1";
global.Bangle.on = (ev, cb) => {
  listeners[ev] = listeners[ev] || [];
  listeners[ev].push(cb);
  console.log("[Bangle] on", ev);
};
global.Bangle.isLCDOn = () => true;
global.Bangle.setLCDPower = (p) => sendEvent({ cmd: "lcd", on: !!p });
global.Bangle.buzz = (t, v) => sendEvent({ cmd: "buzz", t, v });

// Custom require that loads app/ modules into the VM and keeps nested requires routed here.
const moduleCache = {};
global.require = function (name) {
  const map = { Storage: path.join(__dirname, 'storage_stub.js') };
  if (map[name]) return require(map[name]);

  // Resolve to app folder (two levels up)
  const fileName = name.endsWith('.js') ? name : name + '.js';
  const appFile = path.join(__dirname, '..', '..', 'app', fileName);
  if (!fs.existsSync(appFile)) throw new Error('Cannot find module ' + name);
  if (moduleCache[appFile]) return moduleCache[appFile].exports;

  const code = fs.readFileSync(appFile, 'utf8');
  const module = { exports: {} };
  moduleCache[appFile] = module;
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  fn(module.exports, global.require, module, appFile, path.dirname(appFile));
  return module.exports;
};

// After globals and custom require are set up, load the main app into the VM
try{
  const appPath = path.join(__dirname, '..', '..', 'app', 'bangle_pokewalker.app.js');
  console.log('Starting app:', appPath);
  const vm = require('vm');
  const code = fs.readFileSync(appPath, 'utf8');
  const sandbox = {
    console: console,
    require: global.require,
    setInterval: setInterval,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    global: global,
    exports: {},
    module: { exports: {} },
    // Emulator globals expected by the app
    setWatch: global.setWatch,
    g: global.g,
    Bangle: global.Bangle,
    BTN1: global.BTN1
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: appPath });
  console.log('App executed in VM');
}catch(e){
  console.error('Run error', e);
}

// If --detach passed, spawn a detached background copy (without --detach) and exit parent
if(process.argv.includes('--detach')){
  if(process.env.__EMULATOR_DETACHED !== '1'){
    const child = require('child_process').spawn(process.execPath, [__filename, '--no-open'], {
      detached: true,
      stdio: 'ignore',
      env: Object.assign({}, process.env, { __EMULATOR_DETACHED: '1' })
    });
    child.unref();
    console.log('Spawned detached emulator (pid', child.pid + ')');
    process.exit(0);
  }
}
