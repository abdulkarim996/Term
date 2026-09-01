const fs = require('fs');
let code = fs.readFileSync('src/components/more/ManageSubjectsModal.tsx', 'utf8');

// The corrupted delete block
const badBlock = \      const subject = subjects.find(s => s.id === id);
      if (subject && subject.qStashIds) {
        for (const qid of subject.qStashIds) {
          await cancelNotification(qid, true);
        }
      }
      
      const subject = subjects.find(s => s.id === id);
      if (subject && subject.qStashIds) {
        for (const qid of subject.qStashIds) {
          await cancelNotification(qid, true);
        }
      }
      await cloudDeleteSubject(String(id))\;

const goodBlock = \      const subToDelete = subjects.find(s => s.id === id);
      if (subToDelete && subToDelete.qStashIds) {
        for (const qid of subToDelete.qStashIds) {
          await cancelNotification(qid, true);
        }
      }
      await cloudDeleteSubject(String(id))\;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('src/components/more/ManageSubjectsModal.tsx', code);
