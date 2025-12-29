// Simple Node smoke-runner for the app. Adjust paths as needed.
const path = require('path');
const STORAGE = require('./storage_stub');

// Minimal g and Bangle stubs for draw-side effects
global.g = {
  clear: ()=>console.log('[g] clear'),
  setColor: function(){ return { fillRect: (x1,y1,x2,y2)=>console.log('[g] fillRect',x1,y1,x2,y2) }; },
  setFont: (f,s)=>({ centerString:(txt,x,y)=>console.log('[g] centerString',txt,x,y), drawString:(txt,x,y)=>console.log('[g] drawString',txt,x,y) }),
  drawImage: (img,x,y,opts)=>console.log('[g] drawImage',img && img.length, x,y,opts),
  flip: ()=>console.log('[g] flip')
};

global.BTN1 = 'BTN1';
global.setWatch = (cb,btn,opts)=>{ console.log('[setWatch] registered', btn, opts); };
global.Bangle = {
  on: (ev,cb)=>console.log('[Bangle] on',ev),
  isLCDOn: ()=>true,
  setLCDPower: (p)=>console.log('[Bangle] setLCDPower',p),
  buzz: (t,v)=>console.log('[Bangle] buzz',t,v),
};

global.require = (name)=>{
  // Map requires for local app files in ../app
  const map = {
    'Storage': path.join(__dirname,'storage_stub.js'),
  };
  if(map[name]) return require(map[name]);
  // else require from the real app folder
  return require(path.join(__dirname,'..','app', name));
};

// Run the app
try{
  console.log('Starting smoke-run...');
  const app = require(path.join(__dirname,'..','app','bangle_pokewalker.app.js'));
  console.log('App required successfully');
}catch(e){
  console.error('Run error', e);
}

// Note: This runner is intentionally small; extend it to dispatch input events and
// exercise specific flows (Bangle.on callbacks, step events, etc.).
