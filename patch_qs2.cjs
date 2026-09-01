const fs = require('fs');
let code = fs.readFileSync('src/lib/qStashScheduler.ts', 'utf8');

const newScheduler = \export const scheduleNotification = async (payload: SchedulePayload): Promise<string | null> => {
  try {
    const response = await fetch('/api/tasks/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      alert('QStash Error (Not JSON): ' + text.substring(0, 100));
      return null;
    }
    if (!response.ok || data.error) {
      alert('QStash API Error: ' + (data.error || 'Unknown API Error'));
      return null;
    }
    return data.id || null;
  } catch (error) {
    alert('Error scheduling notification: ' + error.message);
    return null;
  }
};\;

code = code.replace(/export const scheduleNotification = async \(payload: SchedulePayload\): Promise<string \| null> => \{[\s\S]*?\n\};\n/, newScheduler + '\n');
fs.writeFileSync('src/lib/qStashScheduler.ts', code);
