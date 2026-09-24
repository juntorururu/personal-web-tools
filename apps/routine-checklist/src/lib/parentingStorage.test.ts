import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultData } from './defaults';
import { createDefaultParentingData } from './parentingDefaults';
import {
  PARENTING_STORAGE_KEY,
  loadParentingData,
  saveParentingData,
  validateParentingData,
} from './parentingStorage';
import { createBackup, parseCompleteBackup } from './storage';

describe('parenting storage', () => {
  beforeEach(() => localStorage.clear());

  it('stores parenting data under an independent key', () => {
    const parenting = createDefaultParentingData();
    parenting.settings.reviews.favorites.days = 14;
    saveParentingData(parenting);
    expect(localStorage.getItem(PARENTING_STORAGE_KEY)).toContain('"days":14');
    expect(loadParentingData().settings.reviews.favorites.days).toBe(14);
  });

  it('rejects invalid review thresholds', () => {
    const parenting = createDefaultParentingData();
    parenting.settings.reviews.shoeSize.days = 0;
    expect(validateParentingData(parenting)).toBeNull();
  });

  it('restores both areas from a new backup', () => {
    const date = new Date('2026-09-24T00:00:00.000Z');
    const routine = createDefaultData(date);
    const parenting = createDefaultParentingData();
    parenting.settings.reviews.wifeBreak.enabled = false;
    const backup = createBackup(routine, date, parenting);
    const restored = parseCompleteBackup(JSON.stringify(backup), date);
    expect(restored.data.items).toHaveLength(routine.items.length);
    expect(restored.parenting?.settings.reviews.wifeBreak.enabled).toBe(false);
  });

  it('keeps old routine-only backups compatible', () => {
    const date = new Date('2026-09-24T00:00:00.000Z');
    const backup = createBackup(createDefaultData(date), date);
    const restored = parseCompleteBackup(JSON.stringify(backup), date);
    expect(restored.data.schemaVersion).toBe(1);
    expect(restored.parenting).toBeUndefined();
  });
});
