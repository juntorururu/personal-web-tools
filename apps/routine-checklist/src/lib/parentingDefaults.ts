import type { ParentingData, ReviewSettingKey } from '../parentingTypes';

export const REVIEW_DEFAULT_DAYS: Record<ReviewSettingKey, number> = {
  wifeBreak: 7,
  favorites: 30,
  dislikes: 30,
  shoeSize: 45,
  clothesSize: 60,
};

export function createDefaultParentingData(): ParentingData {
  return {
    schemaVersion: 1,
    dailyRecords: {},
    weeklyRecords: {},
    childProfile: [],
    growthRecords: [],
    settings: {
      reviews: Object.fromEntries(
        Object.entries(REVIEW_DEFAULT_DAYS).map(([key, days]) => [
          key,
          { enabled: true, days },
        ]),
      ) as ParentingData['settings']['reviews'],
    },
  };
}
