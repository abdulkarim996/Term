const fs = require('fs');
let code = fs.readFileSync('src/lib/qStashScheduler.ts', 'utf8');

code = code.replace(
  "date.setHours(h, m, 0, 0);",
  "date.setHours(h, m - 10, 0, 0); // 10 minutes before lecture"
);

fs.writeFileSync('src/lib/qStashScheduler.ts', code);
