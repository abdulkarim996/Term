import { auth } from './firebase';

export interface SchedulePayload {
  title: string;
  body: string;
  uid: string;
  isRecurring: boolean;
  notBefore?: number;
  cron?: string;
}

export const scheduleNotification = async (payload: SchedulePayload): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch('/api/tasks/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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
  } catch (error: any) {
    alert('Error scheduling notification: ' + error.message);
    return null;
  }
};

export const cancelNotification = async (id: string, isRecurring: boolean) => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    await fetch('/api/tasks/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id, isRecurring }),
    });
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

export function getUtcCron(localDayOfWeek: number, localTime: string): string {
  if (!localTime) return '';
  const [h, m] = localTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  
  const date = new Date();
  let diff = localDayOfWeek - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(h, m - 10, 0, 0); // 10 minutes before lecture

  const utcMinute = date.getUTCMinutes();
  const utcHour = date.getUTCHours();
  const utcDay = date.getUTCDay();

  return `${utcMinute} ${utcHour} * * ${utcDay}`;
}

export function getUnixTimestampMinusOffset(localDateIso: string, offsetMinutes: number): number {
  if (!localDateIso) return 0;
  const date = new Date(localDateIso);
  date.setMinutes(date.getMinutes() - offsetMinutes);
  return Math.floor(date.getTime() / 1000);
}