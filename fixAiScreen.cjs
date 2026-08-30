const fs = require('fs');
let c = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');
c = c.replace(/<span className="text-\[10px\] text-text-muted">.*?<\/span>/, '<span className="text-[10px] text-text-muted">السياق:</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-green">.*?<\/span>/, '<span className="text-[10px] text-accent-green">المهام القادمة</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-yellow">.*?<\/span>/, '<span className="text-[10px] text-accent-yellow">الأحداث والامتحانات</span>');
c = c.replace(/<span className="text-\[10px\] text-accent-blue">.*?<\/span>/, '<span className="text-[10px] text-accent-blue">المحتوى الدراسي</span>');
c = c.replace(/placeholder=".*?"/, 'placeholder="اسأل مساعد الذكاء الاصطناعي..."');
c = c.replace(/Enter .*? Shift\+Enter .*?(?=\s*<\/div>)/, 'Enter للإرسال أو Shift+Enter لسطر جديد');
fs.writeFileSync('src/components/ai/AIScreen.tsx', c);
