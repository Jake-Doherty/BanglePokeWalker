const fs = require("fs");
const path = require("path");

function base(file) {
  // store files relative to project root
  return path.join(__dirname, "..", file);
}

exports.readJSON = function (file, safe) {
  try {
    const p = base(file);
    if (!fs.existsSync(p)) return undefined;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return undefined;
  }
};

exports.writeJSON = function (file, obj) {
  try {
    const p = base(file);
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
    return true;
  } catch (e) {
    return false;
  }
};

exports.read = function (name) {
  // binary image stub: return null to indicate missing
  return null;
};

exports.write = function (name, data) {
  // noop
  return true;
};
