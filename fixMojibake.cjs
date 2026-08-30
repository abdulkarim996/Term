const fs = require('fs');
const iconv = require('iconv-lite');
const path = require('path');

function fixMojibake(text) {
  const buffer = iconv.encode(text, 'windows-1256');
  return iconv.decode(buffer, 'utf8');
}

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const original = fs.readFileSync(p, 'utf8');
      if (original.includes('ط') || original.includes('ظ')) {
        console.log('Fixing:', p);
        const fixed = fixMojibake(original);
        fs.writeFileSync(p, fixed);
      }
    }
  });
}

walk('src');
console.log('Done!');
