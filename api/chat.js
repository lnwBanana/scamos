// Vercel Serverless Function: /api/chat  (OpenRouter -> deepseek/deepseek-v4-flash)
// ตั้ง Environment Variable ใน Vercel:  OPENROUTER_API_KEY = key จาก openrouter.ai  (ห้ามใส่ key ในโค้ด)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({});
  try {
    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== 'string' || !prompt || prompt.length > 60000) return res.status(400).json({});
    const r = await fetch(process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY),
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'deepseek/deepseek-v4-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500,
        reasoning: { enabled: false }, // ปิดโหมดคิดยาว ให้ตอบเร็ว (ถ้าโมเดลไม่รองรับจะถูกข้าม)
      }),
    });
    const j = await r.json();
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    if (!r.ok) console.error('upstream', r.status, JSON.stringify(j).slice(0, 300));
    res.status(r.ok ? 200 : 502).json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
};
