import { createDefaultData } from './defaults';
import {
  createBackup,
  ensureToday,
  loadData,
  parseBackup,
  saveData,
  STORAGE_KEY,
  WEEKDAY_SNAPSHOT_KEY,
} from './storage';

const day1 = new Date('2026-07-27T03:00:00+09:00');
const day2 = new Date('2026-07-28T03:00:00+09:00');

describe('storage and backup', () => {
  it('keeps same-day completion after reload', () => {
    const data = createDefaultData(day1);
    data.completion.completedIds = ['morning-water'];
    saveData(data);
    expect(loadData(day1).completion.completedIds).toEqual(['morning-water']);
  });

  it('saves notification settings', () => {
    const data = createDefaultData(day1);
    data.notifications.morning = { enabled: true, time: '06:45' };
    data.notifications.evening = { enabled: true, time: '20:15' };
    saveData(data);
    expect(loadData(day1).notifications).toEqual(data.notifications);
  });

  it('resets completion on the next JST day', () => {
    const data = createDefaultData(day1);
    data.completion.completedIds = ['morning-water'];
    const nextDay = ensureToday(data, day2);
    expect(nextDay.completion.completedIds).toEqual([]);
    expect(nextDay.history).toEqual([{ date: '2026-07-27', percentage: 11 }]);
  });

  it('records a clear day as 100 percent', () => {
    const data = createDefaultData(day1);
    data.completion.completedIds = data.items.map((item) => item.id);
    expect(ensureToday(data, day2).history).toEqual([
      { date: '2026-07-27', percentage: 100 },
    ]);
  });

  it('exports and restores valid data', () => {
    const data = createDefaultData(day1);
    data.notifications.morning.enabled = true;
    const restored = parseBackup(
      JSON.stringify(createBackup(data, day1)),
      day1,
    );
    expect(restored.notifications.morning.enabled).toBe(true);
    expect(restored.items).toHaveLength(9);
    expect(restored.items[0].time).toBe('06:30');
    expect(restored.items[0].days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(restored.history).toEqual([]);
  });

  it('migrates old items that do not have a time', () => {
    const data = createDefaultData(day1);
    const legacy = JSON.parse(JSON.stringify(data)) as {
      items: Array<Record<string, unknown>>;
    };
    delete legacy.items[0].time;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    expect(loadData(day1).items[0].time).toBe('06:30');
  });

  it('migrates old items that do not have display days', () => {
    const data = createDefaultData(day1);
    const legacy = JSON.parse(JSON.stringify(data)) as {
      items: Array<Record<string, unknown>>;
    };
    delete legacy.items[0].days;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    expect(loadData(day1).items[0].days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('restores weekdays after an older app removes them', () => {
    const data = createDefaultData(day1);
    data.items[0].days = [1, 4];
    saveData(data);

    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as {
      items: Array<Record<string, unknown>>;
    };
    legacy.items.forEach((item) => delete item.days);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    expect(loadData(day1).items[0].days).toEqual([1, 4]);
  });

  it('prefers current item weekdays over an older recovery snapshot', () => {
    const data = createDefaultData(day1);
    data.items[0].days = [1, 4];
    saveData(data);

    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as {
      items: Array<Record<string, unknown>>;
    };
    current.items[0].days = [2, 5];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    expect(loadData(day1).items[0].days).toEqual([2, 5]);
    expect(localStorage.getItem(WEEKDAY_SNAPSHOT_KEY)).not.toBeNull();
  });

  it('migrates old data that does not have progress history', () => {
    const data = createDefaultData(day1);
    const legacy = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    delete legacy.history;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    expect(loadData(day1).history).toEqual([]);
  });

  it('rejects invalid JSON without replacing existing data', () => {
    localStorage.setItem(STORAGE_KEY, '{"safe":true}');
    expect(() => parseBackup('{broken', day1)).toThrow('JSONとして');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"safe":true}');
  });

  it('rejects structurally invalid backup data', () => {
    const invalid = {
      app: 'daily-routine',
      exportVersion: 1,
      data: { items: 'wrong' },
    };
    expect(() => parseBackup(JSON.stringify(invalid), day1)).toThrow(
      '内容が不正',
    );
  });
});
