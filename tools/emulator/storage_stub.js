// Minimal Storage shim for Node-based smoke tests
const path = require("path");
const fs = require("fs");
const STORAGE_DIR = path.resolve(__dirname, "./tmp_emu_storage");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

exports.read = function (file, offset, length) {
  const p = path.join(STORAGE_DIR, file);
  if (!fs.existsSync(p)) return undefined;
  // Read as Buffer so we can return binary slices when requested
  const buf = fs.readFileSync(p);
  if (typeof offset === "number") {
    const off = Math.max(0, offset);
    const len =
      typeof length === "number" && length > 0 ? length : buf.length - off;
    return buf.slice(off, off + len).toString("latin1");
  }
  // default: return full file as latin1 (binary) string
  return buf.toString("latin1");
};

exports.write = function (file, content) {
  const p = path.join(STORAGE_DIR, file);
  // Accept Buffer or string; write as binary (latin1) if string looks like binary
  if (Buffer.isBuffer(content)) fs.writeFileSync(p, content);
  else fs.writeFileSync(p, String(content), "utf8");
};

exports.readJSON = function (file, rev) {
  const c = exports.read(file);
  if (!c) return undefined;
  try {
    return JSON.parse(c);
  } catch (e) {
    return undefined;
  }
};

exports.writeJSON = function (file, obj) {
  exports.write(file, JSON.stringify(obj));
};

exports.list = function () {
  return fs.readdirSync(STORAGE_DIR);
};

// Exports for direct require() in the Node runner
module.exports = exports;
