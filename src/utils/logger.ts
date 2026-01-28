/**
 * シンプルなログユーティリティ
 * 将来的にログレベルの制御やフォーマット変更を入れやすくする
 */

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(message, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
};
