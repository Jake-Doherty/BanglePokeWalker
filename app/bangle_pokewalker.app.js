(function (exports) {
  const STATE = require("bpw_state.js");
  const DRAW = require("bpw_draw.js");
  const THEME = require("bpw_theme.js");
  const UTILS = require("utils.js");
  const DATA = require("bpw_data.js");
  const GAME = require("game.js");

  // -------------------------------------------------------------
  // Utility Functions
  // -------------------------------------------------------------

  function draw() {
    if (STATE.state.view === "SLEEP") {
      g.clear();
      g.flip();
      return;
    }
    g.clear();
    g.setColor(THEME.P_BG).fillRect(0, 0, 176, 176);
    g.setColor(THEME.P_FG);

    switch (STATE.state.view) {
      case "MAIN":
        DRAW.drawMain(STATE.state, DATA, THEME);
        break;
      case "MENU":
        DRAW.drawIconMenu(STATE.state, DATA, THEME);
        break;
      case "STATS":
        DRAW.drawStats(STATE.state, DATA, THEME);
        break;
      case "CONNECT":
        DRAW.drawConnect(STATE.state, DATA, THEME);
        break;
      case "RADAR":
        GAME.startRadar();
        draw();
        break;
      case "RADAR_SEARCH":
        DRAW.drawRadarSearch(STATE.state, DATA, THEME);
        break;
      case "RADAR_BATTLE":
        DRAW.drawRadarBattle(STATE.state, DATA, THEME);
        break;
      case "DOWSING":
        DRAW.drawDowsing(STATE.state, DATA, THEME);
        break;
      case "INVENTORY":
        DRAW.drawInventory(STATE.state, DATA, THEME);
        break;
      case "SETTINGS":
        DRAW.drawSettings(STATE.state, DATA, THEME);
        break;
      case "MESSAGE":
        DRAW.drawMessageBox(STATE.state, DATA, THEME);
        break;
      case "SLEEP":
        draw();
        return;
      default:
        console.log(STATE.state.view);
    }

    g.flip();
  }

  exports.draw = draw;
  global.APP_DRAW = draw;

  // --- LOGIC ---

  // --- INPUT LOGIC ---

  function handleAction(btn) {
    Bangle.setLCDPower(1); // Auto-wake
    UTILS.vibrate();

    if (STATE.state.view === "SLEEP") {
      if (btn === "CENTER") {
        STATE.state.view = "MAIN";
        Bangle.setLCDPower(1);
      } // Wake up
      return;
    }

    switch (STATE.state.view) {
      case "MAIN":
        if (btn === "CENTER") {
          STATE.state.view = "MENU";
        }
        if (btn !== "CENTER") return; // Ignore other buttons for now will work emote logic here later with a function call
        break;
      case "MENU":
        UTILS.handleMainMenuSelection(btn);
        break;
      case "RADAR":
        if (btn === "CENTER") {
          STATE.state.view = "MAIN";
        }
        if (STATE.state.radar.rivalTrainerConnected) {
          STATE.state.view = "RADAR_BATTLE";
        } else {
          STATE.state.view = "RADAR_SEARCH";
        }
        break;
      case "RADAR_SEARCH":
        GAME.handleRadarSearch(btn);
        break;
      case "RADAR_BATTLE":
        GAME.handleRadarBattle(btn);
        break;
      case "DOWSING":
        GAME.handleDowsing(btn);
        break;
      case "STATS":
        if (btn === "LEFT")
          STATE.state.history.unshift(STATE.state.history.pop());
        if (btn === "RIGHT")
          STATE.state.history.push(STATE.state.history.shift());
        if (btn === "CENTER") STATE.state.view = "MAIN";
        break;
      case "CONNECT":
        if (btn === "CENTER") {
          UTILS.showPokeMessage("SUCCESS", "Connected!", 3000);
          STATE.state.view = "MAIN";
        }
        break;
      case "SETTINGS":
        if (btn === "LEFT")
          STATE.state.volIdx =
            STATE.state.volIdx > 0
              ? STATE.state.volIdx - 1
              : DATA.volLabels.length - 1;
        if (btn === "RIGHT")
          STATE.state.contrIdx =
            (STATE.state.contrIdx + 1) % DATA.contrLabels.length;
        if (btn === "CENTER") {
          try {
            UTILS.applySettings();
            UTILS.showPokeMessage("!SUCCESS!", "Settings Saved");
            g.setFont("6x8", 2).centerString("Continue", 88, 140);
            g.setFont("6x8", 2).centerString("Home?", 88, 160);
          } catch (e) {
            UTILS.showPokeMessage("ERROR!", "Try Again!");
          }
        }
        break;
      case "INVENTORY":
        if (btn === "LEFT") {
          STATE.state.scrollIdx = Math.max(0, STATE.state.scrollIdx - 1);
        }
        if (btn === "RIGHT") {
          let list = STATE.state.inventory.concat(STATE.state.items);
          if (STATE.state.scrollIdx + 4 < list.length) STATE.state.scrollIdx++;
        }
        if (btn === "CENTER") {
          STATE.state.scrollIdx = 0;
          STATE.state.view = "MAIN";
        }
        break;
      // unused currently needs to be refactored into trainer card
      // case "ROUTE":
      //   if (btn === "LEFT")
      //     STATE.state.route =
      //       DATA.routeNames[
      //         (DATA.routeNames.indexOf(STATE.state.route) -
      //           1 +
      //           DATA.routeNames.length) %
      //           DATA.routeNames.length
      //       ];
      //   if (btn === "RIGHT")
      //     STATE.state.route =
      //       DATA.routeNames[
      //         (DATA.routeNames.indexOf(STATE.state.route) + 1) %
      //           DATA.routeNames.length
      //       ];
      //   if (btn === "CENTER") STATE.state.view = "MAIN";
      //   break;
      case "MESSAGE":
        if (btn === "CENTER") {
          STATE.state.view = "MAIN";
        }
        if (btn !== "CENTER") return; // Ignore other buttons
        break;
    }

    draw();
  }

  // Physical Button = CENTER
  setWatch(() => handleAction("CENTER"), BTN1, {
    repeat: true,
    edge: "rising",
  });

  // Touch Zones = LEFT / RIGHT
  Bangle.on("touch", (n, e) => {
    if (e.x < 60) handleAction("LEFT");
    else if (e.x > 116) handleAction("RIGHT");
  });

  Bangle.on("gesture", (g) => {
    if (STATE.state.view === "MAIN" && g.type === "longpress") {
      STATE.state.view = "SLEEP";
      Bangle.setLCDPower(0);
      draw();
    }
  });

  // Step Logic
  Bangle.on("step", (s) => {
    STATE.state.steps++;
    if (STATE.state.steps % 20 === 0) {
      STATE.state.watts++;
      UTILS.save();
    }
    if (STATE.state.view === "MAIN") draw();
  });

  // Animation & Initial Boot
  setInterval(() => {
    STATE.state.frame = (STATE.state.frame + 1) % 2;
    if (Bangle.isLCDOn() && STATE.state.view === "MAIN") draw();
  }, 500);

  UTILS.applySettings();
  draw();
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
