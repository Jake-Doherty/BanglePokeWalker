// In-memory Storage mock for Jest tests.
// Replaces the Espruino Storage module so app code can run without touching the filesystem.

const _store = {};

module.exports = {
  read: function(file, offset, length) {
    return undefined; // No files in test storage by default
  },
  write: function(file, content) {
    _store[file] = content;
  },
  readJSON: function(file) {
    const raw = _store[file];
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch(e) { return undefined; }
  },
  writeJSON: function(file, obj) {
    _store[file] = JSON.stringify(obj);
  },
  list: function() {
    return Object.keys(_store);
  },
  _reset: function() {
    Object.keys(_store).forEach(k => delete _store[k]);
  },
};
