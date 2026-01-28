import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, GuildChannel } from 'discord.js';

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します'),

  async execute(interaction: ChatInputCommandInteraction) {
    // ログ出力: 誰がどこで実行したか
    const user = interaction.user.tag;
    const guildName = interaction.guild?.name || 'DM';
    let channelName = 'Unknown';
    if (interaction.channel) {
      if (interaction.channel instanceof TextChannel) {
        channelName = interaction.channel.name;
      } else if (interaction.channel instanceof GuildChannel) {
        channelName = interaction.channel.name;
      } else {
        channelName = 'DM';
      }
    }
    
    console.log(`📨 /ping コマンドが実行されました - ユーザー: ${user}, サーバー: ${guildName}, チャンネル: ${channelName}`);

    await interaction.reply({
      content: 'Pong! 計測中...',
    });

    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n` +
      `📊 レイテンシ: ${latency}ms\n` +
      `🌐 APIレイテンシ: ${apiLatency}ms`
    );

    // ログ出力: 計測結果
    console.log(`📊 /ping 結果 - レイテンシ: ${latency}ms, APIレイテンシ: ${apiLatency}ms`);
  },
};
