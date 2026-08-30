const fs = require('fs');
let c = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');
c = c.replace('onClick={() => }', 'onClick={() => alert(\\'الرجاء الانتقال إلى صفحة الإعدادات لإضافة المفتاح\\')}');
fs.writeFileSync('src/components/ai/AIScreen.tsx', c);
