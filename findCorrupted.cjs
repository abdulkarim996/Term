const fs = require('fs');
const path = require('path');
let corruptedFiles = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      if (content.includes('\uFFFD') || content.includes('???')) {
        corruptedFiles.push(p);
      }
    }
  });
}
walk('src');
console.log('Corrupted files:', corruptedFiles);
