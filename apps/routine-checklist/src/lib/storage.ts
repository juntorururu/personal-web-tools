import { createDefaultData } from './defaults';
import { jstDateKey, weekdayFromDateKey } from './date';
import { ALL_WEEKDAYS, normalizeOrders } from './routines';
import type {
  AppData,
  BackupFile,
  DailyProgress,
  RoutineGroup,
  RoutineItem,
  Weekday,
} from '../types';

export const STORAGE_KEY = 'daily-routine:data:v1';
export const WEEKDAY_SNAPSHOT_KEY = 'daily-routine:weekdays:v1';

type WeekdaySnapshot = Map<string, Weekday[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseDays(value: unknown): Weekday[] | null {
  if (value === undefined) return [...ALL_WEEKDAYS];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (day) =>
        typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    return null;
  }
  const selected = new Set(value as Weekday[]);
  return ALL_WEEKDAYS.filter((day) => selected.has(day));
}

function parseItem(
  value: unknown,
  weekdaySnapshot: WeekdaySnapshot,
): RoutineItem | null {
  if (!isRecord(value)) return null;
  const group: unknown = value.group;
  const validGroup = group === 'morning' || group === 'evening';
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.label !== 'string' ||
    value.label.trim().length === 0 ||
    !validGroup ||
    typeof value.enabled !== 'boolean' ||
    typeof value.order !== 'number' ||
    !Number.isFinite(value.order)
  ) {
    return null;
  }
  const savedDays = weekdaySnapshot.get(value.id);
  const days = parseDays(value.days === undefined ? savedDays : value.days);
  if (!days) return null;
  return {
    id: value.id,
    label: value.label.trim(),
    group: group as RoutineGroup,
    time: isTime(value.time)
      ? value.time
      : defaultItemTime(group as RoutineGroup, value.order),
    days,
    enabled: value.enabled,
    order: Math.max(0, Math.floor(value.order)),
  };
}

function loadWeekdaySnapshot(): WeekdaySnapshot {
  const snapshot: WeekdaySnapshot = new Map();
  try {
    const raw = localStorage.getItem(WEEKDAY_SNAPSHOT_KEY);
    if (!raw) return snapshot;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return snapshot;
    Object.entries(value).forEach(([id, savedDays]) => {
      const days = parseDays(savedDays);
      if (days) snapshot.set(id, days);
    });
  } catch {
    return snapshot;
  }
  return snapshot;
}

function saveWeekdaySnapshot(items: RoutineItem[]): void {
  localStorage.setItem(
    WEEKDAY_SNAPSHOT_KEY,
    JSON.stringify(
      Object.fromEntries(items.map((item) => [item.id, [...item.days]])),
    ),
  );
}

function defaultItemTime(group: RoutineGroup, order: number): string {
  const baseMinutes = group === 'morning' ? 6 * 60 + 30 : 19 * 60;
  const totalMinutes = baseMinutes + Math.max(0, Math.floor(order)) * 10;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseHistory(value: unknown): DailyProgress[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const records: DailyProgress[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      typeof item.percentage !== 'number' ||
      !Number.isInteger(item.percentage) ||
      item.percentage < 0 ||
      item.percentage > 100
    ) {
      return null;
    }
    records.push({ date: item.date, percentage: item.percentage });
  }
  return [...new Map(records.map((record) => [record.date, record])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
}

export function validateAppData(
  value: unknown,
  weekdaySnapshot: WeekdaySnapshot = new Map(),
): AppData | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.items)
  )
    return null;

  const items = value.items.map((item) => parseItem(item, weekdaySnapshot));
  if (items.some((item) => item === null)) return null;
  const validItems = items as RoutineItem[];
  if (new Set(validItems.map((item) => item.id)).size !== validItems.length)
    return null;

  const notifications = value.notifications;
  const settings = value.settings;
  const completion = value.completion;
  const history = parseHistory(value.history);
  if (!isRecord(notifications) || !isRecord(settings) || !isRecord(completion))
    return null;
  if (!history) return null;
  const morning = notifications.morning;
  const evening = notifications.evening;
  if (!isRecord(morning) || !isRecord(evening)) return null;
  if (
    typeof morning.enabled !== 'boolean' ||
    !isTime(morning.time) ||
    typeof evening.enabled !== 'boolean' ||
    !isTime(evening.time)
  ) {
    return null;
  }
  if (!['system', 'light', 'dark'].includes(String(settings.theme)))
    return null;
  if (
    typeof completion.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(completion.date) ||
    !Array.isArray(completion.completedIds) ||
    !completion.completedIds.every((id) => typeof id === 'string')
  ) {
    return null;
  }

  const validIds = new Set(validItems.map((item) => item.id));
  return {
    schemaVersion: 1,
    items: normalizeOrders(validItems),
    notifications: {
      morning: { enabled: morning.enabled, time: morning.time },
      evening: { enabled: evening.enabled, time: evening.time },
    },
    settings: { theme: settings.theme as AppData['settings']['theme'] },
    completion: {
      date: completion.date,
      completedIds: [...new Set(completion.completedIds)].filter((id) =>
        validIds.has(id),
      ),
    },
    history,
  };
}

export function ensureToday(data: AppData, now = new Date()): AppData {
  const today = jstDateKey(now);
  if (data.completion.date === today) return data;
  const weekday = weekdayFromDateKey(data.completion.date);
  const scheduledItems = data.items.filter(
    (item) => item.enabled && item.days.includes(weekday),
  );
  const completedCount = scheduledItems.filter((item) =>
    data.completion.completedIds.includes(item.id),
  ).length;
  const percentage =
    scheduledItems.length === 0
      ? null
      : Math.round((completedCount / scheduledItems.length) * 100);
  const history =
    percentage === null
      ? data.history
      : [
          ...data.history.filter(
            (record) => record.date !== data.completion.date,
          ),
          { date: data.completion.date, percentage },
        ]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-90);
  return {
    ...data,
    history,
    completion: { date: today, completedIds: [] },
  };
}

export function loadData(now = new Date()): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData(now);
    const valid = validateAppData(JSON.parse(raw), loadWeekdaySnapshot());
    return valid ? ensureToday(valid, now) : createDefaultData(now);
  } catch {
    return createDefaultData(now);
  }
}

export function saveData(data: AppData): void {
  saveWeekdaySnapshot(data.items);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createBackup(data: AppData, now = new Date()): BackupFile {
  return {
    app: 'daily-routine',
    exportVersion: 1,
    exportedAt: now.toISOString(),
    data,
  };
}

export function parseBackup(text: string, now = new Date()): AppData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めないファイルです。');
  }

  if (
    !isRecord(value) ||
    value.app !== 'daily-routine' ||
    value.exportVersion !== 1
  ) {
    throw new Error('Daily Routineのバックアップファイルではありません。');
  }

  const data = validateAppData(value.data);
  if (!data)
    throw new Error(
      'バックアップの内容が不正です。既存データは変更されていません。',
    );
  return ensureToday(data, now);
}
