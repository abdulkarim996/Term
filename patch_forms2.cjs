const fs = require('fs');

let addSub = fs.readFileSync('src/components/tasks/AddSubjectModal.tsx', 'utf8');
addSub = addSub.replace(/className="space-y-4.*?"/g, 'className="space-y-4"');
fs.writeFileSync('src/components/tasks/AddSubjectModal.tsx', addSub);

let mngSub = fs.readFileSync('src/components/more/ManageSubjectsModal.tsx', 'utf8');
mngSub = mngSub.replace(/className="space-y-4.*?"/g, 'className="space-y-4"');
fs.writeFileSync('src/components/more/ManageSubjectsModal.tsx', mngSub);

