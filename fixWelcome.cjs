const fs = require('fs');
let lines = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<h2 className="text-lg font-bold ai-gradient-text mb-1">')) {
    lines[i] = '              <h2 className="text-lg font-bold ai-gradient-text mb-1">مرحباً!</h2>';
  } else if (lines[i].includes('<p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">')) {
    lines[i] = '              <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">أنا هنا لمساعدتك. أستطيع قراءة <span className="text-accent-green font-medium">مهامك</span>، و<span className="text-accent-yellow font-medium">أحداثك</span>، و<span className="text-accent-blue font-medium">ملفاتك</span>.</p>';
  }
}

fs.writeFileSync('src/components/ai/AIScreen.tsx', lines.join('\n'));
