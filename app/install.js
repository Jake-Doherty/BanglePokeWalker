(function(exports){
// Simple install helper scaffold.
// Usage (Web IDE REPL):
// 1) Open this file in the editor, paste your source files into the FILES object below.
// 2) Save and in the REPL run: require('install.js').install();
// This will write the files into device Storage so require() works on boot.

const S = require('Storage');

// Paste your files here as: "filename.js": "...file contents..."
// Example: FILES['bangle_pokewalker.app.js'] = "(function(exports){...})(exports);";
const FILES = {
  // "bangle_pokewalker.app.js": "...",
  // "bpw_state.js": "...",
  // "bpw_draw.js": "...",
  // "bpw_data.js": "...",
  // "bpw_theme.js": "...",
  // "utils.js": "...",
  // "game.js": "...",
  // "pokewalker.json": "...",
};

exports.install = function(){
  const names = Object.keys(FILES);
  if(names.length===0){
    console.log('install.js: FILES is empty. Edit install.js and paste file contents into the FILES object then run install().');
    return;
  }
  names.forEach(f => {
    try{
      S.write(f, FILES[f]);
      console.log('Wrote', f);
    }catch(e){
      console.log('Error writing', f, e);
    }
  });
  console.log('install.js: installation complete.');
};

})(typeof exports !== 'undefined' ? exports : (this.exports = {}));
