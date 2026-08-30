const fs = require('fs');
const path = require('path');
const dirs = fs.readdirSync('C:/Users/kroba/.gemini/antigravity/brain');
for (const d of dirs) {
  const p = path.join('C:/Users/kroba/.gemini/antigravity/brain', d, '.system_generated/logs/transcript_full.jsonl');
  if (fs.existsSync(p)) {
    console.log('Checking', p);
    const content = fs.readFileSync(p, 'utf8');
    if (content.includes('HomeScreen.tsx')) {
      console.log('Found HomeScreen.tsx in', d);
    }
  }
}
