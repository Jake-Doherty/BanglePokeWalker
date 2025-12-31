(function (exports) {
  const STORAGE = require("Storage");
  const FILE = "pokewalker.json";

  const baseState = {
    view: "MAIN",
    menuIdx: 4,
    scrollIdx: 0,
    steps: 0,
    watts: 0,
    pokeID: "157",
    route: "Lakes2",
    history: [9900, 4500, 300, 1000, 6378, 50, 4100], // Last 7 days
    inventory: ["016", "019"],
    items: ["Potion", "Poké Ball"],
    volIdx: 4,
    contrIdx: 7,
    get volume() {
      return this.volIdx * 0.1;
    },
    get contrast() {
      return this.contrIdx * 0.1;
    },
    frame: 0,
    emotion: "neutral",
    dowsing: {
      target: null,
      cursor: 0,
      attempts: 0,
      msg: "",
    },
    radar: {
      rivalTrainerConnected: false,
      search: {
        frames: 0,
        cursor: 0,
      },
      searching: false,
      target: null,
      battle: {
        enemyID: "157",
        enemyHP: 3,
        cursor: 0,
        msg: "",
      },
    },
    msgBox: {
      title: "",
      body: "",
      timer: null,
    },
  };

  const stored = STORAGE.readJSON(FILE, 1) || {};
  for (let k in stored) {
    const desc = Object.getOwnPropertyDescriptor(baseState, k);
    if (desc && (desc.get || desc.set)) continue;
    baseState[k] = stored[k];
  }

  exports.state = baseState;
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
