// E2E tests for BanglePokeWalker view navigation.
// Loads the full app through the emulator stubs and simulates user input
// (button presses, touch events) to verify state machine transitions
// and that the correct draw path is triggered — without flashing to device.

const setupEspruinoAPI = require('../../tools/emulator/espruino_api_wrapper');

let api, STATE, events;

// Touch handlers in the app use (n, e) signature — n is touch number, e is {x, y}.
// triggerEvent only passes a single arg, so we capture listeners manually and fire them
// with the correct two-argument signature.
const _bangleListeners = {};
function fireTouch(x, y) {
  (_bangleListeners['touch'] || []).forEach(cb => cb(1, { x, y: y || 88 }));
}
function fireGesture(type) {
  (_bangleListeners['gesture'] || []).forEach(cb => cb({ type }));
}
function fireStep() {
  (_bangleListeners['step'] || []).forEach(cb => cb({}));
}

beforeEach(() => {
  jest.resetModules();
  Object.keys(_bangleListeners).forEach(k => delete _bangleListeners[k]);

  // Capture all draw events
  events = [];
  api = setupEspruinoAPI({ sendEvent: (e) => events.push(e) });

  // Wrap Bangle.on to store listeners with their real signatures
  const _origBangle = api.Bangle;
  global.Bangle = Object.assign({}, _origBangle, {
    on: function(ev, cb) {
      _bangleListeners[ev] = _bangleListeners[ev] || [];
      _bangleListeners[ev].push(cb);
    },
  });

  // Wire up all globals the app expects before loading any module
  global.g = api.g;
  global.E = api.E;
  global.setWatch = api.setWatch;
  global.BTN1 = 'BTN1';

  // Use jest fake timers so setInterval/setTimeout in the app don't fire on their own
  global.setInterval = jest.fn(() => 1);
  global.clearInterval = jest.fn();
  global.setTimeout = jest.fn(() => 2);
  global.clearTimeout = jest.fn();

  // Loading the app registers all event handlers and calls initial draw()
  require('../../app/bangle_pokewalker.app.js');

  // Require STATE after the app has loaded (shares the same module instance)
  STATE = require('../../app/bpw_state');
});

afterEach(() => {
  api.cleanup();
  events.length = 0;
});

// ---------------------------------------------------------------
// MAIN → MENU (CENTER press)
// ---------------------------------------------------------------
describe('MAIN screen', () => {
  it('starts on the MAIN view', () => {
    expect(STATE.state.view).toBe('MAIN');
  });

  it('pressing CENTER transitions to MENU', () => {
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe('MENU');
  });

  it('initial draw calls g.fillRect at least once', () => {
    const rects = events.filter(e => e.cmd === 'fillRect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('initial draw calls g.flip', () => {
    expect(events.find(e => e.cmd === 'flip')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// MENU navigation (touch LEFT / RIGHT)
// ---------------------------------------------------------------
describe('MENU navigation', () => {
  beforeEach(() => {
    // Navigate to MENU first
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe('MENU');
    events.length = 0; // Clear boot events
  });

  it('touch RIGHT increments menuIdx', () => {
    const before = STATE.state.menuIdx;
    fireTouch(150);
    expect(STATE.state.menuIdx).toBe((before + 1) % 6);
  });

  it('touch LEFT decrements menuIdx (wraps around)', () => {
    STATE.state.menuIdx = 0;
    fireTouch(10);
    expect(STATE.state.menuIdx).toBe(5); // wraps to last item
  });

  it('pressing CENTER in MENU navigates to the selected view', () => {
    const DATA = require('../../app/bpw_data');
    const targetView = DATA.menuItems[STATE.state.menuIdx];
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe(targetView);
  });

  it('re-draws the menu after LEFT touch', () => {
    fireTouch(10);
    // After input, draw() is called — should emit centerString for the menu title
    const strings = events.filter(e => e.cmd === 'centerString');
    expect(strings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------
// Sleep / Wake (gesture)
// ---------------------------------------------------------------
describe('SLEEP mode', () => {
  it('a longpress gesture on MAIN triggers SLEEP', () => {
    expect(STATE.state.view).toBe('MAIN');
    fireGesture('longpress');
    expect(STATE.state.view).toBe('SLEEP');
  });

  it('pressing CENTER while SLEEPING wakes to MAIN', () => {
    fireGesture('longpress');
    expect(STATE.state.view).toBe('SLEEP');
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe('MAIN');
  });

  it('SLEEP clears the display', () => {
    events.length = 0;
    fireGesture('longpress');
    expect(events.find(e => e.cmd === 'clear')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// Step counting
// ---------------------------------------------------------------
describe('step counting', () => {
  it('each step event increments STATE.state.steps', () => {
    const before = STATE.state.steps;
    fireStep();
    expect(STATE.state.steps).toBe(before + 1);
  });

  it('every 20 steps increments watts by 1', () => {
    STATE.state.steps = 19;
    const beforeWatts = STATE.state.watts;
    fireStep(); // 20th step
    expect(STATE.state.watts).toBe(beforeWatts + 1);
  });

  it('a step on MAIN triggers a redraw (g.flip called)', () => {
    events.length = 0;
    fireStep();
    expect(events.find(e => e.cmd === 'flip')).toBeDefined();
  });
});

// ---------------------------------------------------------------
// SETTINGS view
// ---------------------------------------------------------------
describe('SETTINGS view', () => {
  beforeEach(() => {
    STATE.state.view = 'SETTINGS';
    events.length = 0;
  });

  it('LEFT decrements volIdx', () => {
    STATE.state.volIdx = 5;
    fireTouch(10);
    expect(STATE.state.volIdx).toBe(4);
  });

  it('RIGHT increments contrIdx (wraps)', () => {
    STATE.state.contrIdx = 10;
    fireTouch(150);
    expect(STATE.state.contrIdx).toBe(0); // wraps around 11 labels
  });
});

// ---------------------------------------------------------------
// INVENTORY view
// ---------------------------------------------------------------
describe('INVENTORY view', () => {
  beforeEach(() => {
    STATE.state.view = 'INVENTORY';
    STATE.state.scrollIdx = 0;
    // Need 5+ items so scrollIdx + 4 < list.length passes the scroll guard
    STATE.state.inventory = ['016', '019', '020'];
    STATE.state.items = ['Potion', 'Poke Ball'];
    events.length = 0;
  });

  it('RIGHT touch scrolls the list forward when items remain', () => {
    fireTouch(150);
    expect(STATE.state.scrollIdx).toBe(1);
  });

  it('LEFT touch scrolls back but stops at 0', () => {
    STATE.state.scrollIdx = 0;
    fireTouch(10);
    expect(STATE.state.scrollIdx).toBe(0);
  });

  it('CENTER press returns to MAIN and resets scrollIdx', () => {
    STATE.state.scrollIdx = 2;
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe('MAIN');
    expect(STATE.state.scrollIdx).toBe(0);
  });
});

// ---------------------------------------------------------------
// STATS view
// ---------------------------------------------------------------
describe('STATS view', () => {
  beforeEach(() => {
    STATE.state.view = 'STATS';
    events.length = 0;
  });

  it('LEFT touch rotates history array backwards', () => {
    const original = [...STATE.state.history];
    fireTouch(10);
    expect(STATE.state.history[0]).toBe(original[original.length - 1]);
  });

  it('RIGHT touch rotates history array forwards', () => {
    const original = [...STATE.state.history];
    fireTouch(150);
    expect(STATE.state.history[STATE.state.history.length - 1]).toBe(original[0]);
  });

  it('CENTER returns to MAIN', () => {
    api.triggerWatch('BTN1', 1);
    expect(STATE.state.view).toBe('MAIN');
  });
});
