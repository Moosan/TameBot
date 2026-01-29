# TameBot

ミニマルなDiscord Bot。定期実行機能に対応した設計になっています。

## 機能

- **`/ping`** コマンド: Botの応答速度を確認
- **リアクション集計**: トリガー用リアクション（デフォルト 📊）を付けると、同一メッセージの A/B/C リアクションを集計し、同じチャンネルに結果を投稿
  - スタッフ = A+B+C（重複なし・A→B→C の優先）、ゲスト = A×2、インスタンス人数 = スタッフ+ゲスト+1
  - トリガー・A/B/C は環境変数で変更可能（`.env` の `REACTION_*`）
  - メンバーが取れない場合 → [トラブルシューティング](./docs/REACTION_TROUBLESHOOTING.md) を参照
- **スプシ連携**: `SPREADSHEET_API_URL` 設定時、トリガー実行ごとに **4ロール（イケケモ・ケモ案内・ケモ裏方・ケモ情報部）に属するメンバー** の一覧（名前・リアクション・ロール）と集計結果を App Script 経由でスプシに送信。 [appscript/README](./appscript/README.md) 参照。
- **定期実行スケジューラー**: 将来的に毎週特定の曜日・時間にロールメンション付きでメッセージを送る機能を追加可能

## セットアップ

### 0. 必要な環境

このプロジェクトを実行するには、以下の環境が必要です：

- **Node.js** (v18.0.0以上) と **npm**

#### Windowsでのインストール方法

1. [Node.js公式サイト](https://nodejs.org/)にアクセス
2. **LTS版（推奨）**をダウンロード（例: v20.x.x）
3. ダウンロードしたインストーラー（`.msi`ファイル）を実行
4. インストールウィザードに従って進める（デフォルト設定で問題ありません）
5. インストール完了後、**新しいターミナル/コマンドプロンプト**を開く
   - ⚠️ 既に開いているターミナルは閉じて、新しく開き直してください（PATHが更新されないため）

インストール後、以下のコマンドで確認できます：
```bash
node --version
npm --version
```

**注意**: Git Bashを使用している場合、インストール後は新しいGit Bashウィンドウを開くか、PowerShellやコマンドプロンプトを使用してください。

#### macOS/Linuxでのインストール

- **macOS**: Homebrewを使用する場合: `brew install node`
- **Linux**: ディストリビューションのパッケージマネージャーを使用（例: `sudo apt install nodejs npm`）

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックしてアプリケーションを作成
3. 「Bot」タブに移動し、「Add Bot」をクリック
4. 「Token」セクションで「Reset Token」をクリックしてトークンを取得（後で使用します）
5. **「Privileged Gateway Intents」セクション**を確認
   - スプシ連携を使う場合は **Server Members Intent** を有効にする（ロール別メンバー取得に必要）。
   - 使わない場合は `Guilds`・`Guild Messages`・`Guild Message Reactions` のみで可。
6. 「OAuth2」→「URL Generator」に移動
   - Scopes: `bot`, `applications.commands` を選択
   - Bot Permissions: 必要に応じて権限を選択（最低限: 「Send Messages」）
   - 生成されたURLをコピーしてブラウザで開き、Botをサーバーに招待

### 2. ローカル開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して、DISCORD_TOKEN と CLIENT_ID を設定

# 開発モードで起動
npm run dev
```

### 3. ビルド

```bash
npm run build
npm start
```

## デプロイ

デプロイは **Railway** を想定しています。手順は [DEPLOY.md](./DEPLOY.md) を参照してください。

1. [Railway](https://railway.app/) でアカウント作成
2. 「New Project」→「Deploy from GitHub repo」でこのリポジトリを選択
3. 「Variables」で `DISCORD_TOKEN`・`CLIENT_ID`（および任意で `GUILD_ID`）を設定
4. デプロイが自動で開始され、完了後に Discord で `/ping` の動作を確認

## 将来の拡張: 定期メッセージ機能

`src/scheduler/scheduler.ts` に定期実行機能の基盤が用意されています。

### 使用例

```typescript
// src/index.ts の ready イベント内で
const scheduler = new Scheduler(client);

// 毎週月曜日の9時にメッセージを送信
scheduler.scheduleWeeklyMessage(
  '0 9 * * 1',  // Cron式: 毎週月曜日9時
  'チャンネルID',
  'ロールID',   // オプション: null でも可
  'おはようございます！今週もよろしくお願いします！'
);

// 毎日9時にメッセージを送信
scheduler.scheduleDailyMessage(
  '09:00',
  'チャンネルID',
  'ロールID',
  'おはようございます！'
);
```

### Cron式の例

- `0 9 * * 1`: 毎週月曜日9時
- `0 9 * * 5`: 毎週金曜日9時
- `0 12 * * *`: 毎日12時
- `0 0 * * 0`: 毎週日曜日0時（月曜日の始まり）

## 技術スタック

- **TypeScript**: 型安全な開発
- **discord.js**: Discord Bot API
- **node-cron**: 定期実行スケジューラー
- **Docker**: コンテナ化によるデプロイ

## ライセンス

MIT
