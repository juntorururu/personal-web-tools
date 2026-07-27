export type RoutineGroup = 'morning' | 'evening';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RoutineItem {
  id: string;
  label: string;
  group: RoutineGroup;
  time: string;
  days: Weekday[];
  enabled: boolean;
  order: number;
}

export interface TimeNotificationSetting {
  enabled: boolean;
  time: string;
}

export interface NotificationSettings {
  morning: TimeNotificationSetting;
  evening: TimeNotificationSetting;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
}

export interface CompletionState {
  date: string;
  completedIds: string[];
}

export interface AppData {
  schemaVersion: 1;
  items: RoutineItem[];
  notifications: NotificationSettings;
  settings: AppSettings;
  completion: CompletionState;
}

export interface BackupFile {
  app: 'daily-routine';
  exportVersion: 1;
  exportedAt: string;
  data: AppData;
}
