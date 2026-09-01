const fs = require('fs');

function cleanModal(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/max-h-\[75vh\] overflow-y-auto pr-1 pb-4 relative/g, 'pb-2');
  code = code.replace(/max-h-\[75vh\] overflow-y-auto pb-4 relative/g, 'pb-2');
  fs.writeFileSync(file, code);
}

cleanModal('src/components/tasks/AddSubjectModal.tsx');
cleanModal('src/components/more/ManageSubjectsModal.tsx');
