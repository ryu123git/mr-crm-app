const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKeySet: !!ANTHROPIC_API_KEY, timestamp: new Date().toISOString() });
});

// ===== まとめて音声入力：仕分けAPI =====
app.post('/api/parse', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'APIキーが設定されていません。' });
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: '音声テキストがありません。' });

  const prompt = `あなたは製薬会社のMR（医薬情報担当者）の活動報告を整理するAIアシスタントです。
以下はMRが面談後に自由に話した音声の文字起こしです。
この内容を分析して、各項目に仕分けしてください。

【音声文字起こし】
${transcript}

以下のJSON形式のみで返答してください（マークダウン・コードブロック不要）。
該当する情報がない項目は空文字列にしてください。
チャンネルは「対面」「オンライン（Web会議）」「電話」「メール」「eディテーリング」のいずれかに当てはめてください。
優先度は「高」「中」「低」のいずれかに当てはめてください。

{
  "hospital": "医療機関名",
  "doctor": "面談医師名（先生をつける）",
  "duration": "面談時間（数字のみ、分単位）",
  "channel": "面談形式",
  "interest": "医師の関心・反応",
  "concern": "医師からの質問・懸念事項",
  "competitor": "競合品の言及",
  "market": "市場・患者情報",
  "nextGoal": "次回訪問の目的",
  "materials": "提供予定の資料・情報",
  "priority": "優先度",
  "good": "うまくいった点",
  "improve": "改善点・次回への気づき",
  "feedback": "本社へのフィードバック・要望",
  "intentScore": "処方意向スコア（1〜5の整数、読み取れない場合は0）",
  "missingFields": ["不足している重要項目のラベル名のリスト"],
  "confirmMessage": "入力内容の確認メッセージ（100字以内、何を記録したかを要約し、不足項目を優しく促す日本語）"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const e = await response.json(); return res.status(response.status).json({ error: e.error?.message || 'APIエラー' }); }
    const data = await response.json();
    const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch(e) { return res.status(500).json({ error: 'AI応答の解析に失敗しました。' }); }
    res.json({ success: true, result: parsed });
  } catch (err) {
    console.error('[Parse Error]', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

// ===== AI採点API =====
app.post('/api/score', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'APIキーが設定されていません。' });
  const { reportData } = req.body;
  if (!reportData) return res.status(400).json({ error: 'レポートデータが不足しています。' });
  const d = reportData;

  const prompt = `あなたは製薬会社のMR（医薬情報担当者）の活動報告を評価する専門AIアナリストです。
以下の活動報告を詳細に分析し、面談品質を多角的に評価してください。

【活動報告】
医療機関：${d.hospital||'未入力'}　面談医師：${d.doctor||'未入力'}
面談形式：${d.channel||'未入力'}　面談時間：${d.duration||'未入力'}分
処方意向スコア（MR評価）：${d.intentScore||'未選択'}/5　前回比：${d.intentCompare||'未選択'}
■医師の関心・反応：${d.interest||'未入力'}
■医師の質問・懸念：${d.concern||'未入力'}
■競合品の言及：${d.competitor||'未入力'}
■市場・患者情報：${d.market||'未入力'}
■本社施策への反応：${d.channelReact||'未入力'}
■次回訪問の目的：${d.nextGoal||'未入力'}
■提供予定資料：${d.materials||'未入力'}
■うまくいった点：${d.good||'未入力'}
■改善点：${d.improve||'未入力'}
■本社フィードバック：${d.feedback||'未入力'}

以下のJSON形式のみで返答してください（マークダウン不要）：
{"totalScore":整数0-100,"rank":"S"|"A"|"B"|"C"|"D","summary":"総合コメント60字以内","axes":[{"label":"医師ニーズ把握力","score":整数0-20,"max":20,"color":"purple"},{"label":"科学的提案の質","score":整数0-20,"max":20,"color":"blue"},{"label":"競合対応力","score":整数0-20,"max":20,"color":"green"},{"label":"次アクション明確度","score":整数0-20,"max":20,"color":"amber"},{"label":"情報収集・報告品質","score":整数0-20,"max":20,"color":"red"}],"positives":["評価点1（20字以内）","評価点2","評価点3"],"positiveDetail":"良かった点の詳細100字以内","advice":"改善アドバイス150字以内","nextActions":"次回推奨アクション150字以内・箇条書き可","signals":["本社シグナル1（20字以内）","シグナル2","シグナル3"],"signalDetail":"マーケティング参考情報100字以内"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const e = await response.json(); return res.status(response.status).json({ error: e.error?.message || 'APIエラー' }); }
    const data = await response.json();
    const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let scored;
    try { scored = JSON.parse(text); } catch(e) { return res.status(500).json({ error: 'AI応答の解析に失敗しました。' }); }
    res.json({ success: true, result: scored });
  } catch (err) {
    console.error('[Score Error]', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.listen(PORT, () => {
  console.log(`MR CRM サーバー起動中 → http://localhost:${PORT}`);
  console.log(`APIキー設定: ${ANTHROPIC_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
});

