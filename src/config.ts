import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '', // オプション: 特定のサーバーID
};

// 必須環境変数のチェック
if (!config.discordToken) {
  throw new Error('DISCORD_TOKEN 環境変数が設定されていません。');
}

if (!config.clientId) {
  throw new Error('CLIENT_ID 環境変数が設定されていません。');
}
