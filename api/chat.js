// Vercel Serverless Function: /api/chat  (OpenRouter -> deepseek/deepseek-v4-flash)
// ตั้ง Environment Variable ใน Vercel:  OPENROUTER_API_KEY = key จาก openrouter.ai  (ห้ามใส่ key ในโค้ด)
// ทดสอบความเร็ว: เปิด  https://เว็บคุณ/api/chat?ping=1  ในเบราว์เซอร์
async function ask(prompt, maxTokens) {
  const t0 = Date.now();
  let r = await fetch(process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  let j = await r.json().catch(() => ({}));
  if (r.status === 400) { // พารามิเตอร์เสริมอาจโดนปฏิเสธ ลองใหม่แบบเรียบที่สุด
    const r2 = await fetch(process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY) },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'deepseek/deepseek-v4-flash', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    });
    j = await r2.json().catch(() => ({}));
    r = r2;
  }
  const m = j.choices && j.choices[0] && j.choices[0].message;
  return { ok: r.ok, status: r.status, j, text: (m && m.content) || '', ms: Date.now() - t0 };
}
const why = a => !process.env.OPENROUTER_API_KEY && !process.env.DEEPSEEK_API_KEY
  ? 'ยังไม่ได้ตั้ง OPENROUTER_API_KEY ใน Vercel (ตั้งแล้วต้อง Redeploy)'
  : (a.j.error && (a.j.error.message || JSON.stringify(a.j.error))) || ('upstream ' + a.status);

module.exports = async (req, res) => {
