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

/** 出席状況 */
export type AttendanceStatus = '出席' | '欠席' | '未入力';

/** ロール種別（シート用） */
export type SheetRole = 'イケケモ' | 'ケモ案内' | 'ケモ裏方';

/** スプシ送信用メンバー1行 */
export interface SheetMemberRow {
  name: string;
  status: AttendanceStatus;
  role: SheetRole;
}

/** スプシ API 送信ペイロード */
export interface SpreadsheetPayload {
  sheet1Name: string;
  sheet2Name: string;
  members: SheetMemberRow[];
  aggregate: {
    イケケモ: number;
    案内: number;
    サクラ: number;
    スタッフ: number;
    ゲスト: number;
    インスタンス: number;
  };
}
