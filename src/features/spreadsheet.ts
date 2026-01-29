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
  if (!guild) {
    if (config.debugSpreadsheet) logger.info('[DEBUG_SPREADSHEET] メンバー取得: ギルドなし（DM等） → 0人');
    return [];
  }

  const mentioned = roleIdsMentionedInMessage(message.content ?? '');
  const ourRoleIds = Object.values(ROLE_IDS).filter(Boolean);
  const relevant = ourRoleIds.filter((id) => mentioned.has(id));

  if (config.debugSpreadsheet) {
    logger.info(
      '[DEBUG_SPREADSHEET] メンバー取得: メッセージ内ロールメンションID =',
      [...mentioned].join(', ') || '(なし)',
    );
    logger.info(
      '[DEBUG_SPREADSHEET] メンバー取得: 設定ロール イケケモ=%s ケモ案内=%s ケモ裏方=%s',
      config.roleIkemo || '(未設定)',
      config.roleAnnai || '(未設定)',
      config.roleUraba || '(未設定)',
    );
    logger.info(
      '[DEBUG_SPREADSHEET] メンバー取得: 一致（対象）= %s',
      relevant.length ? relevant.join(', ') : '(なし)',
    );
  }

  if (relevant.length === 0) {
    if (config.debugSpreadsheet)
      logger.info(
        '[DEBUG_SPREADSHEET] メンバー取得スキップ: 対象ロールがメッセージにメンションされていないか、設定ロールIDと一致しません',
      );
    return [];
  }

  try {
    await guild.members.fetch();
  } catch (e) {
    logger.error('ギルドメンバー取得失敗:', e);
    return [];
  }

  if (config.debugSpreadsheet)
    logger.info('[DEBUG_SPREADSHEET] メンバー取得: ギルドメンバー数 =', guild.members.cache.size);

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

  if (config.debugSpreadsheet && rows.length === 0)
    logger.info(
      '[DEBUG_SPREADSHEET] メンバー取得: 対象ロール所持メンバー0人（ギルド内にイケケモ・ケモ案内・ケモ裏方のいずれも持つメンバーがいないか、いずれもBot）',
    );

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

/** ロール順（イケケモ → ケモ案内 → ケモ裏方）、同ロール内は名前の辞書順 */
const ROLE_SORT_ORDER: Record<SheetRole, number> = {
  イケケモ: 0,
  ケモ案内: 1,
  ケモ裏方: 2,
};

function sortMembersForSpreadsheet(members: SheetMemberRow[]): SheetMemberRow[] {
  return [...members].sort((a, b) => {
    const roleDiff = ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role];
    if (roleDiff !== 0) return roleDiff;
    return (a.name || '').localeCompare(b.name || '', 'ja');
  });
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

/** GAS レスポンス（デバッグ時は logs が入る） */
interface SpreadsheetApiResponse {
  ok?: boolean;
  error?: string | null;
  logs?: string[];
}

/**
 * App Script Web App に POST する。
 * DEBUG_SPREADSHEET=1 のときは payload に debug: true を付け、レスポンスの logs をログ出力する。
 */
export async function sendToSpreadsheet(payload: SpreadsheetPayload): Promise<boolean> {
  const url = config.spreadsheetApiUrl;
  if (!url) return false;

  const body = config.debugSpreadsheet ? { ...payload, debug: true } : payload;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      logger.error('スプシAPI エラー:', res.status, text);
      return false;
    }

    if (config.debugSpreadsheet) {
      try {
        const data: SpreadsheetApiResponse = JSON.parse(text);
        logger.info(
          `[DEBUG_SPREADSHEET] GAS レスポンス: ok=${data.ok}, error=${data.error ?? '(なし)'}`,
        );
        if (data.logs && data.logs.length > 0) {
          logger.info('[DEBUG_SPREADSHEET] ---------- GAS 側ログ ----------');
          data.logs.forEach((line) => logger.info('[DEBUG_SPREADSHEET]', line));
          logger.info('[DEBUG_SPREADSHEET] ------------------------------');
        }
      } catch {
        logger.info('[DEBUG_SPREADSHEET] GAS レスポンス（パースせず）:', text.slice(0, 200));
      }
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
  const sheetRows = sortMembersForSpreadsheet(toSheetRows(members));

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
