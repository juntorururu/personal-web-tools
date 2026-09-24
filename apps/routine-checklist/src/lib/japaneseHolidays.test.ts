import { describe, expect, it } from 'vitest';
import { isJapaneseHoliday } from './japaneseHolidays';
import { dayModeFor, weekStartFor } from './parenting';

describe('Japanese holidays', () => {
  it('detects fixed, Monday, equinox and substitute holidays', () => {
    expect(isJapaneseHoliday('2026-01-01')).toBe(true);
    expect(isJapaneseHoliday('2026-01-12')).toBe(true);
    expect(isJapaneseHoliday('2026-03-20')).toBe(true);
    expect(isJapaneseHoliday('2026-05-06')).toBe(true);
    expect(isJapaneseHoliday('2026-09-24')).toBe(false);
  });

  it('uses the holiday mode on weekends and public holidays', () => {
    expect(dayModeFor('2026-09-21')).toBe('holiday');
    expect(dayModeFor('2026-09-26')).toBe('holiday');
    expect(dayModeFor('2026-09-24')).toBe('weekday');
  });

  it('calculates a Monday week start', () => {
    expect(weekStartFor('2026-09-24')).toBe('2026-09-21');
    expect(weekStartFor('2026-09-27')).toBe('2026-09-21');
  });
});
