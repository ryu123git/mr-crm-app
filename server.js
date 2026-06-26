const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeySet: !!ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// AI採点APIエンドポイント（Anthropic APIへのプロキシ）
app.post('/api/score', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'サーバーにAPIキーが設定されていません。管理者にお問い合わせください。' });
  }

  const { reportData } = req.body;
  if (!reportData) {
    return res.status(400).json({ error: 'レポートデータが不足しています。' });
  }

  const d = reportData;

  const prompt = `あなたは製薬会社のMR（医薬情報担当者）の活動報告を評価する専門AIアナリストです。
以下の活動報告を詳細に分析し、面談品質を多角的に評価してください。

【活動報告】
医療機関：${d.hospital || '未入力'}　面談医師：${d.doctor || '未入力'}
面談形式：${d.channel || '未入力'}　面談時間：${d.duration || '未入力'}分
処方意向スコア（MR評価）：${d.intentScore || '未選択'}/5　前回比：${d.intentCompare || '未選択'}

■医師の関心・反応：${d.interest || '未入力'}
■医師の質問・懸念：${d.concern || '未入力'}
■競合品の言及：${d.competitor || '未入力'}
■市場・患者情報：${d.market || '未入力'}
■本社施策への反応：${d.channelReact || '未入力'}
■次回訪問の目的：${d.nextGoal || '未入力'}
■提供予定資料：${d.materials || '未入力'}
■うまくいった点：${d.good || '未入力'}
■改善点：${d.improve || '未入力'}
■本社フィードバック：${d.feedback || '未入力'}

以下のJSON形式のみで返答してください（マークダウン不要）：
{"totalScore":整数0-100,"rank":"S"|"A"|"B"|"C"|"D","summary":"総合コメント60字以内","axes":[{"label":"医師ニーズ把握力","score":整数0-20,"max":20,"color":"purple"},{"label":"科学的提案の質","score":整数0-20,"max":20,"color":"blue"},{"label":"競合対応力","score":整数0-20,"max":20,"color":"green"},{"label":"次アクション明確度","score":整数0-20,"max":20,"color":"amber"},{"label":"情報収集・報告品質","score":整数0-20,"max":20,"color":"red"}],"positives":["評価点1（20字以内）","評価点2","評価点3"],"positiveDetail":"良かった点の詳細100字以内","advice":"改善アドバイス150字以内","nextActions":"次回推奨アクション150字以内・箇条書き可","signals":["本社シグナル1（20字以内）","シグナル2","シグナル3"],"signalDetail":"マーケティング参考情報100字以内"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('[API Error]', errData);
      return res.status(response.status).json({
        error: errData.error?.message || 'Anthropic APIエラーが発生しました。'
      });
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();

    let scored;
    try {
      scored = JSON.parse(text);
    } catch (e) {
      console.error('[Parse Error] AI response:', text);
      return res.status(500).json({ error: 'AI応答の解析に失敗しました。もう一度お試しください。' });
    }

    res.json({ success: true, result: scored });

  } catch (err) {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

// すべてのルートをindex.htmlへ（SPA対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MR CRM サーバー起動中 → http://localhost:${PORT}`);
  console.log(`APIキー設定: ${ANTHROPIC_API_KEY ? '✅ 設定済み' : '❌ 未設定（ANTHROPIC_API_KEY環境変数を設定してください）'}`);
});
