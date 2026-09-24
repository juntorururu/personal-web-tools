import {
  createDefaultParentingData,
  REVIEW_DEFAULT_DAYS,
} from './parentingDefaults';
import type {
  ChildProfileEntry,
  GrowthCategory,
  GrowthRecord,
  ParentingCheckState,
  ParentingDailyRecord,
  ParentingData,
  ParentingDayMode,
  ParentingWeeklyRecord,
  ReviewSettingKey,
} from '../parentingTypes';

export const PARENTING_STORAGE_KEY = 'daily-routine:parenting:v1';

const REVIEW_KEYS = Object.keys(REVIEW_DEFAULT_DAYS) as ReviewSettingKey[];
const PROFILE_SECTIONS = [
  'favorites',
  'dislikes',
  'sizes',
  'rhythm',
  'nursery',
  'medical',
];
const GROWTH_CATEGORIES: GrowthCategory[] = [
  '言葉',
  '運動',
  '食事',
  '興味',
  '遊び',
  '感情',
  '生活',
  'その他',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseCheckState(value: unknown): ParentingCheckState | null {
  if (!isRecord(value) || typeof value.completed !== 'boolean') return null;
  if (value.completedAt !== undefined && !isIsoDate(value.completedAt))
    return null;
  if (value.detail !== undefined && typeof value.detail !== 'string')
    return null;
  if (
    value.minutes !== undefined &&
    (typeof value.minutes !== 'number' ||
      !Number.isFinite(value.minutes) ||
      value.minutes < 0)
  )
    return null;
  return {
    completed: value.completed,
    ...(value.completedAt ? { completedAt: value.completedAt as string } : {}),
    ...(typeof value.detail === 'string'
      ? { detail: value.detail.slice(0, 1000) }
      : {}),
    ...(typeof value.minutes === 'number'
      ? { minutes: Math.round(value.minutes) }
      : {}),
  };
}

function parseDailyRecords(
  value: unknown,
): Record<string, ParentingDailyRecord> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, ParentingDailyRecord> = {};
  for (const [key, record] of Object.entries(value)) {
    if (
      !isDateKey(key) ||
      !isRecord(record) ||
      record.date !== key ||
      !isRecord(record.items)
    )
      return null;
    if (
      record.modeOverride !== undefined &&
      record.modeOverride !== 'weekday' &&
      record.modeOverride !== 'holiday'
    )
      return null;
    const items: Record<string, ParentingCheckState> = {};
    for (const [id, state] of Object.entries(record.items)) {
      const parsed = parseCheckState(state);
      if (!parsed) return null;
      items[id] = parsed;
    }
    result[key] = {
      date: key,
      ...(record.modeOverride
        ? { modeOverride: record.modeOverride as ParentingDayMode }
        : {}),
      items,
    };
  }
  return result;
}

function parseWeeklyRecords(
  value: unknown,
): Record<string, ParentingWeeklyRecord> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, ParentingWeeklyRecord> = {};
  for (const [key, record] of Object.entries(value)) {
    if (
      !isDateKey(key) ||
      !isRecord(record) ||
      record.weekStart !== key ||
      !Array.isArray(record.completedIds) ||
      !record.completedIds.every((id) => typeof id === 'string')
    )
      return null;
    result[key] = {
      weekStart: key,
      completedIds: [...new Set(record.completedIds)],
    };
  }
  return result;
}

function parseProfile(value: unknown): ChildProfileEntry[] | null {
  if (!Array.isArray(value)) return null;
  const result: ChildProfileEntry[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      !PROFILE_SECTIONS.includes(String(entry.section)) ||
      typeof entry.field !== 'string' ||
      typeof entry.value !== 'string' ||
      !isIsoDate(entry.createdAt) ||
      !isIsoDate(entry.updatedAt) ||
      !isIsoDate(entry.confirmedAt)
    )
      return null;
    result.push({
      id: entry.id,
      section: entry.section as ChildProfileEntry['section'],
      field: entry.field,
      value: entry.value.slice(0, 5000),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      confirmedAt: entry.confirmedAt,
    });
  }
  return [...new Map(result.map((entry) => [entry.id, entry])).values()];
}

function parseGrowth(value: unknown): GrowthRecord[] | null {
  if (!Array.isArray(value)) return null;
  const result: GrowthRecord[] = [];
  for (const record of value) {
    if (
      !isRecord(record) ||
      typeof record.id !== 'string' ||
      !isDateKey(record.date) ||
      !GROWTH_CATEGORIES.includes(record.category as GrowthCategory) ||
      typeof record.title !== 'string' ||
      typeof record.detail !== 'string' ||
      !isIsoDate(record.createdAt) ||
      !isIsoDate(record.updatedAt)
    )
      return null;
    result.push({
      id: record.id,
      date: record.date,
      category: record.category as GrowthCategory,
      title: record.title.slice(0, 200),
      detail: record.detail.slice(0, 5000),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
  return [...new Map(result.map((record) => [record.id, record])).values()];
}

export function validateParentingData(value: unknown): ParentingData | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.settings)
  )
    return null;
  const dailyRecords = parseDailyRecords(value.dailyRecords);
  const weeklyRecords = parseWeeklyRecords(value.weeklyRecords);
  const childProfile = parseProfile(value.childProfile);
  const growthRecords = parseGrowth(value.growthRecords);
  const reviews = value.settings.reviews;
  if (
    !dailyRecords ||
    !weeklyRecords ||
    !childProfile ||
    !growthRecords ||
    !isRecord(reviews)
  )
    return null;
  const parsedReviews = createDefaultParentingData().settings.reviews;
  for (const key of REVIEW_KEYS) {
    const setting = reviews[key];
    if (
      !isRecord(setting) ||
      typeof setting.enabled !== 'boolean' ||
      typeof setting.days !== 'number' ||
      !Number.isInteger(setting.days) ||
      setting.days < 1 ||
      setting.days > 3650
    )
      return null;
    parsedReviews[key] = { enabled: setting.enabled, days: setting.days };
  }
  return {
    schemaVersion: 1,
    dailyRecords,
    weeklyRecords,
    childProfile,
    growthRecords,
    settings: { reviews: parsedReviews },
  };
}

export function loadParentingData(): ParentingData {
  try {
    const raw = localStorage.getItem(PARENTING_STORAGE_KEY);
    if (!raw) return createDefaultParentingData();
    return (
      validateParentingData(JSON.parse(raw)) ?? createDefaultParentingData()
    );
  } catch {
    return createDefaultParentingData();
  }
}

export function saveParentingData(data: ParentingData): void {
  localStorage.setItem(PARENTING_STORAGE_KEY, JSON.stringify(data));
}
