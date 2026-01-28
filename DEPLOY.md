# デプロイ手順（Railway）

このBotは **Railway** でデプロイすることを想定しています。

## 前提条件

- GitHubアカウントがあること
- このリポジトリをGitHubにプッシュ済みであること
- Discord Bot Token と Client ID を取得済みであること

## 手順

### 1. Railwayアカウントの作成

1. [Railway](https://railway.app/) にアクセス
2. 「Start a New Project」をクリック
3. GitHubアカウントでログイン

### 2. プロジェクトの作成

1. 「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. このリポジトリを選択

### 3. 環境変数の設定

1. プロジェクトの「Variables」タブを開く
2. 以下の環境変数を追加する：

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DISCORD_TOKEN` | Discord Bot Token | ✅ |
| `CLIENT_ID` | Discord Application Client ID | ✅ |
| `GUILD_ID` | 特定のサーバーID（オプション） | — |
| `REACTION_TRIGGER` | 集計トリガー用リアクション（例: 📊） | — |
| `REACTION_A` | 集計対象 A（例: 🅰️） | — |
| `REACTION_B` | 集計対象 B（例: 🅱️） | — |
| `REACTION_C` | 集計対象 C（例: ©️） | — |
| `DEBUG_REACTIONS` | `1` でリアクション集計の詳細ログ出力（デバッグ用） | — |

### 4. デプロイの確認

- Railwayが自動的にビルド・デプロイを開始します
- 「Deployments」タブでログを確認し、エラーがないことを確認してください

### 5. Botの動作確認

- Discordで `/ping` コマンドが表示されること
- `/ping` を実行して正常に応答することを確認してください

## GitHubへのプッシュ（未済の場合）

リポジトリをまだGitHubにプッシュしていない場合：

```bash
git init
git add .
git commit -m "Initial commit: Discord Bot setup"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/TameBot.git
git push -u origin main
```

## デプロイ後の確認

1. **ログ**
   - Railwayの「Deployments」→ 該当デプロイ → ログを開く
   - 「✅ Bot名 としてログインしました！」が表示されていること

2. **スラッシュコマンド**
   - Discordで `/ping` が候補に出ること
   - 実行してレイテンシ等が返ること

3. **エラー時**
   - ログでエラー内容を確認
   - 環境変数（`DISCORD_TOKEN`・`CLIENT_ID`）が正しいか再確認

## トラブルシューティング

### Botが起動しない

- `DISCORD_TOKEN` と `CLIENT_ID` が正しく設定されているか確認
- ログのエラーメッセージを確認

### スラッシュコマンドが表示されない

- Botがサーバーに招待されているか確認
- 招待URLで `applications.commands` スコープを含めているか確認
- 数分待ってから再試行（反映に時間がかかることがある）

### デプロイが失敗する

- `Dockerfile` や `package.json` の記述を確認
- ログでビルドエラーの詳細を確認

### リアクション集計で「メンバーが取得できない」

- 詳細は [docs/REACTION_TROUBLESHOOTING.md](./docs/REACTION_TROUBLESHOOTING.md) を参照
- **招待時の Bot 権限**で **Read Message History**（メッセージ履歴の閲覧）を付与し、**新しい招待URLで再招待**しているか確認
- `DEBUG_REACTIONS=1` を設定して再デプロイし、ログで絵文字の一致・`fetch` エラーを確認

## 料金

- 無料プラン: 月 $5 分のクレジット（個人利用目安）
- クレジットカード登録なしでも利用可能

## 次のステップ

デプロイできたら、以下を拡張できます：

- 定期メッセージ・リマインド（`src/scheduler/scheduler.ts`）
- リアクション集計・ロール別通知などの新機能
- 新しいスラッシュコマンド（`src/commands/`）
