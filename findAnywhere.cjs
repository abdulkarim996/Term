const fs = require('fs');
const path = require('path');
const brainDir = 'C:/Users/kroba/.gemini/antigravity/brain';
const convos = fs.readdirSync(brainDir);

const targetFiles = [
  'App.tsx',
  'PinSetup.tsx',
  'AddEventModal.tsx',
  'CalendarScreen.tsx',
  'ManageSubjectsModal.tsx',
  'MoreScreen.tsx',
  'StorageScreen.tsx',
  'FileAnnotator.tsx',
  'FileViewer.tsx',
  'MiniTimer.tsx',
  'WordEditor.tsx',
  'AddSubjectModal.tsx',
  'AddTaskModal.tsx',
  'TasksScreen.tsx',
  'utils.ts'
];

let foundClean = {};

for (const convo of convos) {
  const p = path.join(brainDir, convo, '.system_generated/logs/transcript_full.jsonl');
  if (!fs.existsSync(p)) continue;
  
  const content = fs.readFileSync(p, 'utf8');
  for (const tf of targetFiles) {
    if (content.includes(tf) && !content.includes('\\uFFFD')) {
      // Find the specific line that contains the code
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes(tf) && !line.includes('\\uFFFD')) {
          if (!foundClean[tf]) foundClean[tf] = [];
          foundClean[tf].push({ convo, size: line.length });
        }
      }
    }
  }
}
console.log(foundClean);
