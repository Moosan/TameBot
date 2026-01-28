import { Client } from 'discord.js';
import * as cron from 'node-cron';
import { isSendableChannel, logger } from '../utils';

/**
 * 定期実行スケジューラー
 * 将来的に毎週特定の曜日・時間にロールメンション付きでメッセージを送る機能を追加するための基盤
 */
export class Scheduler {
  private client: Client;
  private jobs: cron.ScheduledTask[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * スケジューラーを初期化
   * 将来的な拡張用のメソッド
   */
  public initialize(): void {
    logger.info('📅 スケジューラーを初期化しました（現在はスケジュールされたタスクはありません）');

    // 将来的にここに定期実行タスクを追加
    // 例: this.scheduleWeeklyMessage('0 9 * * 1', 'channelId', 'roleId', 'メッセージ');
  }

  /**
   * 毎週特定の曜日・時間にメッセージを送信するスケジュールを追加
   * @param cronExpression - Cron式（例: '0 9 * * 1' = 毎週月曜日の9時）
   * @param channelId - メッセージを送信するチャンネルID
   * @param roleId - メンションするロールID（オプション）
   * @param message - 送信するメッセージ
   */
  public scheduleWeeklyMessage(
    cronExpression: string,
    channelId: string,
    roleId: string | null,
    message: string
  ): void {
    const job = cron.schedule(
      cronExpression,
      async () => {
        try {
          const channel = await this.client.channels.fetch(channelId);

          if (!isSendableChannel(channel)) {
            logger.error(`チャンネル ${channelId} が見つからないか、メッセージ送信に対応していません`);
            return;
          }

          const mention = roleId ? `<@&${roleId}>` : '';
          const fullMessage = mention ? `${mention} ${message}` : message;

          await channel.send(fullMessage);
          logger.info(`✅ スケジュールされたメッセージを送信しました: ${channelId}`);
        } catch (error) {
          logger.error('スケジュールされたメッセージの送信に失敗しました:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Tokyo',
      },
    );

    this.jobs.push(job);
    logger.info(`📅 スケジュールを追加しました: ${cronExpression}`);
  }

  /**
   * 毎日特定の時間にメッセージを送信するスケジュールを追加
   * @param time - 時間（HH:MM形式、例: '09:00'）
   * @param channelId - メッセージを送信するチャンネルID
   * @param roleId - メンションするロールID（オプション）
   * @param message - 送信するメッセージ
   */
  public scheduleDailyMessage(
    time: string,
    channelId: string,
    roleId: string | null,
    message: string
  ): void {
    const [hours, minutes] = time.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;

    this.scheduleWeeklyMessage(cronExpression, channelId, roleId, message);
  }

  /**
   * すべてのスケジュールを停止
   */
  public stopAll(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    logger.info('🛑 すべてのスケジュールを停止しました');
  }
}
