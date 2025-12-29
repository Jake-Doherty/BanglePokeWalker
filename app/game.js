(function (exports) {
  const STATE = require("bpw_state.js");
  const UTILS = require("utils.js");

  exports.startDowsing = function () {
    if (STATE.state.watts < 3) {
      UTILS.showPokeMessage("ERROR", "Need 3W", 3000);
      return;
    }
    STATE.state.watts -= 3;
    STATE.state.dowsing.target = Math.floor(Math.random() * 6);
    STATE.state.dowsing.cursor = 0;
    STATE.state.dowsing.attempts = 0;
    STATE.state.dowsing.msg = "";
    STATE.state.view = "DOWSING";
  };
})(typeof exports !== "undefined" ? exports : (this.exports = {}));

exports.handleDowsing = function (btn) {
  if (btn === "LEFT")
    STATE.state.dowsing.cursor = (STATE.state.dowsing.cursor - 1 + 6) % 6;
  if (btn === "RIGHT")
    STATE.state.dowsing.cursor = (STATE.state.dowsing.cursor + 1) % 6;
  if (btn === "CENTER") {
    STATE.state.dowsing.attempts++;
    if (STATE.state.dowsing.cursor === STATE.state.dowsing.target) {
      UTILS.showPokeMessage("SUCCESS!", "Found Item!", 3000);
      STATE.state.items.push("Rare Candy"); // Placeholder item
      UTILS.save();
      STATE.state.view = "MAIN";
    } else if (STATE.state.dowsing.attempts >= 2) {
      UTILS.showPokeMessage("ERROR", "It fled...");
      STATE.state.view = "MAIN";
    } else {
      // Hot or Cold Logic
      let diff = Math.abs(
        STATE.state.dowsing.cursor - STATE.state.dowsing.target
      );
      STATE.state.dowsing.msg = diff === 1 ? "It's NEAR!" : "It's FAR...";
    }
  }
};
