module.exports = async (req, res) => {
  try {
    const prompt = req.body && req.body.prompt;
    if (req.method === 'GET') return res.status(200).json({ ok: true, key: !!process.env.OPENROUTER_API_KEY });
        if (typeof prompt !== 'string' || !prompt) return res.status(400).json({ error: 'bad request' });
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'deepseek/deepseek-v4-flash', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 }),
    });
    const raw = await r.text();
    let j = {};
    try { j = JSON.parse(raw); } catch (e) {}
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    if (!r.ok || !text) return res.status(502).json({ text: '', error: (j.error && j.error.message) || raw.slice(0, 150) || 'empty' });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e).slice(0, 150) });
  }
};
