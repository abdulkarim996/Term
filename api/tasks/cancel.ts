import { Client } from '@upstash/qstash';

const client = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { id, isRecurring } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    if (isRecurring) {
      await client.schedules.delete(id);
    } else {
      await client.messages.delete(id);
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('QStash Delete Error:', e);
    // Ignore 404s (already deleted)
    return res.status(200).json({ success: true, note: 'Error ignored' });
  }
}
