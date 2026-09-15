import type { ActivityPeriod, ProfilePost } from '@/shared/types';

const LOCATION_ZONES: Array<[RegExp, string]> = [
  [/北京|上海|深圳|广州|杭州|中国|china|beijing|shanghai|shenzhen|hong kong|香港/i, 'Asia/Shanghai'],
  [/东京|日本|tokyo|japan/i, 'Asia/Tokyo'], [/首尔|韩国|seoul|korea/i, 'Asia/Seoul'],
  [/新加坡|singapore/i, 'Asia/Singapore'], [/伦敦|英国|london|uk|united kingdom/i, 'Europe/London'],
  [/巴黎|法国|paris|france/i, 'Europe/Paris'], [/柏林|德国|berlin|germany/i, 'Europe/Berlin'],
  [/纽约|new york|nyc/i, 'America/New_York'], [/洛杉矶|旧金山|硅谷|los angeles|san francisco|bay area|silicon valley/i, 'America/Los_Angeles'],
  [/西雅图|seattle/i, 'America/Los_Angeles'], [/多伦多|toronto/i, 'America/Toronto'],
  [/悉尼|澳大利亚|sydney|australia/i, 'Australia/Sydney'],
];

export function inferTimeZone(location: string): { zone: string | null; confidence: ActivityPeriod['confidence'] } {
  if (!location.trim()) return { zone: null, confidence: 'unknown' };
  const match = LOCATION_ZONES.find(([pattern]) => pattern.test(location));
  return match ? { zone: match[1], confidence: 'medium' } : { zone: null, confidence: 'unknown' };
}

function hourAt(date: Date, timeZone: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(date));
}

function bestWindow(posts: ProfilePost[], zone: string) {
  const counts = Array.from({ length: 24 }, () => 0);
  const dates = posts.map((post) => post.timestamp ? new Date(post.timestamp) : null).filter((date): date is Date => Boolean(date && !Number.isNaN(date.valueOf())));
  for (const date of dates) {
    const hour = hourAt(date, zone);
    counts[hour] = (counts[hour] ?? 0) + 1;
  }
  if (!dates.length) return null;
  let start = 0; let score = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    const current = (counts[hour] ?? 0) + (counts[(hour + 1) % 24] ?? 0) + (counts[(hour + 2) % 24] ?? 0) + (counts[(hour + 3) % 24] ?? 0);
    if (current > score) { score = current; start = hour; }
  }
  return { start, dates };
}

const hh = (hour: number) => `${String((hour + 24) % 24).padStart(2, '0')}:00`;

export function analyzeActivity(posts: ProfilePost[], location: string): ActivityPeriod {
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const inferred = inferTimeZone(location);
  const calculationZone = inferred.zone ?? viewerTimeZone;
  const window = bestWindow(posts, calculationZone);
  if (!window) return { targetLabel: '数据不足', viewerLabel: '数据不足', targetTimeZone: inferred.zone, viewerTimeZone, confidence: inferred.confidence, sampleSize: 0 };

  const targetStart = window.start;
  const representative = window.dates[0]!;
  const targetHourAtDate = hourAt(representative, calculationZone);
  const viewerHourAtDate = hourAt(representative, viewerTimeZone);
  const viewerStart = targetStart + viewerHourAtDate - targetHourAtDate;
  return {
    targetLabel: `${hh(targetStart)}–${hh(targetStart + 4)}`,
    viewerLabel: `${hh(viewerStart)}–${hh(viewerStart + 4)}`,
    targetTimeZone: inferred.zone,
    viewerTimeZone,
    confidence: inferred.confidence,
    sampleSize: window.dates.length,
  };
}
