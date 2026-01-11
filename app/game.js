(function (exports) {
  const STATE = require("bpw_state.js");
  const UTILS = require("utils.js");

  function startRadar() {
    console.log("are you there");
    if (STATE.state.watts < 10) {
      UTILS.showPokeMessage("Go Walk!", "Need 10W");
      return;
    }
    if (STATE.state.rivalTrainerConnected) {
      STATE.state.view = "RADAR_BATTLE";
    } else {
      STATE.state.view = "RADAR_SEARCH";
    }
    try {
      STATE.state.watts -= 10;
      STATE.state.radar.searching = true;
      STATE.state.radar.target = Math.floor(Math.random() * 3);
    } catch (e) {
      UTILS.showPokeMessage("ERROR", "Failed to start POKéRADAR");
    }
  }

  function handleRadarBattle(btn) {
    if (STATE.state.view !== "RADAR_BATTLE") return;
    if (btn === "LEFT") {
      STATE.state.radar.battle.enemyHP--;
    }
    if (STATE.state.radar.battle.enemyHP <= 0) {
      UTILS.showPokeMessage("OH NO!", "Wild Pokemon Fainted!");
    }
    if (btn === "CENTER") {
      if (STATE.state.radar.battle.enemyHP === 1) {
        UTILS.showPokeMessage("SUCCESS!", "Caught!");
        STATE.state.inventory.push(STATE.state.radar.battle.enemyID);
        UTILS.save();
      } else {
        UTILS.showPokeMessage("ESCAPED!", "Wild Pokemon Escaped!");
      }
    }
  }

  function handleRadarSearch(btn) {
    if (STATE.state.view !== "RADAR_SEARCH") return;
    if (btn === "LEFT")
      STATE.state.radar.search.cursor =
        (STATE.state.radar.search.cursor - 1 + 4) % 4;
    if (btn === "RIGHT")
      STATE.state.radar.search.cursor =
        (STATE.state.radar.search.cursor + 1) % 4;
    if (btn === "CENTER") {
      if (STATE.state.radar.search.cursor === STATE.state.radar.target) {
        STATE.state.view = "RADAR_BATTLE";
        STATE.state.radar.battle.enemyHP = 3;
      } else {
        UTILS.showPokeMessage("MISS!", "No Pokemon Found!");
      }
    }
  }

  function startDowsing() {
    if (STATE.state.watts < 3) {
      UTILS.showPokeMessage("Go Walk!", "Need 3W");
      return;
    }
    STATE.state.watts -= 3;
    STATE.state.dowsing.target = Math.floor(Math.random() * 6);
    STATE.state.dowsing.cursor = 0;
    STATE.state.dowsing.attempts = 0;
    STATE.state.dowsing.msg = "";
    STATE.state.view = "DOWSING";
  }

  function handleDowsing(btn) {
    if (btn === "LEFT")
      STATE.state.dowsing.cursor = (STATE.state.dowsing.cursor - 1 + 6) % 6;
    if (btn === "RIGHT")
      STATE.state.dowsing.cursor = (STATE.state.dowsing.cursor + 1) % 6;
    if (btn === "CENTER") {
      STATE.state.dowsing.attempts++;
      if (STATE.state.dowsing.cursor === STATE.state.dowsing.target) {
        UTILS.showPokeMessage("SUCCESS!", "Found Item!");
        STATE.state.items.push("Rare Candy"); // Placeholder item
        UTILS.save();
      } else if (STATE.state.dowsing.attempts >= 2) {
        UTILS.showPokeMessage("ERROR", "It fled...");
      } else {
        // Hot or Cold Logic
        let diff = Math.abs(
          STATE.state.dowsing.cursor - STATE.state.dowsing.target
        );
        STATE.state.dowsing.msg = diff === 1 ? "It's NEAR!" : "It's FAR...";
      }
    }
  }

  exports.startRadar = startRadar;
  exports.handleRadarBattle = handleRadarBattle;
  exports.handleRadarSearch = handleRadarSearch;
  exports.startDowsing = startDowsing;
  exports.handleDowsing = handleDowsing;
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
