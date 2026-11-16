// Vercel Serverless Function: /api/room  — ห้องออนไลน์แบบ polling เก็บข้อมูลใน Upstash Redis
// ต้องเชื่อม Upstash Redis กับโปรเจกต์ (Vercel > Storage > Upstash Redis) ระบบจะเพิ่ม env ให้เอง
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };

async function cmd(c) {
  const r = await fetch(URL_, { method: 'POST', headers: H, body: JSON.stringify(c) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function pipe(cs) {
  const r = await fetch(URL_ + '/pipeline', { method: 'POST', headers: H, body: JSON.stringify(cs) });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error((j && j.error) || 'redis');
  return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: true, redis: !!(URL_ && TOKEN) }); // เปิด /api/room ในเบราว์เซอร์เพื่อเช็ก
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'ยังไม่ได้เชื่อม Upstash Redis กับโปรเจกต์ (Vercel > Storage)' });
  if (req.method !== 'POST') return res.status(405).json({});
  const b = req.body || {};
  const room = String(b.room || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  const peer = String(b.peer || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  if (!room || !peer) return res.status(400).json({ error: 'bad request' });
  const kM = 'scam:' + room + ':m', kP = 'scam:' + room + ':p', kS = 'scam:' + room + ':s';
  const now = Date.now();
  try {
    if (b.op === 'emit') {
            const topic = String(b.topic || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 16);
      const raw = JSON.stringify(b.data === undefined ? null : b.data);
      if (!topic || raw.length > 6000) return res.status(400).json({ error: 'bad message' });
      const id = await cmd(['INCR', kS]);
      await pipe([
        ['RPUSH', kM, JSON.stringify({ id, peer, topic, data: b.data === undefined ? null : b.data })],
        ['LTRIM', kM, '-60', '-1'], ['EXPIRE', kM, '7200'], ['EXPIRE', kS, '7200'],
      ]);
      return res.status(200).json({ id });
    }
    if (b.op === 'leave') { await cmd(['HDEL', kP, peer]); return res.status(200).json({}); }
    if (b.op === 'poll') {
      const cs = [];
      if (b.presence !== undefined && b.presence !== null) {
        cs.push(['HSET', kP, peer, JSON.stringify({ p: b.presence, t: now })]);
        if (b.first) cs.push(['EXPIRE', kP, '7200']);
      }
      cs.push(['HGETALL', kP], ['LRANGE', kM, '-60', '-1']);
      const out = await pipe(cs);
      const all = out[out.length - 2] || [], list = out[out.length - 1] || [];
      const peers = [];
      for (let i = 0; i + 1 < all.length; i += 2) {
        try { const v = JSON.parse(all[i + 1]); if (now - v.t < 9000) peers.push({ peer: all[i], presence: v.p }); } catch (e) {}
      }
      const msgs = list.map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      const seq = msgs.reduce((a, m) => Math.max(a, m.id), 0);
      const since = +b.since;
      return res.status(200).json({ peers, seq, msgs: since >= 0 ? msgs.filter(m => m.id > since) : [] });
    }
    return res.status(400).json({ error: 'bad op' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 160) });
  }
};
