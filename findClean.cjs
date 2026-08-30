const fs = require('fs');
const p = 'C:/Users/kroba/.gemini/antigravity/brain/77ca9ea3-9570-4d11-8ea5-4125bfd0ba74/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(p, 'utf8').split('\n');
let matches = [];
for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    const content = JSON.stringify(obj);
    if (content.includes('HomeScreen.tsx')) {
      matches.push(obj);
    }
  } catch(e) {}
}
fs.writeFileSync('all_homescreen_steps.json', JSON.stringify(matches, null, 2));
console.log('Saved', matches.length, 'steps');
