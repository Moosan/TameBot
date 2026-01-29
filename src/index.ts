import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
} from 'discord.js';
import { config } from './config';
import { pingCommand } from './commands/ping';
import { Scheduler } from './scheduler/scheduler';
import { registerReactionAggregate } from './features/reaction-aggregate';
import type { Command } from './types';
import { logger } from './utils';

// スプシ連携時のみ GuildMembers（特権Intent）を使用
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
];
if (config.spreadsheetApiUrl) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

// コマンドのコレクション
const commands = new Collection<string, Command>();
commands.set(pingCommand.data.name, pingCommand);

// リアクション集計（トリガー絵文字で A/B/C 集計→同一チャンネルに結果投稿）
registerReactionAggregate(client);

// Bot起動時の処理
client.once('clientReady', async () => {
  logger.info(`✅ ${client.user?.tag} としてログインしました！`);
  if (config.spreadsheetApiUrl) {
    logger.info('📋 スプシ連携有効（Server Members Intent が Developer Portal で有効である必要があります）');
  }

  // スラッシュコマンドの登録
  const rest = new REST().setToken(config.discordToken);

  try {
    logger.info('スラッシュコマンドを登録中...');

    // コマンド一覧を自動生成
    const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());

    await rest.put(Routes.applicationCommands(config.clientId), { body: commandData });

    logger.info('✅ スラッシュコマンドの登録が完了しました！');
  } catch (error) {
    logger.error('❌ スラッシュコマンドの登録中にエラーが発生しました:', error);
  }

  // スケジューラーの初期化（将来的な拡張用）
  const scheduler = new Scheduler(client);
  scheduler.initialize();
});

// インタラクション（スラッシュコマンド）の処理
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`コマンド ${interaction.commandName} が見つかりません。`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`コマンド実行中にエラーが発生しました:`, error);
    const errorMessage = 'コマンドの実行中にエラーが発生しました。';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// エラーハンドリング
client.on('error', (error) => {
  logger.error('Discord Bot エラー:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('未処理のPromise拒否:', error);
});

// グレースフルシャットダウン（SIGTERM / SIGINT）
let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`🛑 ${signal} を受信しました。シャットダウン中...`);
  client.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Botのログイン
client.login(config.discordToken);
