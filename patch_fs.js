const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

code = code.replace(
  /export async function cloudAddSubject\(subject: any\) \{\s*await addDoc\(userCol\(getUid\(\), 'subjects'\), clean\(subject\)\)\s*\}/,
  "export async function cloudAddSubject(subject: any) {\n  const ref = await addDoc(userCol(getUid(), 'subjects'), clean(subject));\n  return ref.id;\n}"
);

fs.writeFileSync('src/lib/firestore.ts', code);
