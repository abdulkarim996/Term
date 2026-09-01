require('ts-node').register();
try {
  const handler = require('./api/tasks/schedule.ts').default;
  console.log('Successfully imported handler');
} catch (e) {
  console.error('Import failed:', e);
}
