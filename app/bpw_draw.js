(function (exports) {
  const STORAGE = require("Storage");

  if (!g.centerString)
    g.centerString = function (s, x, y) {
      g.drawString(s, x - g.stringWidth(s) / 2, y);
    };

  // -------------------------------------------------------------
  // Icon Menu Rendering
  exports.drawIconMenu = function (state, DATA, THEME) {
    function drawSlctArrw(x) {
      g.fillPoly([x + 14, 60, x + 6, 50, x + 22, 50]);
    }
    // Menu Title Box
    g.drawRect(20, 10, 156, 40);
    //Chosen Menu name
    g.setFont("6x8", 2).drawString(
      DATA.menuItems[state.menuIdx],
      88 - g.stringWidth(DATA.menuItems[state.menuIdx]) / 2,
      18
    );

    drawSlctArrw(state.menuIdx * 30);

    // Draw Arrows
    g.fillPoly([10, 25, 18, 15, 18, 35]); // Left
    g.fillPoly([166, 25, 158, 15, 158, 35]); // Right

    // Draw Icon Row (with backup rectangles if sprite missing)
    DATA.menuItems.forEach((item, i) => {
      let ico = STORAGE.read(`Pokéwalker_${DATA.menuICONS[i]}.img`);
      let x = i * (176 / 6) + 176 / 6 / 2 - 12;

      try {
        if (ico)
          g.drawImage(ico, x, 65, {
            scale: 1.5,
          });
      } catch (error) {
        if (!ico) {
          g.drawRect(x, 70, x + 30, 100);
          if (i === state.menuIdx) g.drawRect(x - 2, 68, x + 32, 102);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Route Menu Rendering
  exports.drawRoute = function (state, DATA, THEME) {
    g.setFont("6x8", 3).centerString("ROUTE", 88, 15);
    g.setFont("6x8", 2).centerString(state.route, 88, 50);
    // Simple placeholder for route map
    g.drawRect(20, 70, 156, 130);
    g.setFont("4x6", 2).centerString("Map Coming Soon!", 88, 100);
  };

  //--------------------------------------------------------------
  // Draw Message Box
  exports.drawMessageBox = function (state, DATA, THEME) {
    g.drawRect(10, 40, 166, 136); // Outer border
    g.drawRect(12, 42, 164, 134); // Inner border
    g.setFont("6x8", 3).centerString(state.msgBox.title, 88, 50);
    g.setFont("4x6", 2).centerString(state.msgBox.body, 88, 90);
    g.setFont("4x6", 2).centerString("--- PRESS CENTER ---", 88, 120);
  };

  // -------------------------------------------------------------
  // Dowsing
  exports.drawDowsing = function (state, DATA, THEME) {
    g.setFont("6x8", 3).drawString("DOWSING", 45, 15);
    g.setFont("6x8", 3).drawString(
      state.dowsing.msg || "Find the item!",
      35,
      40
    );
    //
    // Draw 6 patches of grass
    for (let i = 0; i < 6; i++) {
      let x = 25 + (i % 3) * 45;
      let y = 65 + Math.floor(i / 3) * 45;
      g.drawRect(x, y, x + 35, y + 35);
      if (state.dowsing.cursor === i) g.drawRect(x - 2, y - 2, x + 37, y + 37); // Selection cursor
    }
    g.setFont("6x8", 2).drawString(
      "Attempts: " + (2 - state.dowsing.attempts),
      50,
      155
    );
  };

  // -------------------------------------------------------------
  // Pokéradar - Search
  exports.drawRadarSearch = function (state, DATA, THEME) {
    g.setFont("6x8", 2).centerString("SEARCHING...", 88, 20);
    // Draw 4 grass patches
    for (let i = 0; i < 4; i++) {
      g.drawRect(20 + i * 35, 70, 50 + i * 35, 100);
      if (state.radar.battle.cursor === i)
        g.fillRect(25 + i * 35, 105, 45 + i * 35, 110);
    }
  };

  // -------------------------------------------------------------
  // Pokéradar - Battle
  exports.drawRadarBattle = function (state, DATA, THEME) {
    // Enemy
    g.setFont("6x8", 2).drawString(
      "WILD " + state.radar.battle.enemyID,
      10,
      10
    );
    g.fillRect(10, 30, 10 + state.radar.battle.enemyHP * 20, 35); // HP Bar
    //
    // Controls
    g.setFont("6x8", 2);
    g.drawString("ATK", 20, 150);
    g.drawString("BALL", 75, 150);
    g.drawString("EVADE", 130, 150);
  };

  // -------------------------------------------------------------
  // Stats (Trainer Card)
  exports.drawStats = function (state, DATA, THEME) {
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
  };

  // -------------------------------------------------------------
  // Emulator Connect Screen
  exports.drawConnect = function (state, DATA, THEME) {
    g.setFont("6x8", 2).drawString("CONNECT", 45, 20);
    g.drawRect(40, 60, 136, 110);
    g.setFont("6x8", 2).drawString("HOLD CENTER", 50, 80);

    // Pulsing Signal Animation
    let pulse = (Date.now() / 500) % 3;
    for (let i = 0; i < pulse; i++) {
      g.drawCircle(88, 140, 10 + i * 10);
    }
  };

  // -------------------------------------------------------------
  // Inventory Screen
  exports.drawInventory = function (state, DATA, THEME) {
    g.setFont("6x8", 2).drawString("INVENTORY", 35, 10);
    g.drawLine(10, 30, 166, 30);

    let list = state.inventory.concat(state.items);

    if (list.length === 0) {
      g.setFont("6x8", 2).drawString("EMPTY", 75, 80);
    } else {
      // Show 4 items at a time
      for (let i = 0; i < 4; i++) {
        let idx = state.scrollIdx + i;
        if (list[idx]) {
          let y = 45 + i * 25;
          if (i === 0) g.fillRect(15, y - 2, 160, y + 12); // Highlight first
          g.setColor(i === 0 ? THEME.P_BG : THEME.P_FG);
          g.setFont("6x8", 2).drawString(list[idx], 25, y);
          g.setColor(THEME.P_FG);
        }
      }
    }
    g.setFont("6x8", 2).drawString("Press Center to Exit", 35, 155);
  };

  // -------------------------------------------------------------
  // Settings Screen: Walker ↳ Bangle
  exports.drawSettings = function (state, DATA, THEME) {
    g.setFont("6x8", 3).centerString("SETTINGS", 88, 15);
    g.setFont("6x8", 2);

    g.centerString("VOL: " + DATA.volLabels[state.volIdx], 88, 60);
    g.centerString("CONTR: " + DATA.contrLabels[state.contrIdx], 88, 100);

    g.setFont("6x8", 2).centerString("Press Side", 88, 140);
    g.setFont("6x8", 2).centerString("to Save", 88, 155);
  };

  // -------------------------------------------------------------
  // Home Screen Rendering
  exports.drawMain = function (state, DATA, THEME) {
    g.fillRect(0, 100, 176, 102);
    E.setTimeZone(-8); // Sets the system to UTC-8 (PST)
    let d = new Date();
    let timeStr =
      d.getHours() + ":" + d.getMinutes().toString().padStart(2, "0");
    let dayStr = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
    g.setFont("4x6", 2); // Smaller font for the day
    g.drawString(dayStr + " " + timeStr, 10, 155);
    let PkImg = STORAGE.read(`pw-${state.pokeID}-${state.frame}.img`);
    let RouteImg = STORAGE.read(`Route_${state.route}.img`);
    if (PkImg && RouteImg) {
      g.drawImage(RouteImg, 0, 52, {
        scale: 2,
      });
      g.drawImage(PkImg, 45, 5, {
        scale: 2,
      });
    } else if (!PkImg && !RouteImg) {
      g.setFont("6x8", 2).drawString("No Poké", 0, 155);
      g.setFont("6x8", 2).drawString("Oops", 0, 140);
    }

    g.setFont("6x8", 3).drawString(
      state.steps.toString(),
      170 - g.stringWidth(state.steps.toString()),
      115
    );
    g.setFont("4x6", 2).drawString("STEPS", 170 - g.stringWidth("STEPS"), 140);
    g.setFont("6x8", 2).drawString(state.watts + "W", 10, 115);
  };
})(typeof exports !== "undefined" ? exports : (this.exports = {}));
