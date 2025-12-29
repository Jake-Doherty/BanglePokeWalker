(function (exports) {
  const STORAGE = require("Storage");
  const STATE = require("bpw_state.js");
  const FILE = "pokewalker.json";

  function vibrate() {
    Bangle.buzz(250, STATE.state.volume);
  }
  exports.vibrate = vibrate;

  function save() {
    STORAGE.writeJSON(FILE, STATE.state);
  }
  exports.save = save;

  function applySettings() {
    try {
      Bangle.setLCDBrightness(STATE.state.contrast);
      vibrate();
      save();
      return true;
    } catch (e) {
      console.log(e);
      showPokeMessage("ERROR!", "Try Again!", 3000);
    }
  }
  exports.applySettings = applySettings;

  /**
   * Custom Message Function
   * @param {string} title - The header text
   * @param {string} body - The main message
   * @param {number} ms - How long to show it (in milliseconds)
   */

  exports.showPokeMessage = function (title, body, ms) {
    STATE.state.view = "MESSAGE";
    STATE.state.msgBox.title = title;
    STATE.state.msgBox.body = body;

    if (STATE.state.msgBox.timer) clearTimeout(STATE.state.msgBox.timer);
    if (ms) {
      STATE.state.msgBox.timer = setTimeout(() => {
        STATE.state.view = "MAIN";
        if (global && global.APP_DRAW) global.APP_DRAW();
      }, ms);
    }

    if (global && global.APP_DRAW) global.APP_DRAW();
  };
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
