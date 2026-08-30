const fs = require('fs');
let lines = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('text-[10px] text-text-muted')) {
    lines[i] = '        <span className="text-[10px] text-text-muted">السياق:</span>';
  } else if (lines[i].includes('text-[10px] text-accent-green')) {
    lines[i] = '        <span className="text-[10px] text-accent-green">المهام القادمة</span>';
  } else if (lines[i].includes('text-[10px] text-accent-yellow')) {
    lines[i] = '        <span className="text-[10px] text-accent-yellow">الأحداث والامتحانات</span>';
  } else if (lines[i].includes('text-[10px] text-accent-blue')) {
    lines[i] = '        <span className="text-[10px] text-accent-blue">المحتوى الدراسي</span>';
  } else if (lines[i].includes('placeholder=')) {
    lines[i] = '              placeholder="اسأل مساعد الذكاء الاصطناعي..."';
  } else if (lines[i].includes('Enter ') && lines[i].includes('Shift+Enter')) {
    lines[i] = '          Enter للإرسال أو Shift+Enter لسطر جديد';
  } else if (lines[i].includes('<Calendar size={11} />')) {
    lines[i] = '                <Calendar size={11} /> المهام';
  } else if (lines[i].includes('<CheckSquare size={11} />')) {
    lines[i] = '                <CheckSquare size={11} /> الاختبارات';
  } else if (lines[i].includes('<BookOpen size={11} />')) {
    lines[i] = '                  <BookOpen size={11} /> {driveFilesCount} ملفات';
  }
}

fs.writeFileSync('src/components/ai/AIScreen.tsx', lines.join('\n'));
