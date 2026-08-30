const fs = require('fs');
const lines = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8').split('\n');

const out = [];
let inInstruction = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('systemInstruction:')) {
    inInstruction = true;
    out.push('        systemInstruction: `أنت مساعد ذكي للمهام والدراسة. استخدم المعلومات التالية في إجاباتك إن لزم الأمر.');
    out.push('');
    out.push('${context}');
    out.push('');
    out.push('تعليمات:');
    out.push('- كن موجزاً ومباشراً قدر الإمكان ما لم يطلب المستخدم التفاصيل');
    out.push('- لغتك الأساسية هي العربية، لكن أجب بلغة المستخدم إذا استخدم لغة أخرى');
    out.push('- إذا سأل المستخدم عن مهامه أو جدوله، أجب بناءً على المعلومات المقدمة');
    out.push('- لا تذكر أنك "ذكاء اصطناعي". استخدم الـ emoji بحرية.`,');
    continue;
  }
  
  if (inInstruction) {
    if (lines[i].includes('`,')) {
      inInstruction = false;
    }
    continue;
  }
  
  out.push(lines[i]);
}

fs.writeFileSync('src/components/ai/AIScreen.tsx', out.join('\n'));
