const fs = require('fs');
let c = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');

c = c.replace(/<h2.*?<\/h2>/g, '<h2 className="text-lg font-bold ai-gradient-text mb-1">مرحباً!</h2>');
c = c.replace(/<p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">[\s\S]*?<\/p>/g, '<p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">أنا هنا لمساعدتك. أستطيع قراءة <span className="text-accent-green font-medium">مهامك</span>، و<span className="text-accent-yellow font-medium">أحداثك</span>، و<span className="text-accent-blue font-medium">ملفاتك</span>.</p>');

c = c.replace(/<span className="text-\[10px\] text-text-muted">.*?<\/span>/g, '<span className="text-[10px] text-text-muted">السياق:</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-green">.*?<\/span>/g, '<span className="text-[10px] text-accent-green">المهام القادمة</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-yellow">.*?<\/span>/g, '<span className="text-[10px] text-accent-yellow">الأحداث والامتحانات</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-blue">.*?<\/span>/g, '<span className="text-[10px] text-accent-blue">المحتوى الدراسي</span>');

c = c.replace(/<Calendar size=\{11\} \/>.*?<\/span>/, '<Calendar size={11} /> المهام</span>');
c = c.replace(/<CheckSquare size=\{11\} \/>.*?<\/span>/, '<CheckSquare size={11} /> الاختبارات</span>');
c = c.replace(/<BookOpen size=\{11\} \/> \{driveFilesCount\}.*?<\/span>/, '<BookOpen size={11} /> {driveFilesCount} ملفات</span>');

c = c.replace(/Enter.*?Shift\+Enter.*?<\/div>/, 'Enter للإرسال أو Shift+Enter لسطر جديد</div>');
c = c.replace(/placeholder=".*?"/, 'placeholder="اسأل مساعد الذكاء الاصطناعي..."');

fs.writeFileSync('src/components/ai/AIScreen.tsx', c);
