(function(exports){
// BLE transport stub for host <-> watch communication.
// Replace with real implementation later (Bangle BLE, Web Bluetooth, etc.).

let _connected = false;
let _recvCb = function(){};

exports.connect = function(){
  // TODO: implement actual BLE connect logic
  _connected = true;
  console.log("ble_transport: connect() called (stub)");
  return Promise.resolve(true);
};

exports.disconnect = function(){
  _connected = false;
  console.log("ble_transport: disconnect() called (stub)");
};

exports.send = function(data){
  // Data should be small (consider MTU). This stub just logs.
  try { console.log("ble_transport: send:", JSON.stringify(data)); } catch(e) { console.log("ble_transport: send", data); }
};

exports.onReceive = function(cb){
  _recvCb = cb || function(){};
};

exports.isConnected = function(){ return _connected; };

// Helper to simulate incoming data in the stub (DEV only)
exports._simulateIncoming = function(data){
  try{ _recvCb(data); } catch(e){ console.log("ble_transport._simulateIncoming error",e); }
};

})(typeof exports !== 'undefined' ? exports : (this.exports = {}));
