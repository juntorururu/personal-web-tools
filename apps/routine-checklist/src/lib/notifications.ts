import { jstDateKey, jstTime, jstWeekday } from './date';
import type { AppData, RoutineGroup } from '../types';

const NOTIFICATION_LOG_KEY = 'daily-routine:notification-log:v1';

export function notificationPermission():
  NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function showRoutineNotification(
  group: RoutineGroup,
  test = false,
): Promise<void> {
  if (!('Notification' in window))
    throw new Error('このブラウザは通知に対応していません。');
  if (Notification.permission !== 'granted')
    throw new Error('通知が許可されていません。');

  const title = test ? 'テスト通知' : '毎日のルーティン';
  const body =
    group === 'morning'
      ? '朝のルーティンを確認してください'
      : '帰宅後のルーティンを確認してください';
  const options: NotificationOptions = {
    body,
    icon: `${import.meta.env.BASE_URL}icons/app-icon.svg`,
    badge: `${import.meta.env.BASE_URL}icons/app-icon.svg`,
    tag: test ? `daily-routine-test-${group}` : `daily-routine-${group}`,
    data: { url: `${import.meta.env.BASE_URL}#${group}` },
  };

  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) {
    await registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
}

function logKey(date: string, group: RoutineGroup): string {
  return `${date}:${group}`;
}

function readNotificationLog(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(NOTIFICATION_LOG_KEY) ?? '[]',
    );
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : [];
  } catch {
    return [];
  }
}

export async function checkScheduledNotifications(
  data: AppData,
  now = new Date(),
): Promise<void> {
  if (
    document.visibilityState !== 'visible' ||
    notificationPermission() !== 'granted'
  )
    return;

  const date = jstDateKey(now);
  const time = jstTime(now);
  const weekday = jstWeekday(now);
  const log = readNotificationLog();

  for (const group of ['morning', 'evening'] as const) {
    const setting = data.notifications[group];
    const key = logKey(date, group);
    const hasRoutineToday = data.items.some(
      (item) =>
        item.enabled && item.group === group && item.days.includes(weekday),
    );
    if (
      setting.enabled &&
      setting.time === time &&
      hasRoutineToday &&
      !log.includes(key)
    ) {
      await showRoutineNotification(group);
      log.push(key);
    }
  }

  localStorage.setItem(
    NOTIFICATION_LOG_KEY,
    JSON.stringify(log.filter((entry) => entry.startsWith(date))),
  );
}
