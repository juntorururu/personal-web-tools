import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { formatJstDate, jstDateKey, jstTime, jstWeekday } from './lib/date';
import { createDefaultData } from './lib/defaults';
import {
  checkScheduledNotifications,
  notificationPermission,
  showRoutineNotification,
} from './lib/notifications';
import {
  ALL_WEEKDAYS,
  addRoutine,
  moveRoutine,
  removeRoutine,
  updateRoutine,
} from './lib/routines';
import {
  createBackup,
  ensureToday,
  loadData,
  parseBackup,
  saveData,
} from './lib/storage';
import { usePwaUpdate } from './pwa';
import type { AppData, RoutineGroup, RoutineItem, Weekday } from './types';

type View = 'home' | 'edit' | 'notifications' | 'settings';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const GROUP_LABEL: Record<RoutineGroup, string> = {
  morning: '朝起きてから',
  evening: '帰宅してから',
};

const PERMISSION_LABEL: Record<NotificationPermission | 'unsupported', string> =
  {
    default: '未設定',
    granted: '許可済み',
    denied: '拒否されています',
    unsupported: '非対応',
  };

const WEEKDAY_OPTIONS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 0, label: '日' },
];

const DAY_PRESETS: Array<{
  label: string;
  days: Weekday[];
}> = [
  { label: '毎日', days: ALL_WEEKDAYS },
  { label: '平日', days: [1, 2, 3, 4, 5] },
  { label: '週末', days: [0, 6] },
];

function sameWeekdays(left: Weekday[], right: Weekday[]): boolean {
  return (
    left.length === right.length && left.every((day) => right.includes(day))
  );
}

function weekdaySummary(days: Weekday[]): string {
  if (sameWeekdays(days, ALL_WEEKDAYS)) return '毎日';
  const preset = DAY_PRESETS.slice(1).find((item) =>
    sameWeekdays(days, item.days),
  );
  if (preset) return preset.label;
  return WEEKDAY_OPTIONS.filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join('・');
}

function DayPicker({
  days,
  onChange,
  label,
}: {
  days: Weekday[];
  onChange: (days: Weekday[]) => void;
  label: string;
}) {
  const toggleDay = (day: Weekday) => {
    if (days.includes(day)) {
      if (days.length === 1) return;
      onChange(days.filter((selected) => selected !== day));
      return;
    }
    onChange([...days, day]);
  };

  return (
    <fieldset className="day-picker">
      <legend>{label}</legend>
      <div className="day-preset-row" aria-label="曜日の一括選択">
        {DAY_PRESETS.map((preset) => {
          const selected = sameWeekdays(days, preset.days);
          return (
            <button
              className={selected ? 'selected' : ''}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange([...preset.days])}
              key={preset.label}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="weekday-picker" aria-label="表示する曜日">
        {WEEKDAY_OPTIONS.map((day) => {
          const selected = days.includes(day.value);
          return (
            <button
              className={selected ? 'selected' : ''}
              type="button"
              aria-pressed={selected}
              disabled={selected && days.length === 1}
              onClick={() => toggleDay(day.value)}
              key={day.value}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Header({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const title =
    view === 'home'
      ? '毎日のルーティン'
      : view === 'edit'
        ? 'ルーティン編集'
        : view === 'notifications'
          ? '通知設定'
          : 'アプリ設定';

  return (
    <header className="app-header">
      <div className="header-inner">
        {view !== 'home' ? (
          <button
            className="icon-button"
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="ホームへ戻る"
          >
            ←
          </button>
        ) : (
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
        )}
        <div>
          <p className="eyebrow">Daily Routine</p>
          <h1>{title}</h1>
        </div>
        {view === 'home' ? (
          <button
            className="icon-button"
            type="button"
            onClick={() => onNavigate('settings')}
            aria-label="設定を開く"
          >
            ⚙
          </button>
        ) : (
          <span className="header-spacer" />
        )}
      </div>
    </header>
  );
}

function WeekStrip({
  now,
  history,
  currentPercentage,
}: {
  now: Date;
  history: AppData['history'];
  currentPercentage: number | null;
}) {
  const dateKey = jstDateKey(now);
  const [year, month, day] = dateKey.split('-').map(Number);
  const currentDate = new Date(Date.UTC(year, month - 1, day));
  const currentWeekIndex = (currentDate.getUTCDay() + 6) % 7;
  const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <section className="week-strip" aria-label="今週">
      {weekDays.map((weekday, index) => {
        const date = new Date(currentDate);
        date.setUTCDate(currentDate.getUTCDate() + index - currentWeekIndex);
        const isToday = index === currentWeekIndex;
        const isSaturday = index === 5;
        const isSunday = index === 6;
        const dateKeyForDay = [
          date.getUTCFullYear(),
          String(date.getUTCMonth() + 1).padStart(2, '0'),
          String(date.getUTCDate()).padStart(2, '0'),
        ].join('-');
        const isFuture = date.getTime() > currentDate.getTime();
        const percentage = isToday
          ? currentPercentage
          : isFuture
            ? null
            : (history.find((record) => record.date === dateKeyForDay)
                ?.percentage ?? null);
        return (
          <div
            className={[
              'week-day',
              isToday ? 'today-day' : '',
              isSaturday ? 'saturday-day' : '',
              isSunday ? 'sunday-day' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={weekday}
          >
            <span>{weekday}</span>
            <strong aria-current={isToday ? 'date' : undefined}>
              {date.getUTCDate()}
            </strong>
            {percentage === 100 ? (
              <small
                className="week-status achievement-stamp clear-stamp"
                aria-label={`${date.getUTCDate()}日はすべてクリア`}
              >
                <span aria-hidden="true">♛</span>
                <b>100%</b>
              </small>
            ) : percentage !== null && percentage >= 80 ? (
              <small
                className="week-status achievement-stamp gold-stamp"
                aria-label={`${date.getUTCDate()}日の達成率は${percentage}%`}
              >
                <span aria-hidden="true">★</span>
                <b>{percentage}%</b>
              </small>
            ) : percentage !== null ? (
              <small
                className="week-status achievement-stamp gray-stamp"
                aria-label={`${date.getUTCDate()}日の達成率は${percentage}%`}
              >
                <b>{percentage}%</b>
              </small>
            ) : (
              <i aria-hidden="true" />
            )}
          </div>
        );
      })}
    </section>
  );
}

function Progress({ completed, total }: { completed: number; total: number }) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const progressStyle = { '--progress': percentage } as CSSProperties;
  return (
    <section
      className="progress-card"
      aria-label={`完了 ${completed} / ${total}`}
    >
      <div className="progress-ring" style={progressStyle} aria-hidden="true">
        <div>
          <span className="progress-number">{completed}</span>
          <span className="progress-total">/{total}</span>
        </div>
      </div>
      <div className="progress-summary">
        <p className="eyebrow">TODAY&apos;S ROUTINE</p>
        <h2>今日の進み具合</h2>
        <p>
          あと <strong>{Math.max(total - completed, 0)}</strong>{' '}
          件で今日のルーティンが完了します
        </p>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
      {total > 0 && completed === total && (
        <p className="complete-message">
          今日のルーティンはすべて完了しました。
        </p>
      )}
    </section>
  );
}

function RoutineCard({
  group,
  items,
  completedIds,
  onToggle,
}: {
  group: RoutineGroup;
  items: RoutineItem[];
  completedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className={`routine-card timeline-section ${group}`}>
      <div className="card-heading">
        <span className="group-icon" aria-hidden="true">
          {group === 'morning' ? '☀' : '☾'}
        </span>
        <div className="group-heading-copy">
          <p className="card-kicker">
            {group === 'morning' ? 'MORNING' : 'EVENING'}
          </p>
          <h2>{GROUP_LABEL[group]}</h2>
        </div>
        <span className="group-count">{items.length}件</span>
      </div>
      {items.length === 0 ? (
        <p className="empty-copy">
          有効な項目がありません。編集画面から追加できます。
        </p>
      ) : (
        <ul className="checklist">
          {items.map((item) => {
            const checked = completedIds.includes(item.id);
            return (
              <li key={item.id}>
                <label
                  className={`check-row timeline-row ${checked ? 'checked' : ''}`}
                >
                  <time dateTime={item.time}>{item.time}</time>
                  <span className="timeline-marker" aria-hidden="true">
                    <span>{group === 'morning' ? '○' : '●'}</span>
                  </span>
                  <span className="task-copy">
                    <small>
                      {group === 'morning'
                        ? '朝のルーティン'
                        : '帰宅後のルーティン'}
                    </small>
                    <span className="check-label">{item.label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                  />
                  <span className="custom-check" aria-hidden="true">
                    {checked ? '✓' : ''}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HomeView({
  data,
  now,
  onToggle,
  onNavigate,
}: {
  data: AppData;
  now: Date;
  onToggle: (id: string) => void;
  onNavigate: (view: View) => void;
}) {
  const weekday = jstWeekday(now);
  const activeItems = data.items.filter(
    (item) => item.enabled && item.days.includes(weekday),
  );
  const completed = activeItems.filter((item) =>
    data.completion.completedIds.includes(item.id),
  ).length;
  const currentPercentage =
    activeItems.length === 0
      ? null
      : Math.round((completed / activeItems.length) * 100);
  const itemsFor = (group: RoutineGroup) =>
    activeItems
      .filter((item) => item.group === group)
      .sort((a, b) => a.order - b.order);

  return (
    <main className="page home-page">
      <WeekStrip
        now={now}
        history={data.history}
        currentPercentage={currentPercentage}
      />
      <div className="today-line">
        <p className="today">{formatJstDate(now)}</p>
        <p className="current-time">
          <span>現在</span>
          {jstTime(now)}
        </p>
      </div>
      <Progress completed={completed} total={activeItems.length} />
      <div className="schedule-board">
        <RoutineCard
          group="morning"
          items={itemsFor('morning')}
          completedIds={data.completion.completedIds}
          onToggle={onToggle}
        />
        <RoutineCard
          group="evening"
          items={itemsFor('evening')}
          completedIds={data.completion.completedIds}
          onToggle={onToggle}
        />
      </div>
      <button
        className="secondary-button full-button"
        type="button"
        onClick={() => onNavigate('edit')}
      >
        ルーティン項目を編集
      </button>
    </main>
  );
}

function RoutineEditor({
  data,
  setData,
  notify,
}: {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  notify: (message: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState<RoutineGroup>('morning');
  const [time, setTime] = useState('07:00');
  const [days, setDays] = useState<Weekday[]>([...ALL_WEEKDAYS]);
  const [newDaysExpanded, setNewDaysExpanded] = useState(false);
  const [expandedDayIds, setExpandedDayIds] = useState<Set<string>>(
    () => new Set(),
  );

  const mutateItems = (change: (items: RoutineItem[]) => RoutineItem[]) =>
    setData((current) => ({ ...current, items: change(current.items) }));

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      mutateItems((items) => addRoutine(items, label, group, time, days));
      setLabel('');
      setDays([...ALL_WEEKDAYS]);
      setNewDaysExpanded(false);
      notify('項目を追加しました。');
    } catch (error) {
      notify(error instanceof Error ? error.message : '追加できませんでした。');
    }
  };

  const remove = (item: RoutineItem) => {
    if (
      !window.confirm(
        `「${item.label}」を削除しますか？この操作は元に戻せません。`,
      )
    )
      return;
    mutateItems((items) => removeRoutine(items, item.id));
    notify('項目を削除しました。');
  };

  const sortedItems = [...data.items].sort((a, b) => {
    if (a.group !== b.group) return a.group === 'morning' ? -1 : 1;
    return a.order - b.order;
  });

  return (
    <main className="page">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">ADD ITEM</p>
          <h2>新しい項目</h2>
        </div>
        <form className="add-form" onSubmit={add}>
          <label>
            項目名
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              placeholder="例：薬を飲む"
              required
            />
          </label>
          <label>
            グループ
            <select
              value={group}
              onChange={(event) => {
                const nextGroup = event.target.value as RoutineGroup;
                setGroup(nextGroup);
                setTime(nextGroup === 'morning' ? '07:00' : '19:00');
              }}
            >
              <option value="morning">朝起きてから</option>
              <option value="evening">帰宅してから</option>
            </select>
          </label>
          <label>
            時刻
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </label>
          <button
            className="day-summary-button"
            type="button"
            aria-expanded={newDaysExpanded}
            onClick={() => setNewDaysExpanded((expanded) => !expanded)}
          >
            <span>表示する曜日</span>
            <strong>{weekdaySummary(days)}</strong>
            <span className="day-chevron" aria-hidden="true">
              ⌄
            </span>
          </button>
          {newDaysExpanded && (
            <DayPicker
              days={days}
              onChange={setDays}
              label="新しい項目を表示する曜日"
            />
          )}
          <button className="primary-button" type="submit">
            項目を追加
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">MANAGE</p>
          <h2>登録済みの項目</h2>
          <p>名前やグループの変更は自動で保存されます。</p>
        </div>
        <div className="editor-list">
          {sortedItems.map((item) => {
            const groupItems = sortedItems.filter(
              (candidate) => candidate.group === item.group,
            );
            const index = groupItems.findIndex(
              (candidate) => candidate.id === item.id,
            );
            return (
              <article
                className={`editor-item ${item.enabled ? '' : 'disabled-item'}`}
                key={item.id}
              >
                <label className="field-grow">
                  <span className="sr-only">項目名</span>
                  <input
                    value={item.label}
                    maxLength={80}
                    onChange={(event) => {
                      const next = event.target.value;
                      setData((current) => ({
                        ...current,
                        items: current.items.map((candidate) =>
                          candidate.id === item.id
                            ? { ...candidate, label: next }
                            : candidate,
                        ),
                      }));
                    }}
                    onBlur={(event) => {
                      try {
                        mutateItems((items) =>
                          updateRoutine(items, item.id, {
                            label: event.target.value,
                          }),
                        );
                      } catch (error) {
                        notify(
                          error instanceof Error
                            ? error.message
                            : '変更できませんでした。',
                        );
                        mutateItems((items) =>
                          updateRoutine(items, item.id, {
                            label: item.label || '名称未設定',
                          }),
                        );
                      }
                    }}
                  />
                </label>
                <div className="editor-controls">
                  <input
                    type="time"
                    aria-label={`${item.label}の時刻`}
                    value={item.time}
                    onChange={(event) =>
                      mutateItems((items) =>
                        updateRoutine(items, item.id, {
                          time: event.target.value,
                        }),
                      )
                    }
                  />
                  <select
                    aria-label={`${item.label}のグループ`}
                    value={item.group}
                    onChange={(event) =>
                      mutateItems((items) =>
                        updateRoutine(items, item.id, {
                          group: event.target.value as RoutineGroup,
                        }),
                      )
                    }
                  >
                    <option value="morning">朝</option>
                    <option value="evening">帰宅後</option>
                  </select>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        mutateItems((items) =>
                          updateRoutine(items, item.id, {
                            enabled: event.target.checked,
                          }),
                        )
                      }
                    />
                    <span>{item.enabled ? '有効' : '無効'}</span>
                  </label>
                </div>
                <button
                  className="day-summary-button"
                  type="button"
                  aria-expanded={expandedDayIds.has(item.id)}
                  onClick={() =>
                    setExpandedDayIds((current) => {
                      const next = new Set(current);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                >
                  <span>表示する曜日</span>
                  <strong>{weekdaySummary(item.days)}</strong>
                  <span className="day-chevron" aria-hidden="true">
                    ⌄
                  </span>
                </button>
                {expandedDayIds.has(item.id) && (
                  <DayPicker
                    days={item.days}
                    onChange={(nextDays) =>
                      mutateItems((items) =>
                        updateRoutine(items, item.id, { days: nextDays }),
                      )
                    }
                    label={`${item.label}を表示する曜日`}
                  />
                )}
                <div className="item-actions">
                  <button
                    type="button"
                    className="small-button"
                    disabled={index === 0}
                    onClick={() =>
                      mutateItems((items) => moveRoutine(items, item.id, -1))
                    }
                    aria-label={`${item.label}を上へ移動`}
                  >
                    ↑ 上へ
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    disabled={index === groupItems.length - 1}
                    onClick={() =>
                      mutateItems((items) => moveRoutine(items, item.id, 1))
                    }
                    aria-label={`${item.label}を下へ移動`}
                  >
                    ↓ 下へ
                  </button>
                  <button
                    type="button"
                    className="small-button danger"
                    onClick={() => remove(item)}
                  >
                    削除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function NotificationView({
  data,
  setData,
  notify,
}: {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  notify: (message: string) => void;
}) {
  const [permission, setPermission] = useState(notificationPermission());

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      notify('このブラウザは通知に対応していません。');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    notify(
      result === 'granted'
        ? '通知を許可しました。'
        : '通知は許可されませんでした。',
    );
  };

  const updateSetting = (
    group: RoutineGroup,
    patch: Partial<AppData['notifications'][RoutineGroup]>,
  ) =>
    setData((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [group]: { ...current.notifications[group], ...patch },
      },
    }));

  return (
    <main className="page">
      <section className="panel">
        <div className="permission-row">
          <div>
            <p className="eyebrow">PERMISSION</p>
            <h2>通知許可</h2>
          </div>
          <span className={`status-pill ${permission}`}>
            {PERMISSION_LABEL[permission]}
          </span>
        </div>
        <p className="support-copy">
          通知許可はこのボタンを押したときだけ要求します。拒否してもチェックリストはそのまま使えます。
        </p>
        <button
          className="primary-button full-button"
          type="button"
          onClick={requestPermission}
          disabled={permission === 'unsupported'}
        >
          通知の許可を設定
        </button>
      </section>

      {(['morning', 'evening'] as const).map((group) => (
        <section className={`panel notification-panel ${group}`} key={group}>
          <div className="section-heading">
            <p className="eyebrow">
              {group === 'morning' ? 'MORNING' : 'EVENING'}
            </p>
            <h2>{group === 'morning' ? '朝の通知' : '帰宅後の通知'}</h2>
          </div>
          <label className="settings-row">
            <span>通知を有効にする</span>
            <input
              type="checkbox"
              checked={data.notifications[group].enabled}
              onChange={(event) =>
                updateSetting(group, { enabled: event.target.checked })
              }
            />
          </label>
          <label className="settings-row">
            <span>通知時刻</span>
            <input
              type="time"
              value={data.notifications[group].time}
              onChange={(event) =>
                updateSetting(group, { time: event.target.value })
              }
            />
          </label>
          <button
            className="secondary-button full-button"
            type="button"
            onClick={() =>
              showRoutineNotification(group, true)
                .then(() => notify('テスト通知を送信しました。'))
                .catch((error: unknown) =>
                  notify(
                    error instanceof Error
                      ? error.message
                      : '通知を送信できませんでした。',
                  ),
                )
            }
          >
            テスト通知を送る
          </button>
        </section>
      ))}

      <aside className="notice-box">
        <strong>時刻通知について</strong>
        <p>
          このバージョンはアプリが開いていて、ブラウザが処理を継続できる間だけ時刻を確認します。アプリを完全に閉じた状態の通知は保証できません。
        </p>
        <p>
          Android・iPhoneとも、確実な指定時刻通知にはサーバーから送るWeb
          Pushが必要です。詳しい構成案はREADMEに記載しています。
        </p>
      </aside>
    </main>
  );
}

function SettingsView({
  data,
  setData,
  onNavigate,
  notify,
}: {
  data: AppData;
  setData: (updater: (current: AppData) => AppData) => void;
  onNavigate: (view: View) => void;
  notify: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      notify('アプリをインストールしました。');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [notify]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `daily-routine-backup-${data.completion.date}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('バックアップを書き出しました。');
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 1_000_000) {
      notify('ファイルが大きすぎます。1MB以下のJSONを選んでください。');
      return;
    }
    try {
      const restored = parseBackup(await file.text());
      if (
        !window.confirm(
          '現在の設定を、選択したバックアップの内容で置き換えますか？',
        )
      )
        return;
      setData(() => restored);
      notify('バックアップを復元しました。');
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'ファイルを読み込めませんでした。',
      );
    }
  };

  const reset = () => {
    if (
      !window.confirm(
        'すべての項目・チェック・設定を初期状態に戻しますか？この操作は元に戻せません。',
      )
    )
      return;
    setData(() => createDefaultData());
    notify('すべてのデータを初期化しました。');
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <main className="page">
      <section className="settings-menu">
        <button
          className="menu-card"
          type="button"
          onClick={() => onNavigate('edit')}
        >
          <span className="menu-icon" aria-hidden="true">
            ≡
          </span>
          <span>
            <strong>ルーティン項目</strong>
            <small>追加・編集・並べ替え</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
        <button
          className="menu-card"
          type="button"
          onClick={() => onNavigate('notifications')}
        >
          <span className="menu-icon" aria-hidden="true">
            ♢
          </span>
          <span>
            <strong>通知設定</strong>
            <small>時刻・許可・テスト通知</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">APPEARANCE</p>
          <h2>表示</h2>
        </div>
        <label className="settings-row">
          <span>テーマ</span>
          <select
            value={data.settings.theme}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  theme: event.target.value as AppData['settings']['theme'],
                },
              }))
            }
          >
            <option value="system">端末の設定</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">BACKUP</p>
          <h2>データの保存と復元</h2>
        </div>
        <div className="button-stack">
          <button
            className="secondary-button full-button"
            type="button"
            onClick={exportData}
          >
            JSONをエクスポート
          </button>
          <button
            className="secondary-button full-button"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            JSONから復元
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={importData}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">INSTALL</p>
          <h2>ホーム画面へ追加</h2>
        </div>
        {isStandalone ? (
          <p className="success-copy">アプリとしてインストール済みです。</p>
        ) : installPrompt ? (
          <button
            className="primary-button full-button"
            type="button"
            onClick={install}
          >
            この端末にインストール
          </button>
        ) : (
          <p className="support-copy">
            iPhoneではSafariの共有ボタンから「ホーム画面に追加」を選びます。Androidではブラウザメニューの「アプリをインストール」を選びます。
          </p>
        )}
      </section>

      <section className="panel app-info">
        <div>
          <span>アプリ</span>
          <strong>Daily Routine</strong>
        </div>
        <div>
          <span>バージョン</span>
          <strong>1.2.0</strong>
        </div>
        <div>
          <span>保存先</span>
          <strong>この端末内のみ</strong>
        </div>
      </section>

      <section className="danger-zone">
        <h2>データを初期化</h2>
        <p>サンプル項目を含む初期状態に戻します。</p>
        <button
          className="danger-button full-button"
          type="button"
          onClick={reset}
        >
          すべてのデータを初期化
        </button>
      </section>
    </main>
  );
}

export function App() {
  const [data, setDataState] = useState<AppData>(() => loadData());
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>(() =>
    window.location.hash === '#morning' || window.location.hash === '#evening'
      ? 'home'
      : 'home',
  );
  const [toast, setToast] = useState('');
  const pwa = usePwaUpdate();

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const setData = useCallback((updater: (current: AppData) => AppData) => {
    setDataState((current) => updater(ensureToday(current)));
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  useEffect(() => {
    const tick = () => {
      const current = new Date();
      setNow(current);
      setDataState((previous) => ensureToday(previous, current));
      void checkScheduledNotifications(data, current);
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [data]);

  const toggle = useCallback(
    (id: string) =>
      setData((current) => {
        const completed = new Set(current.completion.completedIds);
        if (completed.has(id)) completed.delete(id);
        else completed.add(id);
        return {
          ...current,
          completion: { ...current.completion, completedIds: [...completed] },
        };
      }),
    [setData],
  );

  const renderedView = useMemo(() => {
    if (view === 'home') {
      return (
        <HomeView
          data={data}
          now={now}
          onToggle={toggle}
          onNavigate={setView}
        />
      );
    }
    if (view === 'edit') {
      return <RoutineEditor data={data} setData={setData} notify={notify} />;
    }
    if (view === 'notifications') {
      return <NotificationView data={data} setData={setData} notify={notify} />;
    }
    return (
      <SettingsView
        data={data}
        setData={setData}
        onNavigate={setView}
        notify={notify}
      />
    );
  }, [data, now, view, notify, setData, toggle]);

  return (
    <div className="app-shell">
      <Header view={view} onNavigate={setView} />
      {renderedView}
      {(pwa.needRefresh || pwa.offlineReady) && (
        <div className="update-banner" role="status">
          <div>
            <strong>
              {pwa.needRefresh
                ? '新しいバージョンがあります'
                : 'オフラインで使う準備ができました'}
            </strong>
            <p>
              {pwa.needRefresh
                ? '更新すると最新の機能を利用できます。'
                : '通信がないときもチェックできます。'}
            </p>
          </div>
          <div className="banner-actions">
            {pwa.needRefresh && (
              <button type="button" onClick={pwa.update}>
                更新
              </button>
            )}
            <button
              type="button"
              onClick={
                pwa.needRefresh ? pwa.dismissRefresh : pwa.dismissOffline
              }
              aria-label="案内を閉じる"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
