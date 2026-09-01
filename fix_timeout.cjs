const fs = require('fs');
let code = fs.readFileSync('src/lib/qStashScheduler.ts', 'utf8');

if (!code.includes('AbortController')) {
  code = code.replace(
    /const response = await fetch\('\/api\/tasks\/schedule', \{/g,
    \const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch('/api/tasks/schedule', {
      signal: controller.signal,\
  );
  
  code = code.replace(
    /body: JSON\.stringify\(payload\),\n\s*\}\);/g,
    \ody: JSON.stringify(payload),
    });
    clearTimeout(timeoutId);\
  );
  
  fs.writeFileSync('src/lib/qStashScheduler.ts', code);
}
