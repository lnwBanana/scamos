      Authorization: 'Bearer ' + (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY),
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'deepseek/deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      reasoning: { enabled: false },       // ปิดโหมดคิดยาว (ถ้าโมเดลไม่รองรับจะถูกข้าม)
      provider: { sort: 'throughput' },    // ให้ OpenRouter เลือกเจ้าที่ตอบเร็วสุด
    }),
  });
  const j = await r.json();
  const m = j.choices && j.choices[0] && j.choices[0].message;
  return { ok: r.ok, status: r.status, j, text: (m && m.content) || '', ms: Date.now() - t0 };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET' && req.query && req.query.ping) {
      const a = await ask('ตอบสั้นๆ ว่า OK', 200);
      return res.status(200).json({
        ms: a.ms, status: a.status, text: a.text,
        usage: a.j.usage || null, provider: a.j.provider || null,
        error: a.ok ? undefined : a.j,
      });
    }
    if (req.method !== 'POST') return res.status(405).json({});
    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== 'string' || !prompt || prompt.length > 60000) return res.status(400).json({});
    const a = await ask(prompt, 2000);
    console.log('ai', a.status, a.ms + 'ms', JSON.stringify(a.j.usage || {}), a.j.provider || '');
    if (!a.ok) console.error('upstream', a.status, JSON.stringify(a.j).slice(0, 300));
    res.status(a.ok ? 200 : 502).json({ text: a.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
};
