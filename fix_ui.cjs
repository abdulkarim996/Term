const fs = require('fs');

function fixModal(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Make the save buttons sticky at the bottom so they never get lost off-screen
  code = code.replace(
    /<div className="flex gap-2 pt-4">/g, 
    '<div className="flex gap-2 pt-4 sticky bottom-0 bg-surface border-t border-surface-border mt-4 pb-2 z-10">'
  );
  
  // For AddSubjectModal specifically, let's also fix the max-h
  code = code.replace(
    /className="space-y-4 max-h-\[70vh\] overflow-y-auto pr-1"/g,
    'className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 pb-4 relative"'
  );
  
  // And for ManageSubjectsModal
  code = code.replace(
    /className="space-y-4 pt-4"/g,
    'className="space-y-4 pt-4 max-h-[75vh] overflow-y-auto pb-4 relative"'
  );

  fs.writeFileSync(file, code);
}

fixModal('src/components/tasks/AddSubjectModal.tsx');
fixModal('src/components/more/ManageSubjectsModal.tsx');
