import { createDefaultData } from './defaults';
import { jstDateKey } from './date';
import { normalizeOrders } from './routines';
import type { AppData, BackupFile, RoutineGroup, RoutineItem } from '../types';

export const STORAGE_KEY = 'daily-routine:data:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseItem(value: unknown): RoutineItem | null {
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
  return {
    id: value.id,
    label: value.label.trim(),
    group: group as RoutineGroup,
    enabled: value.enabled,
    order: Math.max(0, Math.floor(value.order)),
  };
}

export function validateAppData(value: unknown): AppData | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.items)
  )
    return null;

  const items = value.items.map(parseItem);
  if (items.some((item) => item === null)) return null;
  const validItems = items as RoutineItem[];
  if (new Set(validItems.map((item) => item.id)).size !== validItems.length)
    return null;

  const notifications = value.notifications;
  const settings = value.settings;
  const completion = value.completion;
  if (!isRecord(notifications) || !isRecord(settings) || !isRecord(completion))
    return null;
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
  };
}

export function ensureToday(data: AppData, now = new Date()): AppData {
  const today = jstDateKey(now);
  if (data.completion.date === today) return data;
  return { ...data, completion: { date: today, completedIds: [] } };
}

export function loadData(now = new Date()): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData(now);
    const valid = validateAppData(JSON.parse(raw));
    return valid ? ensureToday(valid, now) : createDefaultData(now);
  } catch {
    return createDefaultData(now);
  }
}

export function saveData(data: AppData): void {
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
