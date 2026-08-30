const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/kroba/.gemini/antigravity/brain';
const convos = fs.readdirSync(brainDir);
const targetFiles = [
  'src/App.tsx',
  'src/components/auth/PinSetup.tsx',
  'src/components/calendar/AddEventModal.tsx',
  'src/components/calendar/CalendarScreen.tsx',
  'src/components/more/ManageSubjectsModal.tsx',
  'src/components/more/MoreScreen.tsx',
  'src/components/storage/StorageScreen.tsx',
  'src/components/study/FileAnnotator.tsx',
  'src/components/study/FileViewer.tsx',
  'src/components/study/MiniTimer.tsx',
  'src/components/study/WordEditor.tsx',
  'src/components/tasks/AddSubjectModal.tsx',
  'src/components/tasks/AddTaskModal.tsx',
  'src/components/tasks/TasksScreen.tsx',
  'src/lib/utils.ts'
];
const latestCleanContents = {};

for (const convo of convos) {
  const p = path.join(brainDir, convo, '.system_generated/logs/transcript_full.jsonl');
  if (!fs.existsSync(p)) continue;
  
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.function?.name?.includes('write_to_file')) {
            try {
              const args = JSON.parse(tc.function.arguments);
              const targetFile = (args.TargetFile || args.targetFile || args.filePath || args.path || '').replace(/\\/g, '/');
              
              for (const tf of targetFiles) {
                if (targetFile.endsWith(tf)) {
                  const content = JSON.stringify(args);
                  if (!content.includes('\\uFFFD') && !content.includes('???')) {
                    latestCleanContents[tf] = args.CodeContent || args.content || args.fileContent || args.Code;
                  }
                }
              }
            } catch(e) {}
          }
        }
      }
    } catch(e) {}
  }
}
let restoredCount = 0;
for (const tf in latestCleanContents) {
  const p = path.join('C:/Users/kroba/Desktop/Antigravity/StudentDashBoard', tf);
  if (latestCleanContents[tf]) {
    fs.writeFileSync(p, latestCleanContents[tf]);
    restoredCount++;
    console.log('Restored', tf);
  }
}
console.log('Total restored:', restoredCount);
