export type ParentingDayMode = 'weekday' | 'holiday';

export type ChildProfileSection =
  'favorites' | 'dislikes' | 'sizes' | 'rhythm' | 'nursery' | 'medical';

export type GrowthCategory =
  '言葉' | '運動' | '食事' | '興味' | '遊び' | '感情' | '生活' | 'その他';

export type ReviewSettingKey =
  'wifeBreak' | 'favorites' | 'dislikes' | 'shoeSize' | 'clothesSize';

export interface ParentingCheckState {
  completed: boolean;
  completedAt?: string;
  detail?: string;
  minutes?: number;
}

export interface ParentingDailyRecord {
  date: string;
  modeOverride?: ParentingDayMode;
  items: Record<string, ParentingCheckState>;
}

export interface ParentingWeeklyRecord {
  weekStart: string;
  completedIds: string[];
}

export interface ChildProfileEntry {
  id: string;
  section: ChildProfileSection;
  field: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
}

export interface GrowthRecord {
  id: string;
  date: string;
  category: GrowthCategory;
  title: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSetting {
  enabled: boolean;
  days: number;
}

export interface ParentingSettings {
  reviews: Record<ReviewSettingKey, ReviewSetting>;
}

export interface ParentingData {
  schemaVersion: 1;
  dailyRecords: Record<string, ParentingDailyRecord>;
  weeklyRecords: Record<string, ParentingWeeklyRecord>;
  childProfile: ChildProfileEntry[];
  growthRecords: GrowthRecord[];
  settings: ParentingSettings;
}
