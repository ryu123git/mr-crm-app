# MR活動記録 Webアプリ（AI採点付き）

音声入力 × Anthropic AI による面談品質スコアリング機能付きMR活動記録システムです。

---

## 構成

```
mr-crm-app/
├── server.js        ← Node.js サーバー（APIキーをここで管理）
├── package.json
├── .env.example     ← 環境変数のサンプル
└── public/
    └── index.html   ← フロントエンド（iPad対応）
```

---

## Render へのデプロイ手順（無料・推奨）

### Step 1：GitHubにアップロード

1. [github.com](https://github.com) でアカウント作成（無料）
2. 「New repository」→ リポジトリ名を `mr-crm-app` に設定 → 「Create」
3. このフォルダをアップロード（「uploading an existing file」リンクから）

### Step 2：Renderに登録・接続

1. [render.com](https://render.com) でアカウント作成（無料・GitHubアカウントで登録可）
2. ダッシュボードで「New +」→「Web Service」を選択
3. 「Connect a repository」→ 先ほどの `mr-crm-app` を選択

### Step 3：Renderの設定

以下の通り入力してください：

| 項目 | 値 |
|------|----|
| Name | mr-crm-app（任意） |
| Region | Singapore（日本から最速） |
| Branch | main |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

### Step 4：環境変数（APIキー）を設定

「Environment」タブ → 「Add Environment Variable」：

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxx`（Anthropic Consoleのキー） |

→「Save Changes」→「Deploy」

### Step 5：URLが発行される

デプロイ完了後、以下のような URL が発行されます：

```
https://mr-crm-app-xxxx.onrender.com
```

このURLをiPadのブラウザで開けば、チーム全員が使えます！
ホーム画面に追加（「共有」→「ホーム画面に追加」）でアプリのように使えます。

---

## Anthropic APIキーの取得方法

1. [console.anthropic.com](https://console.anthropic.com) にアクセス
2. 「API Keys」→「Create Key」
3. `sk-ant-...` で始まるキーをコピー
4. Renderの環境変数に貼り付け

---

## 注意事項

- **無料プランの制限**：Renderの無料プランはアクセスがない状態が続くと自動スリープします。初回アクセス時に30〜60秒かかる場合があります。有料プラン（$7/月〜）でスリープなしになります。
- **APIコスト**：Anthropic APIは採点1回あたり約2〜5円程度です（claude-sonnet-4-6使用時）。
- **データの保存**：現在の実装では送信データはコンソールログに出力のみです。本格導入時はデータベース（PostgreSQLなど）への保存を追加してください。

---

## ローカルで試す場合

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
export ANTHROPIC_API_KEY=sk-ant-xxxxxx

# 3. サーバー起動
npm start

# 4. ブラウザで開く
# http://localhost:3000
```

---

## 今後の拡張アイデア

- [ ] データベース連携（活動履歴の蓄積・集計）
- [ ] MRごとのダッシュボード（スコア推移グラフ）
- [ ] 管理者向け一覧画面（チーム全体のKPI可視化）
- [ ] ログイン機能（社員番号・パスワード認証）
- [ ] PDF出力・週次レポート自動生成
