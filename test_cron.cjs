function getUtcCron(localDayOfWeek, localTime) {
  const [h, m] = localTime.split(':').map(Number);
  
  const date = new Date();
  let diff = localDayOfWeek - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(h, m - 10, 0, 0); 

  const utcMinute = date.getUTCMinutes();
  const utcHour = date.getUTCHours();
  const utcDay = date.getUTCDay();

  return \\ \ * * \\;
}

console.log('Monday 01:15 ->', getUtcCron(1, '01:15'));
console.log('Monday 01:50 ->', getUtcCron(1, '01:50'));
