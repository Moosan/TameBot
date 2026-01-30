const JST = 'Asia/Tokyo';

/**
 * データ取得日時を JST で mm/dd hh:mm 形式で返す
 */
export function formatRetrievedAt(): string {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JST,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const mm = get('month').padStart(2, '0');
  const dd = get('day').padStart(2, '0');
  const hh = get('hour').padStart(2, '0');
  const min = get('minute').padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}
