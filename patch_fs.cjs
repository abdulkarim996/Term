const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

if (!code.includes('withTimeout')) {
  code = code.replace(
    /export async function cloudAddSubject/g,
    \const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))]);\n\nexport async function cloudAddSubject\
  );
  
  code = code.replace(
    /await addDoc\(userCol\(getUid\(\), 'subjects'\), clean\(subject\)\)/g,
    'await withTimeout(addDoc(userCol(getUid(), \\'subjects\\'), clean(subject)), 10000)'
  );
  
  code = code.replace(
    /await updateDoc\(userDoc\(getUid\(\), 'subjects', id\), clean\(changes\)\)/g,
    'await withTimeout(updateDoc(userDoc(getUid(), \\'subjects\\', id), clean(changes)), 10000)'
  );

  fs.writeFileSync('src/lib/firestore.ts', code);
}
