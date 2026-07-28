import { jstDateKey } from './date';
import { ALL_WEEKDAYS } from './routines';
import type { AppData, RoutineItem } from '../types';

const initialItems: RoutineItem[] = [
  {
    id: 'morning-curtain',
    label: 'カーテンを開ける',
    group: 'morning',
    time: '06:30',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 0,
  },
  {
    id: 'morning-water',
    label: '水を飲む',
    group: 'morning',
    time: '06:40',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 1,
  },
  {
    id: 'morning-trash',
    label: 'ゴミ出しを確認する',
    group: 'morning',
    time: '06:50',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 2,
  },
  {
    id: 'morning-belongings',
    label: '持ち物を確認する',
    group: 'morning',
    time: '07:00',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 3,
  },
  {
    id: 'evening-mail',
    label: '郵便物を確認する',
    group: 'evening',
    time: '19:00',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 0,
  },
  {
    id: 'evening-bag',
    label: 'カバンの中を整理する',
    group: 'evening',
    time: '19:10',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 1,
  },
  {
    id: 'evening-tomorrow',
    label: '明日の準備をする',
    group: 'evening',
    time: '21:00',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 2,
  },
  {
    id: 'evening-charge',
    label: 'スマートフォンを充電する',
    group: 'evening',
    time: '22:00',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 3,
  },
  {
    id: 'evening-lock',
    label: '戸締まりを確認する',
    group: 'evening',
    time: '23:00',
    days: ALL_WEEKDAYS,
    enabled: true,
    order: 4,
  },
];

export function createDefaultData(now = new Date()): AppData {
  return {
    schemaVersion: 1,
    items: initialItems.map((item) => ({ ...item, days: [...item.days] })),
    notifications: {
      morning: { enabled: false, time: '07:00' },
      evening: { enabled: false, time: '19:00' },
    },
    settings: { theme: 'system' },
    completion: {
      date: jstDateKey(now),
      completedIds: [],
    },
    history: [],
  };
}
