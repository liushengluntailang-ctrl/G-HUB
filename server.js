const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN || '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';

// 1. Supabaseプロキシ
app.use('/supabase', createProxyMiddleware({
  target: 'https://ddcnoghsiuxfhnwmtpyn.supabase.co',
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// 2. JSONパーサー
app.use(express.json({ limit: '10mb' }));

// 3. G-AI (Qwen 2.5 Coder 1.5B) 正式エンドポイント
app.post('/ai', async (req, res) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 1500 } = req.body;

    // ★ Hugging Face 公式のOpenAI互換エンドポイント ★
    const response = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true' // モデルが起動中なら待機する超重要フラグ
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-Coder-1.5B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt || 'You are an expert game developer and assistant on G-HUB.' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || data.error || 'AIレスポンスエラー';
      console.error('HF Error:', errMsg);
      return res.status(500).json({ error: errMsg });
    }

    const reply = data.choices?.[0]?.message?.content || '返答を生成できませんでした。';
    res.json({ reply });
  } catch (err) {
    console.error('Server AI Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. 静的ファイル配信
app.use(express.static(path.join(__dirname, '.')));

app.listen(PORT, () => {
  console.log(`G-HUB server running on port ${PORT}`);
});
