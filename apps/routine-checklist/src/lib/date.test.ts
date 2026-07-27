import { jstDateKey, jstWeekday } from './date';

describe('jstDateKey', () => {
  it('uses Japan time across the UTC date boundary', () => {
    expect(jstDateKey(new Date('2026-07-26T15:30:00.000Z'))).toBe('2026-07-27');
    expect(jstWeekday(new Date('2026-07-26T15:30:00.000Z'))).toBe(1);
  });
});
