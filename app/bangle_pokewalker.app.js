const STORAGE = require("Storage");
const FILE = "pokewalker.json";

// -------------------------------------------------------------
// LCD Palette
// -------------------------------------------------------------
const P_BG = "#9ca38a";
const P_FG = "#3d4235";

// const pokewalkerPalette = new Uint16Array([
//     0xc676, // #C4CFB4 - Background (Lightest)
//     0xb615, // #B8C3A9
//     0xad73, // #ABB79E
//     0xa552, // #A1AB93
//     0x8cd0, // #8E9983 - Mid-Tones
//     0x7c4e, // #7E8875
//     0x6bcd, // #6F7868
//     0x632b, // #60685A
//     0x52ca, // #51594D - Active Pixels
//     0x4248, // #444B41
//     0x31e6, // #373D35
//     0x2985, // #2B302A
//     0x1903, // #1E211D - The "Ink"
//     0x10c2, // #151814
//     0x0861, // #0D0F0D
//     0x0000, // #050505 - Absolute Black
// ]);

// -------------------------------------------------------------
// App State with History for Stats
// -------------------------------------------------------------
let state = Object.assign(
  {
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
      let volume = this.volIdx * 0.1;
      return volume;
    },
    get contrast() {
      let contrast = this.contrIdx * 0.1;
      return contrast;
    },
    frame: 0,
    emotion: "neutral",
    dowsing: {
      target: null,
      cursor: 0,
      attempts: 0,
      msg: "",
    },
    battle: {
      enemyID: "157",
      enemyHP: 3,
      cursor: 0,
    },
  },
  STORAGE.readJSON(FILE, 1) || {}
);

// ------------------------------------------------------------
// Global Logic States
// -------------------------------------------------------------
let view = "MAIN";
let menuIdx = 4;
let scrollIdx = 0;

// -------------------------------------------------------------
// Menu States
// -------------------------------------------------------------
const menuItems = [
  "RADAR",
  "DOWSING",
  "CONNECT",
  "STATS",
  "INVENTORY",
  "SETTINGS",
  "ROUTE",
];

const menuICONS = [
  "Pokéradar",
  "Dowsing_Mach",
  "Connect",
  "Trainer_Card",
  "Pkmn_and_Itms",
  "Settings",
  "Route",
  // "Trainer",
  //"Pokémon",
  //"Item",
];

// -------------------------------------------------------------
// Settings Labels
// -------------------------------------------------------------
const volLabels = [
  "MUTE",
  "10",
  "20",
  "30",
  "40",
  "50",
  "60",
  "70",
  "80",
  "90",
  "MAX",
];

const contrLabels = [
  "MIN",
  "20",
  "25",
  "30",
  "40",
  "50",
  "60",
  "70",
  "80",
  "90",
  "MAX",
];

// -------------------------------------------------------------
// Route Names
// -------------------------------------------------------------
const routeNames = [
  "Forest2",
  "Paths2",
  "Caves2",
  "City2",
  "Plains2",
  "Lakes2",
  "Sea2",
  "Towns2",
];

// -------------------------------------------------------------
// Message State
// -------------------------------------------------------------
let msgBox = {
  title: "",
  body: "",
  timer: null,
};

// -------------------------------------------------------------
// Utility Functions
// -------------------------------------------------------------
function vibrate() {
  Bangle.buzz(250, state.volume);
}

function applySettings() {
  try {
    Bangle.setLCDBrightness(state.contrast);
    vibrate();
    save();
    return true;
  } catch (e) {
    console.log(e);
    showPokeMessage("ERROR!", "Try Again!", 3000);
  }
}

function save() {
  STORAGE.writeJSON(FILE, state);
}

/**
 * Custom Message Function
 * @param {string} title - The header text
 * @param {string} body - The main message
 * @param {number} ms - How long to show it (in milliseconds)
 */

function showPokeMessage(title, body, ms) {
  view = "MESSAGE";
  msgBox.title = title;
  msgBox.body = body;

  if (msgBox.timer) clearTimeout(msgBox.timer);
  if (ms) {
    msgBox.timer = setTimeout(() => {
      view = "MAIN";
      draw();
    }, ms);
  }

  draw();
}

g.centerString = function (s, x, y) {
  g.drawString(s, x - g.stringWidth(s) / 2, y);
};

// -------------------------------------------------------------
// --- RENDERING ENGINE ---
// -------------------------------------------------------------
function draw() {
  if (view === "SLEEP") {
    g.clear();
    g.flip();
    return;
  }
  g.clear();
  g.setColor(P_BG).fillRect(0, 0, 176, 176);
  g.setColor(P_FG);

  switch (view) {
    case "MAIN":
      drawMain();
      break;
    case "MENU":
      drawIconMenu();
      break;
    case "STATS":
      drawStats();
      break;
    case "CONNECT":
      drawConnect();
      break;
    case "RADAR_SEARCH":
      drawRadarSearch();
      break;
    case "RADAR_BATTLE":
      drawRadarBattle();
      break;
    case "DOWSING":
      drawDowsing();
      break;
    case "INVENTORY":
      drawInventory();
      break;
    case "SETTINGS":
      drawSettings();
      break;
    case "ROUTE":
      drawRoute();
      break;
    case "MESSAGE":
      drawMessageBox();
      break;
    case "SLEEP":
      draw();
      return;
    default:
      g.setFont("6x8", 3).centerString("OOPS!", 88, 40);
      g.setFont("6x8", 2).centerString("Try reloading", 88, 60);
      g.setFont("6x8", 2).centerString("the app", 88, 80);
  }

  g.flip();
}

// -------------------------------------------------------------
// Icon Menu Rendering
function drawIconMenu() {
  g.drawRect(20, 10, 156, 40); // Menu Title Box
  g.setFont("6x8", 2).drawString(
    menuItems[menuIdx],
    88 - g.stringWidth(menuItems[menuIdx]) / 2,
    18
  );

  // Draw Arrows
  g.fillPoly([10, 25, 18, 15, 18, 35]); // Left
  g.fillPoly([166, 25, 158, 15, 158, 35]); // Right

  // Draw Icon Row (with backup rectangles if sprite missing)
  menuItems.forEach((item, i) => {
    let ico = STORAGE.read(`Pokéwalker_${menuICONS[i]}.img`);
    let x = 75 + i * 45 - menuIdx * 45; // Scrolling effect

    try {
      if (ico) g.drawImage(ico, x, 50, { scale: 2 });
    } catch (error) {
      if (!ico) {
        g.drawRect(x, 70, x + 30, 100);
        if (i === menuIdx) g.drawRect(x - 2, 68, x + 32, 102);
      }
    }
  });
}

// -------------------------------------------------------------
// Route Menu Rendering
function drawRoute() {
  g.setFont("6x8", 3).centerString("ROUTE", 88, 15);
  g.setFont("6x8", 2).centerString(state.route, 88, 50);
  // Simple placeholder for route map
  g.drawRect(20, 70, 156, 130);
  g.setFont("4x6", 2).centerString("Map Coming Soon!", 88, 100);
}

//--------------------------------------------------------------
// Draw Message Box
function drawMessageBox() {
  g.drawRect(10, 40, 166, 136); // Outer border
  g.drawRect(12, 42, 164, 134); // Inner border
  g.setFont("6x8", 3).centerString(msgBox.title, 88, 50);
  g.setFont("4x6", 2).centerString(msgBox.body, 88, 90);
  g.setFont("4x6", 2).centerString("--- PRESS CENTER ---", 88, 120);
}

// -------------------------------------------------------------
// Dowsing
function drawDowsing() {
  g.setFont("6x8", 3).drawString("DOWSING", 45, 15);
  g.setFont("6x8", 3).drawString(dowsing.msg || "Find the item!", 35, 40);
  //
  // Draw 6 patches of grass
  for (let i = 0; i < 6; i++) {
    let x = 25 + (i % 3) * 45;
    let y = 65 + Math.floor(i / 3) * 45;
    g.drawRect(x, y, x + 35, y + 35);
    if (dowsing.cursor === i) g.drawRect(x - 2, y - 2, x + 37, y + 37); // Selection cursor
  }
  g.setFont("6x8", 2).drawString(
    "Attempts: " + (2 - dowsing.attempts),
    50,
    155
  );
}

// -------------------------------------------------------------
// Pokéradar - Search
function drawRadarSearch() {
  g.setFont("6x8", 2).drawString("SEARCHING...", 30, 20);
  // Draw 4 grass patches
  for (let i = 0; i < 4; i++) {
    g.drawRect(20 + i * 35, 70, 50 + i * 35, 100);
    if (battle.cursor === i) g.fillRect(25 + i * 35, 105, 45 + i * 35, 110);
  }
}

// -------------------------------------------------------------
// Pokéradar - Battle
function drawRadarBattle() {
  // Enemy
  g.setFont("6x8", 2).drawString("WILD " + battle.enemyID, 10, 10);
  g.fillRect(10, 30, 10 + battle.enemyHP * 20, 35); // HP Bar
  //
  // Controls
  g.setFont("6x8", 2);
  g.drawString("ATK", 20, 150);
  g.drawString("BALL", 75, 150);
  g.drawString("EVADE", 130, 150);
}

// -------------------------------------------------------------
// Stats (Trainer Card)
function drawStats() {
  g.setFont("4x6", 3).centerString("TRAINER CARD", 88, 10);
  g.drawLine(10, 30, 166, 30);

  g.setFont("4x6", 2);
  g.centerString("7-DAY", 88, 34);
  g.centerString("STEP HISTORY", 88, 46);

  // Simple Bar Chart
  state.history.forEach((val, i) => {
    let h = Math.min(60, val / 100);
    g.fillRect(25 + i * 20, 130 - h, 40 + i * 20, 130);
  });

  g.setFont("4x6", 2);
  g.centerString("L <--- DAYS ---> R", 88, 150);
}

// -------------------------------------------------------------
// Emulator Connect Screen
function drawConnect() {
  g.setFont("6x8", 2).drawString("CONNECT", 45, 20);
  g.drawRect(40, 60, 136, 110);
  g.setFont("6x8", 2).drawString("HOLD CENTER", 50, 80);

  // Pulsing Signal Animation
  let pulse = (Date.now() / 500) % 3;
  for (let i = 0; i < pulse; i++) {
    g.drawCircle(88, 140, 10 + i * 10);
  }
}

// -------------------------------------------------------------
// Inventory Screen
function drawInventory() {
  g.setFont("6x8", 2).drawString("INVENTORY", 35, 10);
  g.drawLine(10, 30, 166, 30);

  let list = state.inventory.concat(state.items);

  if (list.length === 0) {
    g.setFont("6x8", 2).drawString("EMPTY", 75, 80);
  } else {
    // Show 4 items at a time
    for (let i = 0; i < 4; i++) {
      let idx = scrollIdx + i;
      if (list[idx]) {
        let y = 45 + i * 25;
        if (i === 0) g.fillRect(15, y - 2, 160, y + 12); // Highlight first
        g.setColor(i === 0 ? P_BG : P_FG);
        g.setFont("6x8", 2).drawString(list[idx], 25, y);
        g.setColor(P_FG);
      }
    }
  }
  g.setFont("6x8", 2).drawString("Press Center to Exit", 35, 155);
}

// -------------------------------------------------------------
// Settings Screen: Walker ↳ Bangle
function drawSettings() {
  g.setFont("6x8", 3).centerString("SETTINGS", 88, 15);
  g.setFont("6x8", 2);

  g.centerString("VOL: " + volLabels[state.volIdx], 88, 60);
  g.centerString("CONTR: " + contrLabels[state.contrIdx], 88, 100);

  g.setFont("6x8", 2).centerString("Press Side", 88, 140);
  g.setFont("6x8", 2).centerString("to Save", 88, 155);
}

// -------------------------------------------------------------
// Home Screen Rendering
function drawMain() {
  g.fillRect(0, 100, 176, 102);
  let PkImg = STORAGE.read(`pw-${state.pokeID}-${state.frame}.img`);
  let RouteImg = STORAGE.read(`Route_${state.route}.img`);
  if (PkImg && RouteImg) {
    g.drawImage(RouteImg, 0, 40, { scale: 3 });
    g.drawImage(PkImg, 45, 5, { scale: 2 });
  } else if (!PkImg && !RouteImg) {
    g.setFont("6x8", 2).drawString("No Poké", 0, 155);
    g.setFont("6x8", 2).drawString("Oops", 0, 155);
  }

  g.setFont("6x8", 3).drawString(
    state.steps.toString(),
    170 - g.stringWidth(state.steps.toString()),
    115
  );
  g.setFont("6x8", 2).drawString(state.watts + "W", 10, 115);
}

// --- LOGIC ---

function startDowsing() {
  if (state.watts < 3) {
    showPokeMessage("ERROR", "Need 3W", 3000);
    return;
  }
  state.watts -= 3;
  dowsing.target = Math.floor(Math.random() * 6);
  dowsing.cursor = 0;
  dowsing.attempts = 0;
  dowsing.msg = "";
  view = "DOWSING";
}

function handleDowsing(btn) {
  if (btn === "LEFT") dowsing.cursor = (dowsing.cursor - 1 + 6) % 6;
  if (btn === "RIGHT") dowsing.cursor = (dowsing.cursor + 1) % 6;
  if (btn === "CENTER") {
    dowsing.attempts++;
    if (dowsing.cursor === dowsing.target) {
      showPokeMessage("ERROR", "Found Item!", 3000);
      state.items.push("Rare Candy"); // Placeholder item
      save();
      view = "MAIN";
    } else if (dowsing.attempts >= 2) {
      showPokeMessage("ERROR", "It fled...");
      view = "MAIN";
    } else {
      // Hot or Cold Logic
      let diff = Math.abs(dowsing.cursor - dowsing.target);
      dowsing.msg = diff === 1 ? "It's NEAR!" : "It's FAR...";
    }
  }
}

// --- INPUT LOGIC ---

function handleAction(btn) {
  Bangle.setLCDPower(1); // Auto-wake
  vibrate();

  if (view === "SLEEP") {
    if (btn === "CENTER") {
      view = "MAIN";
      Bangle.setLCDPower(1);
    } // Wake up
    return;
  }

  switch (view) {
    case "MAIN":
      if (btn === "CENTER") {
        view = "MENU";
      }
      if (btn !== "CENTER") return; // Ignore other buttons
      break;
    case "MENU":
      switch (btn) {
        case "LEFT":
          menuIdx = (menuIdx - 1 + menuItems.length) % menuItems.length;
          break;
        case "RIGHT":
          menuIdx = (menuIdx + 1) % menuItems.length;
          break;
        case "CENTER":
          if (menuItems[menuIdx] === "DOWSING") startDowsing();
          else if (menuItems[menuIdx] === "RADAR") {
            if (state.watts >= 10) {
              state.watts -= 10;
              view = "RADAR_SEARCH";
            } else {
              showPokeMessage("ERROR", "Need 10W", 3000);
            }
          } else {
            view = menuItems[menuIdx];
          }
          break;
      }
      break;
    case "RADAR_SEARCH":
      if (btn === "LEFT") battle.cursor = Math.max(0, battle.cursor - 1);
      if (btn === "RIGHT") battle.cursor = Math.min(3, battle.cursor + 1);
      if (btn === "CENTER") {
        if (Math.random() > 0.5) view = "RADAR_BATTLE";
        else {
          showPokeMessage("ERROR", "Empty...", 3000);
          view = "MAIN";
        }
      }
      break;
    case "RADAR_BATTLE":
      if (btn === "LEFT") {
        battle.enemyHP--;
        if (battle.enemyHP <= 0) {
          showPokeMessage("ERROR", "Enemy Fled!", 3000);
          view = "MAIN";
        }
      }
      if (btn === "CENTER") {
        if (battle.enemyHP === 1) {
          showPokeMessage("ERROR", "CAUGHT!", 3000);
          state.inventory.push(battle.enemyID);
          view = "MAIN";
        } else {
          showPokeMessage("ERROR", "Escaped!", 3000);
          view = "MAIN";
        }
      }
      if (btn === "RIGHT") {
        showPokeMessage("ERROR", "Dodged!", 3000);
      }
      break;
    case "DOWSING":
      handleDowsing(btn);
      break;
    case "STATS":
      if (btn === "LEFT") state.history.unshift(state.history.pop());
      if (btn === "RIGHT") state.history.push(state.history.shift());
      if (btn === "CENTER") view = "MAIN";
      break;
    case "CONNECT":
      if (btn === "CENTER") {
        showPokeMessage("SUCCESS", "Connected!", 3000);
        view = "MAIN";
      }
      break;
    case "SETTINGS":
      if (btn === "LEFT")
        state.volIdx =
          state.volIdx > 0 ? state.volIdx - 1 : volLabels.length - 1;
      if (btn === "RIGHT")
        state.contrIdx = (state.contrIdx + 1) % contrLabels.length;
      if (btn === "CENTER") {
        try {
          applySettings();
          showPokeMessage("!SUCCESS!", "Settings Saved");
          g.setFont("6x8", 2).centerString("Continue", 88, 140);
          g.setFont("6x8", 2).centerString("Home?", 88, 160);
        } catch (e) {
          showPokeMessage("ERROR!", "Try Again!");
        }
      }

      break;

    case "INVENTORY":
      if (btn === "LEFT") {
        scrollIdx = Math.max(0, scrollIdx - 1);
      }
      if (btn === "RIGHT") {
        let list = state.inventory.concat(state.items);
        if (scrollIdx + 4 < list.length) scrollIdx++;
      }
      if (btn === "CENTER") {
        scrollIdx = 0;
        view = "MAIN";
      }
      break;
    case "ROUTE":
      if (btn === "LEFT")
        state.route =
          routeNames[
            (routeNames.indexOf(state.route) - 1 + routeNames.length) %
              routeNames.length
          ];
      if (btn === "RIGHT")
        state.route =
          routeNames[(routeNames.indexOf(state.route) + 1) % routeNames.length];
      if (btn === "CENTER") view = "MAIN";
      break;
    case "MESSAGE":
      if (btn === "CENTER") {
        view = "MAIN";
      }
      if (btn !== "CENTER") return; // Ignore other buttons
      break;
  }

  draw();
}

// Physical Button = CENTER
setWatch(() => handleAction("CENTER"), BTN1, { repeat: true, edge: "rising" });

// Touch Zones = LEFT / RIGHT
Bangle.on("touch", (n, e) => {
  if (e.x < 60) handleAction("LEFT");
  else if (e.x > 116) handleAction("RIGHT");
});

Bangle.on("gesture", (g) => {
  if (view === "MAIN" && g.type === "longpress") {
    view = "SLEEP";
    Bangle.setLCDPower(0);
    draw();
  }
});

// Step Logic
Bangle.on("step", (s) => {
  state.steps++;
  if (state.steps % 20 === 0) {
    state.watts++;
    save();
  }
  if (view === "MAIN") draw();
});

// Animation & Initial Boot
setInterval(() => {
  state.frame = (state.frame + 1) % 2;
  if (Bangle.isLCDOn() && view === "MAIN") draw();
}, 500);

applySettings();
draw();
