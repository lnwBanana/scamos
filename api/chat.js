// Vercel Serverless Function: /api/chat
// ตั้ง Environment Variable ชื่อ DEEPSEEK_API_KEY ใน Vercel (ห้ามใส่ key ในโค้ด)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({});
  try {
    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== 'string' || !prompt || prompt.length > 60000) return res.status(400).json({});
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.DEEPSEEK_API_KEY },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', // เช็กชื่อโมเดลล่าสุดในเอกสาร DeepSeek
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
      }),
    });
    const j = await r.json();
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    res.status(r.ok ? 200 : 502).json({ text });
  } catch (e) {
    res.status(500).json({});
  }
};
