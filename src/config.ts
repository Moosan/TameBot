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
};

// 必須環境変数のチェック
if (!config.discordToken) {
  throw new Error('DISCORD_TOKEN 環境変数が設定されていません。');
}

if (!config.clientId) {
  throw new Error('CLIENT_ID 環境変数が設定されていません。');
}
