module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  moduleNameMapper: {
    // Map Espruino's built-in "Storage" module to our in-memory test mock
    '^Storage$': '<rootDir>/tests/__mocks__/Storage.js',
    // Map Espruino-style app requires (e.g. require("bpw_state.js")) to actual app files
    '^(bpw_state|bpw_draw|bpw_theme|bpw_data|game|utils|ble_transport)\\.js$': '<rootDir>/app/$1.js',
  },
};
