// Unit tests for bpw_data.js
// This module is pure static data with no dependencies -- no stubs needed.

const DATA = require('../../app/bpw_data');

describe('bpw_data', () => {
  describe('menuItems', () => {
    it('exports an array of menu item strings', () => {
      expect(Array.isArray(DATA.menuItems)).toBe(true);
      DATA.menuItems.forEach(item => expect(typeof item).toBe('string'));
    });

    it('contains the expected menu entries', () => {
      expect(DATA.menuItems).toEqual([
        'RADAR',
        'DOWSING',
        'CONNECT',
        'STATS',
        'INVENTORY',
        'SETTINGS',
      ]);
    });

    it('has 6 menu items', () => {
      expect(DATA.menuItems).toHaveLength(6);
    });
  });

  describe('menuICONS', () => {
    it('exports an array of icon name strings', () => {
      expect(Array.isArray(DATA.menuICONS)).toBe(true);
      DATA.menuICONS.forEach(icon => expect(typeof icon).toBe('string'));
    });

    it('has 10 icon entries', () => {
      expect(DATA.menuICONS).toHaveLength(10);
    });
  });

  describe('volLabels', () => {
    it('exports an array of volume label strings', () => {
      expect(Array.isArray(DATA.volLabels)).toBe(true);
    });

    it('starts with MUTE and ends with MAX', () => {
      expect(DATA.volLabels[0]).toBe('MUTE');
      expect(DATA.volLabels[DATA.volLabels.length - 1]).toBe('MAX');
    });

    it('has 11 entries (MUTE + 9 levels + MAX)', () => {
      expect(DATA.volLabels).toHaveLength(11);
    });
  });

  describe('contrLabels', () => {
    it('exports an array of contrast label strings', () => {
      expect(Array.isArray(DATA.contrLabels)).toBe(true);
    });

    it('starts with MIN and ends with MAX', () => {
      expect(DATA.contrLabels[0]).toBe('MIN');
      expect(DATA.contrLabels[DATA.contrLabels.length - 1]).toBe('MAX');
    });

    it('has 11 entries', () => {
      expect(DATA.contrLabels).toHaveLength(11);
    });
  });

  describe('routeNames', () => {
    it('exports an array of route name strings', () => {
      expect(Array.isArray(DATA.routeNames)).toBe(true);
      DATA.routeNames.forEach(name => expect(typeof name).toBe('string'));
    });

    it('has 8 routes', () => {
      expect(DATA.routeNames).toHaveLength(8);
    });

    it('contains expected route categories', () => {
      expect(DATA.routeNames).toContain('Forest2');
      expect(DATA.routeNames).toContain('Sea2');
    });
  });
});
