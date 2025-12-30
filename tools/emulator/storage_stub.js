// Minimal Storage shim for Node-based smoke tests
const path = require("path");
const fs = require("fs");
const STORAGE_DIR = path.resolve(__dirname, "./tmp_emu_storage");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

exports.read = function (file) {
  const p = path.join(STORAGE_DIR, file);
  if (!fs.existsSync(p)) return undefined;
  return fs.readFileSync(p, "utf8");
};

exports.write = function (file, content) {
  const p = path.join(STORAGE_DIR, file);
  fs.writeFileSync(p, content, "utf8");
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
