const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HF_TOKEN = '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';

// 1. Supabaseプロキシ (body-parserより前に置く)
app.use('/supabase', createProxyMiddleware({
  target: 'https://ddcnoghsiuxfhnwmtpyn.supabase.co',
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// 2. JSONパーサー
app.use(express.json({ limit: '10mb' }));

// 3. G-AI (Qwen 2.5 Coder 1.5B) エンドポイント
app.post('/ai', async (req, res) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 1500 } = req.body;

    const response = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-1.5B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-Coder-1.5B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt || 'You are G-AI, a super helpful gaming assistant.' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error) });
    }

    const reply = data.choices?.[0]?.message?.content || '返答を生成できませんでした。';
    res.json({ reply });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. 静的ファイル配信
app.use(express.static(path.join(__dirname, '.')));

app.listen(PORT, () => {
  console.log(`G-HUB server running on port ${PORT}`);
});
