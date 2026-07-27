import type { Weekday } from '../types';

const JAPAN_TIME_ZONE = 'Asia/Tokyo';

export function jstDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAPAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function jstTime(date = new Date()): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JAPAN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function jstWeekday(date = new Date()): Weekday {
  const [year, month, day] = jstDateKey(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

export function formatJstDate(date = new Date()): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JAPAN_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}
