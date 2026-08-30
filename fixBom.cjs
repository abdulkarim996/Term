const fs = require('fs');
const path = require('path');
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let original = fs.readFileSync(p, 'utf8');
      if (original.startsWith('?')) {
        console.log('Fixing BOM artifact in:', p);
        fs.writeFileSync(p, original.substring(1));
      }
    }
  });
}
walk('src');
