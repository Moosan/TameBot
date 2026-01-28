import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

/** スラッシュコマンドの型定義 */
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/** リアクション集計結果 */
export interface AggregateResult {
  countA: number;
  countB: number;
  countC: number;
  staff: number;
  guest: number;
  instance: number;
}
