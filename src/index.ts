import { Client, GatewayIntentBits, Collection, REST, Routes, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { config } from './config';
import { pingCommand } from './commands/ping';
import { Scheduler } from './scheduler/scheduler';

// コマンドの型定義
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Discord Bot クライアントの作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // スラッシュコマンドとギルド情報に必要
  ],
});

// コマンドのコレクション
const commands = new Collection<string, Command>();
commands.set(pingCommand.data.name, pingCommand);

// Bot起動時の処理
client.once('ready', async () => {
  console.log(`✅ ${client.user?.tag} としてログインしました！`);

  // スラッシュコマンドの登録
  const rest = new REST().setToken(config.discordToken);

  try {
    console.log('スラッシュコマンドを登録中...');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [pingCommand.data.toJSON()] }
    );

    console.log('✅ スラッシュコマンドの登録が完了しました！');
  } catch (error) {
    console.error('❌ スラッシュコマンドの登録中にエラーが発生しました:', error);
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
    console.error(`コマンド ${interaction.commandName} が見つかりません。`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`コマンド実行中にエラーが発生しました:`, error);
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
  console.error('Discord Bot エラー:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('未処理のPromise拒否:', error);
});

// Botのログイン
client.login(config.discordToken);
