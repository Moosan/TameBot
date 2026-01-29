import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '', // オプション: 特定のサーバーID

  /** 集計トリガー用リアクション（このリアクションが付くと集計実行） */
  reactionTrigger: process.env.REACTION_TRIGGER || '📊',
  /** 集計対象リアクション A,B,C（Unicode絵文字またはカスタム絵文字ID） */
  reactionA: process.env.REACTION_A || '🅰️',
  reactionB: process.env.REACTION_B || '🅱️',
  reactionC: process.env.REACTION_C || '©️',

  /** リアクション集計のデバッグログ（DEBUG_REACTIONS=1 で有効） */
  debugReactions: process.env.DEBUG_REACTIONS === '1',

  /** Discord へメッセージ送信しない（DEBUG_NO_DISCORD_SEND=1 で有効・ログのみ） */
  debugNoDiscordSend: process.env.DEBUG_NO_DISCORD_SEND === '1',

  /** 集計結果の出力先スレッドID（指定しない場合は同じチャンネルに投稿） */
  resultThreadId: process.env.RESULT_THREAD_ID || '',

  /** 欠席専用リアクション（このみのユーザー → 欠席） */
  reactionAbsent: process.env.REACTION_ABSENT || '',

  /** ロールID（イケケモ > ケモ案内 > ケモ裏方 の優先で割り振り） */
  roleIkemo: process.env.ROLE_IKEMO || '',
  roleAnnai: process.env.ROLE_ANNAI || '',
  roleUraba: process.env.ROLE_URABATA || '',

  /** スプシ連携: App Script Web App のURL（未設定ならスプシ送信なし） */
  spreadsheetApiUrl: process.env.SPREADSHEET_API_URL || '',

  /** スプシのシート名（可変） */
  sheet1Name: process.env.SHEET1_NAME || 'シート1',
  sheet2Name: process.env.SHEET2_NAME || 'シート2',

  /** スプシ送信予定データをログ出力（DEBUG_SPREADSHEET=1 で有効） */
  debugSpreadsheet: process.env.DEBUG_SPREADSHEET === '1',
};

// 必須環境変数のチェック
if (!config.discordToken) {
  throw new Error('DISCORD_TOKEN 環境変数が設定されていません。');
}

if (!config.clientId) {
  throw new Error('CLIENT_ID 環境変数が設定されていません。');
}
