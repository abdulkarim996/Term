const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');
code = code.replace("function getUid() {", "export function getUid() {");
fs.writeFileSync('src/lib/firestore.ts', code);
