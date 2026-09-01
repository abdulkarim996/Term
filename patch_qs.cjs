const fs = require('fs');
let code = fs.readFileSync('src/lib/qStashScheduler.ts', 'utf8');
code = code.replace(/return \\\\ \\\\ \* \* \\\\;/, 'return \${utcMinute}  * * \;');
fs.writeFileSync('src/lib/qStashScheduler.ts', code);
