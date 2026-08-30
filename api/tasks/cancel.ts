import { Client } from '@upstash/qstash';

const client = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { id, isRecurring } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    if (isRecurring) {
      await client.schedules.delete(id);
    } else {
      await client.messages.delete(id);
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Global Error in cancel.ts:', error);
    return res.status(200).json({ success: true, note: 'Error ignored' });
  }
}