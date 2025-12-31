(function (exports) {
  const STORAGE = require("Storage");
  const STATE = require("bpw_state.js");
  const DATA = require("bpw_data.js");
  const FILE = "pokewalker.json";

  function vibrate() {
    Bangle.buzz(250, STATE.state.volume);
  }

  function save() {
    STORAGE.writeJSON(FILE, STATE.state);
  }

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

  /**
   * Custom Message Function
   * @param {string} title - The header text
   * @param {string} body - The main message
   * @param {number} ms - How long to show it (in milliseconds)
   */

  function showPokeMessage(title, body, ms) {
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
  }

  function handleMainMenuSelection(btn) {
    if (btn === "LEFT") {
      STATE.state.menuIdx =
        (STATE.state.menuIdx - 1 + DATA.menuItems.length) %
        DATA.menuItems.length;
    }
    if (btn === "RIGHT") {
      STATE.state.menuIdx = (STATE.state.menuIdx + 1) % DATA.menuItems.length;
    }
    if (btn === "CENTER") {
      STATE.state.view = DATA.menuItems[STATE.state.menuIdx];
      console.log(STATE.state.view);
      console.log(DATA.menuItems[STATE.state.menuIdx]);
    }
  }
  exports.vibrate = vibrate;
  exports.save = save;
  exports.applySettings = applySettings;
  exports.showPokeMessage = showPokeMessage;
  exports.handleMainMenuSelection = handleMainMenuSelection;
  //
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
