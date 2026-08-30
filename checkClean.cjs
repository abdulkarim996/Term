const fs = require('fs');
const steps = JSON.parse(fs.readFileSync('all_homescreen_steps.json', 'utf8'));
let found = false;
for (const step of steps) {
  let text = JSON.stringify(step);
  if (text.includes('export default function HomeScreen') && !text.includes('\\uFFFD')) {
    console.log('Found clean HomeScreen code in step index', step.step_index);
    found = true;
  }
}
if (!found) console.log('None found');
