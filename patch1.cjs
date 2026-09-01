const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/AddSubjectModal.tsx', 'utf8');

const regex = /if\s*\(editSubject\)\s*\{\s*await\s*cloudUpdateSubject\(String\(editSubject\.id\),\s*payload\)\s*\}\s*else\s*\{\s*await\s*cloudAddSubject\(\{\s*\.\.\.payload,\s*createdAt:\s*Date\.now\(\)\s*\}\)\s*\}/;

const replacement = \
        let subjectId = editSubject ? String(editSubject.id) : null;
        
        if (editSubject) {
          await cloudUpdateSubject(subjectId, payload);
          // If editing, cancel old QStash schedules first
          if (editSubject.qStashIds) {
            for (const id of editSubject.qStashIds) {
              await cancelNotification(id, true);
            }
          }
        } else {
          subjectId = await cloudAddSubject({ ...payload, createdAt: Date.now() });
        }

        // Schedule new notifications for each lecture
        const newQStashIds = [];
        if (payload.lectures && payload.lectures.length > 0) {
          for (const lec of payload.lectures) {
            if (lec.startTime) {
              const cron = getUtcCron(lec.dayOfWeek, lec.startTime);
              const qId = await scheduleNotification({
                title: 'ÊÐßíÑ ÈãÍÇÖÑÉ ??',
                body: \\\ãÍÇÖÑÉ \ ÓÊÈÏÃ ÞÑíÈÇð!\\\,
                uid: getUid() || '',
                isRecurring: true,
                cron: cron
              });
              if (qId) newQStashIds.push(qId);
            }
          }
          if (newQStashIds.length > 0) {
            await cloudUpdateSubject(subjectId, { qStashIds: newQStashIds });
          }
        }
\;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/tasks/AddSubjectModal.tsx', code);
