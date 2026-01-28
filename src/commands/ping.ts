import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getChannelName, logger } from '../utils';
import type { Command } from '../types';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します'),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.user.tag;
    const guildName = interaction.guild?.name || 'DM';
    const channelName = getChannelName(interaction.channel);

    logger.info(`📨 /ping コマンドが実行されました - ユーザー: ${user}, サーバー: ${guildName}, チャンネル: ${channelName}`);

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

    logger.info(`📊 /ping 結果 - レイテンシ: ${latency}ms, APIレイテンシ: ${apiLatency}ms`);
  },
};
