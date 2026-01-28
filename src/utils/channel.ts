import type { Channel, TextChannel, NewsChannel, AnyThreadChannel } from 'discord.js';

/** send() を持つチャンネル型 */
export type SendableChannel = TextChannel | NewsChannel | AnyThreadChannel;

/**
 * チャンネルが send() を持つかどうかを判定する型ガード
 */
export function isSendableChannel(channel: Channel | null): channel is SendableChannel {
  if (!channel) return false;
  return (
    channel.isTextBased() &&
    'send' in channel &&
    typeof (channel as SendableChannel).send === 'function'
  );
}

/**
 * チャンネル名を取得する（DM や取得不可の場合は 'Unknown'）
 */
export function getChannelName(channel: Channel | null): string {
  if (!channel) return 'Unknown';
  if ('name' in channel && typeof channel.name === 'string') {
    return channel.name;
  }
  if (channel.isDMBased()) return 'DM';
  return 'Unknown';
}
