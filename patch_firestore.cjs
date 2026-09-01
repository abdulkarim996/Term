const fs = require('fs');

let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

if (!code.includes('withTimeout')) {
  code = code.replace(
    /export async function cloudAddSubject\(subject: any\) \{/g,
    \const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))]);\n\nexport async function cloudAddSubject(subject: any) {\
  );
  
  code = code.replace(
    /await addDoc\(userCol\(getUid\(\), 'subjects'\), clean\(subject\)\)/g,
    'await withTimeout(addDoc(userCol(getUid(), \\'subjects\\'), clean(subject)), 15000)'
  );
  
  code = code.replace(
    /await updateDoc\(userDoc\(getUid\(\), 'subjects', id\), clean\(changes\)\)/g,
    'await withTimeout(updateDoc(userDoc(getUid(), \\'subjects\\', id), clean(changes)), 15000)'
  );

  fs.writeFileSync('src/lib/firestore.ts', code);
}
