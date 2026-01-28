import type { Client, MessageReaction, Message } from 'discord.js';
import { config } from '../config';
import type { AggregateResult } from '../types';
import { isSendableChannel, logger } from '../utils';

const TRIGGER = config.reactionTrigger;

/** 絵文字が設定値と一致するか（Unicode は name、カスタムは id で比較） */
function emojiMatches(
  reaction: { emoji: { id: string | null; name: string | null } },
  value: string,
): boolean {
  const emoji = reaction.emoji;
  if (emoji.id && value === emoji.id) return true;
  if (emoji.name && value === emoji.name) return true;
  return false;
}

/** リアクションからユーザーID集合を取得（Bot除外） */
async function fetchUserIds(reaction: MessageReaction): Promise<Set<string>> {
  try {
    await reaction.users.fetch();
  } catch (e) {
    if (config.debugReactions) logger.error('reaction.users.fetch() 失敗:', e);
    return new Set();
  }
  const ids = new Set<string>();
  for (const [, u] of reaction.users.cache) {
    if (!u.bot) ids.add(u.id);
  }
  return ids;
}

/** デバッグログ: メッセージ上のリアクション一覧を出力 */
function logReactionDetails(reactions: Map<string, MessageReaction>): void {
  if (!config.debugReactions) return;

  type R = { emoji: { id: string | null; name: string | null } };
  const envVal = (r: R) => (r.emoji.id ?? r.emoji.name ?? '') as string;
  const isTrigger = (r: R) => emojiMatches(r, TRIGGER);
  const list = [...reactions.values()];

  logger.debug('---------- リアクション詳細ログ ----------');
  logger.debug(`メッセージ上のリアクション数: ${list.length}`);

  const labels = ['REACTION_A', 'REACTION_B', 'REACTION_C'] as const;
  let labelIdx = 0;

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const v = envVal(r);
    const triggerNote = isTrigger(r) ? ' [トリガー]' : '';
    logger.debug(`  #${i + 1} id=${r.emoji.id ?? 'null'} name=${JSON.stringify(r.emoji.name)}${triggerNote}`);

    if (!isTrigger(r) && v) {
      if (labelIdx < 3) {
        logger.debug(`      → .envにコピー可: ${labels[labelIdx]}=${v}`);
        labelIdx++;
      } else {
        logger.debug(`      → .envにコピー可: REACTION_?=${v}`);
      }
    }
  }

  logger.debug(
    '現在の設定:',
    `REACTION_A=${JSON.stringify(config.reactionA)}`,
    `REACTION_B=${JSON.stringify(config.reactionB)}`,
    `REACTION_C=${JSON.stringify(config.reactionC)}`,
  );
  logger.debug('----------------------------------------');
}

/**
 * メッセージの A/B/C リアクションを集計する。
 * 優先ルール: A > B > C（同一ユーザーは重複せず、優先度の高いものに1回だけカウント）
 */
export async function aggregateFromMessage(message: Message): Promise<AggregateResult | null> {
  await message.fetch();
  const channel = message.channel;
  if (!channel.isTextBased()) return null;

  const reactions = message.reactions.cache;
  let usersA = new Set<string>();
  let usersB = new Set<string>();
  let usersC = new Set<string>();

  logReactionDetails(reactions);

  for (const r of reactions.values()) {
    if (emojiMatches(r, config.reactionA)) usersA = await fetchUserIds(r);
    else if (emojiMatches(r, config.reactionB)) usersB = await fetchUserIds(r);
    else if (emojiMatches(r, config.reactionC)) usersC = await fetchUserIds(r);
  }

  if (config.debugReactions) {
    logger.debug(`集計対象 マッチ状況 A=${usersA.size} B=${usersB.size} C=${usersC.size}`);
  }

  // 優先ルール: A > B > C。B から A にいる人、C から A or B にいる人を除く
  const onlyB = new Set(usersB);
  const onlyC = new Set(usersC);
  for (const id of usersA) {
    onlyB.delete(id);
    onlyC.delete(id);
  }
  for (const id of onlyB) onlyC.delete(id);

  const countA = usersA.size;
  const countB = onlyB.size;
  const countC = onlyC.size;
  const staff = countA + countB + countC;
  const guest = countA * 2;
  const instance = staff + guest + 1;

  return { countA, countB, countC, staff, guest, instance };
}

/** 集計結果をテキストで整形 */
export function formatResult(result: AggregateResult): string {
  return [
    `**リアクション集計結果**`,
    `・イケケモ: ${result.countA}人 / 案内: ${result.countB}人 / サクラ: ${result.countC}人`,
    `・スタッフ: ${result.staff}人 (イケケモ+案内+サクラ)`,
    `・ゲスト: ${result.guest}人 (イケケモ×2)`,
    `・インスタンス人数: **${result.instance}** (スタッフ+ゲスト+Nekodon)`,
  ].join('\n');
}

/** 同一メッセージへの連打対策: 直近で処理したメッセージIDと時刻 */
const lastProcessed = new Map<string, number>();
const DEBOUNCE_MS = 5000;

function shouldProcess(messageId: string): boolean {
  const now = Date.now();
  const last = lastProcessed.get(messageId);
  if (last != null && now - last < DEBOUNCE_MS) return false;
  lastProcessed.set(messageId, now);
  return true;
}

/** messageReactionAdd 用ハンドラを登録する */
export function registerReactionAggregate(client: Client): void {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (!emojiMatches(reaction, TRIGGER)) return;

    const msg = reaction.message;
    if (msg.partial) {
      try {
        await msg.fetch();
      } catch {
        return;
      }
    }

    const message = msg as Message;
    const channel = message.channel;

    if (!isSendableChannel(channel)) return;
    if (!shouldProcess(message.id)) return;

    try {
      const result = await aggregateFromMessage(message);
      if (!result) return;

      // 出力先: RESULT_THREAD_ID が設定されていればそのスレッド、なければ同じチャンネル
      let targetChannel = channel;
      let targetName = channel.name;

      if (config.resultThreadId) {
        try {
          const thread = await client.channels.fetch(config.resultThreadId);
          if (thread && thread.isThread()) {
            targetChannel = thread;
            targetName = thread.name;
          } else {
            logger.error(`RESULT_THREAD_ID=${config.resultThreadId} はスレッドではありません`);
          }
        } catch (e) {
          logger.error(`RESULT_THREAD_ID=${config.resultThreadId} の取得に失敗しました:`, e);
        }
      }

      await targetChannel.send(formatResult(result));
      logger.info(
        `📊 リアクション集計 送信完了 - チャンネル: ${targetName}, スタッフ: ${result.staff}, ゲスト: ${result.guest}, インスタンス: ${result.instance}`,
      );
    } catch (e) {
      logger.error('リアクション集計エラー:', e);
      await channel.send('リアクション集計の計算中にエラーが発生しました。').catch(() => {});
    }
  });
}
