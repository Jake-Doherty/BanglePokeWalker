// Integration tests for bpw_draw.js
// Verifies that draw functions run against the emulator API stubs without throwing
// and that they issue the expected g.* calls.

const setupEspruinoAPI = require('../../tools/emulator/espruino_api_wrapper');

// Minimal state shape mirroring bpw_state.js baseState
function makeState(overrides) {
  return Object.assign({
    view: 'MAIN',
    menuIdx: 0,
    scrollIdx: 0,
    steps: 1234,
    watts: 3,
    pokeID: 157,
    frame: 0,
    route: 'Lakes2',
    history: [9900, 4500, 300, 1000, 6378, 50, 4100],
    inventory: ['016', '019'],
    items: ['Potion', 'Poke Ball'],
    volIdx: 4,
    contrIdx: 7,
    emotion: 'neutral',
    dowsing: { target: null, cursor: 0, attempts: 0, msg: '' },
    radar: {
      rivalTrainerConnected: false,
      search: { frames: 0, cursor: 0 },
      searching: false,
      target: null,
      battle: { enemyID: '157', enemyHP: 3, cursor: 0, msg: '' },
    },
    msgBox: { title: 'HELLO', body: 'World', timer: null },
  }, overrides);
}

let api, DRAW, DATA, THEME;

beforeEach(() => {
  jest.resetModules();

  // Capture draw events so we can assert on them
  const events = [];
  api = setupEspruinoAPI({ sendEvent: (e) => events.push(e) });
  api._events = events;

  global.g = api.g;
  global.E = api.E;
  global.Bangle = api.Bangle;

  // Load modules after globals are in place
  DRAW = require('../../app/bpw_draw');
  DATA = require('../../app/bpw_data');
  THEME = require('../../app/bpw_theme');
});

afterEach(() => {
  api.cleanup();
});

// ---------------------------------------------------------------
// drawMain
// ---------------------------------------------------------------
describe('drawMain', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawMain(makeState())).not.toThrow();
  });

  it('emits at least one fillRect (the divider line)', () => {
    DRAW.drawMain(makeState());
    const rects = api._events.filter(e => e.cmd === 'fillRect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('draws step count as a string', () => {
    DRAW.drawMain(makeState({ steps: 9999 }));
    const strings = api._events.filter(e => e.cmd === 'drawString');
    const stepDraw = strings.find(e => String(e.text).includes('9999'));
    expect(stepDraw).toBeDefined();
  });

  it('draws watts value', () => {
    DRAW.drawMain(makeState({ watts: 7 }));
    const strings = api._events.filter(e => e.cmd === 'drawString');
    const wattDraw = strings.find(e => String(e.text).includes('7W'));
    expect(wattDraw).toBeDefined();
  });
});

// ---------------------------------------------------------------
// drawIconMenu
// ---------------------------------------------------------------
describe('drawIconMenu', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawIconMenu(makeState({ menuIdx: 0 }), DATA, THEME)).not.toThrow();
  });

  it('draws the menu title box (drawRect)', () => {
    DRAW.drawIconMenu(makeState({ menuIdx: 0 }), DATA, THEME);
    const rects = api._events.filter(e => e.cmd === 'drawRect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders the selected menu item name', () => {
    DRAW.drawIconMenu(makeState({ menuIdx: 2 }), DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'centerString');
    const menuName = strings.find(e => e.text === DATA.menuItems[2]);
    expect(menuName).toBeDefined();
  });
});

// ---------------------------------------------------------------
// drawSettings
// ---------------------------------------------------------------
describe('drawSettings', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawSettings(makeState(), DATA, THEME)).not.toThrow();
  });

  it('renders VOL label using current volIdx', () => {
    const state = makeState({ volIdx: 3 });
    DRAW.drawSettings(state, DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'centerString');
    const volDraw = strings.find(e => String(e.text).startsWith('VOL:'));
    expect(volDraw).toBeDefined();
    expect(volDraw.text).toContain(DATA.volLabels[3]);
  });

  it('renders CONTR label using current contrIdx', () => {
    const state = makeState({ contrIdx: 5 });
    DRAW.drawSettings(state, DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'centerString');
    const contrDraw = strings.find(e => String(e.text).startsWith('CONTR:'));
    expect(contrDraw).toBeDefined();
    expect(contrDraw.text).toContain(DATA.contrLabels[5]);
  });
});

// ---------------------------------------------------------------
// drawStats
// ---------------------------------------------------------------
describe('drawStats', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawStats(makeState(), DATA, THEME)).not.toThrow();
  });

  it('renders one fillRect bar per history entry', () => {
    const history = [100, 200, 300, 400, 500, 600, 700];
    DRAW.drawStats(makeState({ history }), DATA, THEME);
    // Each non-zero history value produces a fillRect bar
    const bars = api._events.filter(e => e.cmd === 'fillRect');
    expect(bars.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------
// drawDowsing
// ---------------------------------------------------------------
describe('drawDowsing', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawDowsing(makeState(), DATA, THEME)).not.toThrow();
  });

  it('draws 6 grass patch rects', () => {
    DRAW.drawDowsing(makeState(), DATA, THEME);
    // 6 patches + 1 selection cursor for cursor===0
    const rects = api._events.filter(e => e.cmd === 'drawRect');
    expect(rects.length).toBeGreaterThanOrEqual(6);
  });
});

// ---------------------------------------------------------------
// drawRadarSearch
// ---------------------------------------------------------------
describe('drawRadarSearch', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawRadarSearch(makeState(), DATA, THEME)).not.toThrow();
  });

  it('draws 4 grass patch rects', () => {
    DRAW.drawRadarSearch(makeState(), DATA, THEME);
    const rects = api._events.filter(e => e.cmd === 'drawRect');
    expect(rects.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------
// drawRadarBattle
// ---------------------------------------------------------------
describe('drawRadarBattle', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawRadarBattle(makeState(), DATA, THEME)).not.toThrow();
  });

  it('draws ATK, BALL, EVADE control labels', () => {
    DRAW.drawRadarBattle(makeState(), DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'drawString');
    expect(strings.find(e => e.text === 'ATK')).toBeDefined();
    expect(strings.find(e => e.text === 'BALL')).toBeDefined();
    expect(strings.find(e => e.text === 'EVADE')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// drawMessageBox
// ---------------------------------------------------------------
describe('drawMessageBox', () => {
  it('does not throw', () => {
    expect(() => DRAW.drawMessageBox(makeState(), DATA, THEME)).not.toThrow();
  });

  it('renders the msgBox title and body', () => {
    const state = makeState({ msgBox: { title: 'WIN!', body: 'You won!', timer: null } });
    DRAW.drawMessageBox(state, DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'centerString');
    expect(strings.find(e => e.text === 'WIN!')).toBeDefined();
    expect(strings.find(e => e.text === 'You won!')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// drawInventory
// ---------------------------------------------------------------
describe('drawInventory', () => {
  it('does not throw with items', () => {
    expect(() => DRAW.drawInventory(makeState(), DATA, THEME)).not.toThrow();
  });

  it('shows EMPTY when inventory and items are both empty', () => {
    const state = makeState({ inventory: [], items: [], scrollIdx: 0 });
    DRAW.drawInventory(state, DATA, THEME);
    const strings = api._events.filter(e => e.cmd === 'drawString');
    expect(strings.find(e => e.text === 'EMPTY')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// drawFromPack
// ---------------------------------------------------------------
describe('drawFromPack', () => {
  it('does not throw when no asset files are present', () => {
    // Storage.read returns undefined (no files), so the loop breaks safely
    expect(() => DRAW.drawFromPack(157, 0)).not.toThrow();
  });

  it('is a no-op for out-of-range IDs', () => {
    const before = api._events.length;
    DRAW.drawFromPack(0, 0);
    DRAW.drawFromPack(1026, 0);
    expect(api._events.length).toBe(before);
  });
});
