import type { Message, GuildMember } from 'discord.js';
import { config } from '../config';
import type {
  AggregateResult,
  AttendanceStatus,
  SheetMemberRow,
  SheetRole,
  SpreadsheetPayload,
} from '../types';
import { logger } from '../utils';

const ROLE_ORDER: SheetRole[] = ['イケケモ', 'ケモ案内', 'ケモ裏方'];
const ROLE_IDS: Record<SheetRole, string> = {
  イケケモ: config.roleIkemo,
  ケモ案内: config.roleAnnai,
  ケモ裏方: config.roleUraba,
};

function roleIdsMentionedInMessage(content: string): Set<string> {
  const mentioned = new Set<string>();
  const re = /<@&(\d+)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) mentioned.add(m[1]);
  return mentioned;
}

function assignedRole(member: GuildMember): SheetRole | null {
  for (const r of ROLE_ORDER) {
    const id = ROLE_IDS[r];
    if (!id) continue;
    if (member.roles.cache.has(id)) return r;
  }
  return null;
}

interface MemberRowInternal {
  userId: string;
  name: string;
  role: SheetRole;
  status: AttendanceStatus;
}

/**
 * メッセージでメンションされているロールに属するメンバーを収集。
 * 優先ルール: イケケモ > ケモ案内 > ケモ裏方 で1ロールに割り振る。
 */
async function fetchMembersFromMessage(message: Message): Promise<MemberRowInternal[]> {
  const guild = message.guild;
  if (!guild) return [];

  const mentioned = roleIdsMentionedInMessage(message.content ?? '');
  const ourRoleIds = Object.values(ROLE_IDS).filter(Boolean);
  const relevant = ourRoleIds.filter((id) => mentioned.has(id));
  if (relevant.length === 0) return [];

  try {
    await guild.members.fetch();
  } catch (e) {
    logger.error('ギルドメンバー取得失敗:', e);
    return [];
  }

  const seen = new Set<string>();
  const rows: MemberRowInternal[] = [];

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const role = assignedRole(member);
    if (!role) continue;
    const rid = ROLE_IDS[role];
    if (!relevant.includes(rid)) continue;
    if (seen.has(member.id)) continue;
    seen.add(member.id);

    rows.push({
      userId: member.id,
      name: member.displayName || member.user.username,
      role,
      status: '未入力',
    });
  }

  return rows;
}

/**
 * リアクション情報で出席状況を解決。
 * 欠席 > 出席 > 未入力
 */
function resolveAttendance(
  rows: MemberRowInternal[],
  absentUserIds: Set<string>,
  reactedUserIds: Set<string>,
): void {
  for (const row of rows) {
    if (absentUserIds.has(row.userId)) row.status = '欠席';
    else if (reactedUserIds.has(row.userId)) row.status = '出席';
    else row.status = '未入力';
  }
}

function toSheetRows(rows: MemberRowInternal[]): SheetMemberRow[] {
  return rows.map(({ name, status, role }) => ({ name, status, role }));
}

/**
 * 集計結果とメンバー一覧からスプシ送信用ペイロードを組み立てる。
 */
export function buildSpreadsheetPayload(
  members: SheetMemberRow[],
  aggregate: AggregateResult,
  sheet1Name?: string,
  sheet2Name?: string,
): SpreadsheetPayload {
  return {
    sheet1Name: sheet1Name ?? config.sheet1Name,
    sheet2Name: sheet2Name ?? config.sheet2Name,
    members,
    aggregate: {
      イケケモ: aggregate.countA,
      案内: aggregate.countB,
      サクラ: aggregate.countC,
      スタッフ: aggregate.staff,
      ゲスト: aggregate.guest,
      インスタンス: aggregate.instance,
    },
  };
}

/**
 * App Script Web App に POST する。
 */
export async function sendToSpreadsheet(payload: SpreadsheetPayload): Promise<boolean> {
  const url = config.spreadsheetApiUrl;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error('スプシAPI エラー:', res.status, await res.text());
      return false;
    }
    logger.info('スプシ連携: 送信完了');
    return true;
  } catch (e) {
    logger.error('スプシAPI 送信失敗:', e);
    return false;
  }
}

export interface ReactionUserSets {
  absentUserIds: Set<string>;
  reactedUserIds: Set<string>;
}

/**
 * メッセージ・リアクション情報からメンバー一覧を組み立て、スプシ送信まで実行する。
 * SPREADSHEET_API_URL 未設定時は送信しない。
 */
export async function runSpreadsheetSync(
  message: Message,
  aggregate: AggregateResult,
  reactionUserSets: ReactionUserSets,
): Promise<void> {
  const members = await fetchMembersFromMessage(message);
  resolveAttendance(members, reactionUserSets.absentUserIds, reactionUserSets.reactedUserIds);
  const sheetRows = toSheetRows(members);

  const payload = buildSpreadsheetPayload(sheetRows, aggregate);

  if (config.debugSpreadsheet) {
    logger.info('[DEBUG_SPREADSHEET] ---------- スプシ送信予定データ ----------');
    logger.info('[DEBUG_SPREADSHEET] シート1:', payload.sheet1Name, '| シート2:', payload.sheet2Name);
    logger.info('[DEBUG_SPREADSHEET] メンバー数:', payload.members.length);
    payload.members.forEach((m, i) => {
      logger.info(`[DEBUG_SPREADSHEET]   #${i + 1} ${m.name} | ${m.status} | ${m.role}`);
    });
    logger.info('[DEBUG_SPREADSHEET] 集計:', JSON.stringify(payload.aggregate));
    logger.info('[DEBUG_SPREADSHEET] ----------------------------------------');
  }

  await sendToSpreadsheet(payload);
}
