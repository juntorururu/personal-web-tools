import { createDefaultData } from './defaults';
import {
  createBackup,
  ensureToday,
  loadData,
  parseBackup,
  saveData,
  STORAGE_KEY,
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
    expect(ensureToday(data, day2).completion.completedIds).toEqual([]);
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
