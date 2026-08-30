const fs = require('fs');
const steps = JSON.parse(fs.readFileSync('all_homescreen_steps.json', 'utf8'));
for (const step of steps) {
  if (step.step_index === 55) {
    fs.writeFileSync('clean_step_55.json', JSON.stringify(step, null, 2));
    console.log('Saved clean_step_55.json');
  }
}
