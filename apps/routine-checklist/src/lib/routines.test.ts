import { createDefaultData } from './defaults';
import {
  addRoutine,
  moveRoutine,
  removeRoutine,
  updateRoutine,
} from './routines';

describe('routine operations', () => {
  const base = createDefaultData(new Date('2026-07-27T00:00:00+09:00')).items;

  it('adds, renames, enables and removes an item', () => {
    const added = addRoutine(
      base,
      '朝食をとる',
      'morning',
      '07:10',
      [1, 2, 3, 4, 5],
      'new-item',
    );
    expect(added.at(-1)?.label).toBe('朝食をとる');
    const changed = updateRoutine(added, 'new-item', {
      label: '朝食',
      time: '07:20',
      days: [1, 3, 5],
      enabled: false,
    });
    expect(changed.find((item) => item.id === 'new-item')).toMatchObject({
      label: '朝食',
      time: '07:20',
      days: [1, 3, 5],
      enabled: false,
    });
    expect(
      removeRoutine(changed, 'new-item').some((item) => item.id === 'new-item'),
    ).toBe(false);
  });

  it('rejects an invalid routine time', () => {
    expect(() => addRoutine(base, '朝食をとる', 'morning', '25:00')).toThrow(
      '時刻',
    );
  });

  it('requires at least one display day', () => {
    expect(() =>
      addRoutine(base, '朝食をとる', 'morning', '07:10', []),
    ).toThrow('曜日');
  });

  it('moves and changes the group of an item', () => {
    const moved = moveRoutine(base, 'morning-water', -1);
    expect(moved.find((item) => item.id === 'morning-water')?.order).toBe(0);
    const changedGroup = updateRoutine(moved, 'morning-water', {
      group: 'evening',
    });
    expect(
      changedGroup.find((item) => item.id === 'morning-water'),
    ).toMatchObject({
      group: 'evening',
      order: 5,
    });
  });
});
