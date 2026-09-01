const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Replace corrupted title and body in AddSubjectModal and ManageSubjectsModal
  // Since we don't know the exact corrupted characters easily, we'll use regex.
  code = code.replace(/title:\s*['\"].*?['\"],\s*body:\s*['\"].*?\$\{.*?\}.*?['\"],/g, 
    "title: Buffer.from('2KrYsNmD2YrYsQ==', 'base64').toString('utf8') + ' ??',\n" +
    "                body: Buffer.from('2YXYrdin2LbYsdipIA==', 'base64').toString('utf8') + form.name + Buffer.from('INiz2KrYqNiv2KMg2YLYsdmK2KjYp9mL', 'base64').toString('utf8') + '!',"
  );
  
  // Actually, wait, simpler: I can just use Unicode escapes
  // " –ﬂÌ—" = \u062A\u0630\u0643\u064A\u0631
  code = code.replace(/title:\s*['\"][^'{\]+['\"],\s*body:\s*\[^{\]+\$\{.*?\}[^}\]+\,/g, 
    "title: '\\u062A\\u0630\\u0643\\u064A\\u0631 \\u0628\\u0645\\u062D\\u0627\\u0636\\u0631\\u0629 \\uD83D\\uDD14',\n" +
    "                body: \\\u0645\\u062D\\u0627\\u0636\\u0631\\u0629 \ \\u0633\\u062A\\u0628\\u062F\\u0623 \\u0642\\u0631\\u064A\\u0628\\u0627\\u064B!\,"
  );

  fs.writeFileSync(filePath, code);
}

fixFile('src/components/tasks/AddSubjectModal.tsx');
fixFile('src/components/more/ManageSubjectsModal.tsx');

// For api/cron.ts
let cronCode = fs.readFileSync('api/cron.ts', 'utf8');
cronCode = cronCode.replace(/title:\s*['\"].*?['\"],\s*body:\s*\[^{\]+\$\{.*?\}[^}\]+\/g, 
    "title: '\\u062A\\u0630\\u0643\\u064A\\u0631 \\u0627\\u0644\\u0645\\u0647\\u0627\\u0645 \\uD83D\\uDCC5',\n" +
    "            body: \\\u0644\\u062F\\u064A\\u0643 \\u063A\\u062F\\u0627\\u064B (\) \\u0645\\u0647\\u0627\\u0645 \\u062A\\u0646\\u062A\\u0638\\u0631 \\u0625\\u0646\\u062C\\u0627\\u0632\\u0643! \\u0628\\u0627\\u0644\\u062A\\u0648\\u0641\\u064A\\u0642.\"
);
fs.writeFileSync('api/cron.ts', cronCode);
