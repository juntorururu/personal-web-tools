import { useEffect, useMemo, useState } from 'react';
import {
  CHILD_SECTIONS,
  DAILY_CHECKS,
  GROWTH_CATEGORIES,
  WEEKLY_CHECKS,
  dayModeFor,
  daysSince,
  latestProfileConfirmation,
  latestWifeBreak,
  weekStartFor,
} from './lib/parenting';
import { REVIEW_DEFAULT_DAYS } from './lib/parentingDefaults';
import type { AppData, RoutineItem } from './types';
import type {
  ChildProfileSection,
  GrowthCategory,
  GrowthRecord,
  ParentingCheckState,
  ParentingData,
  ParentingDayMode,
  ReviewSettingKey,
} from './parentingTypes';

export type MainTab = 'home' | 'parenting' | 'child' | 'records';
type SetParenting = (
  updater: (current: ParentingData) => ParentingData,
) => void;

const REVIEW_LABELS: Record<ReviewSettingKey, string> = {
  wifeBreak: '妻の一人時間',
  favorites: '好きなもの',
  dislikes: '苦手なもの',
  shoeSize: '靴サイズ',
  clothesSize: '服サイズ',
};

function formatShortDate(value?: string): string {
  if (!value) return '未確認';
  const key = value.slice(0, 10);
  const [, month, day] = key.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function weeklyLinkedId(section: ChildProfileSection): string | undefined {
  if (section === 'favorites') return 'favorites';
  if (section === 'dislikes') return 'dislikes';
  if (section === 'sizes') return 'supplies';
  if (section === 'nursery') return 'nursery';
  return undefined;
}

function completeWeeklyItem(
  data: ParentingData,
  today: string,
  id?: string,
): ParentingData {
  if (!id) return data;
  const weekStart = weekStartFor(today);
  const record = data.weeklyRecords[weekStart] ?? {
    weekStart,
    completedIds: [],
  };
  return {
    ...data,
    weeklyRecords: {
      ...data.weeklyRecords,
      [weekStart]: {
        ...record,
        completedIds: [...new Set([...record.completedIds, id])],
      },
    },
  };
}

export function BottomNav({
  active,
  onNavigate,
}: {
  active: MainTab;
  onNavigate: (tab: MainTab) => void;
}) {
  const tabs: Array<{ id: MainTab; icon: string; label: string }> = [
    { id: 'home', icon: '✓', label: 'ルーティン' },
    { id: 'parenting', icon: '♡', label: '育児' },
    { id: 'child', icon: '☺', label: '子ども' },
    { id: 'records', icon: '▤', label: '記録' },
  ];
  return (
    <nav className="bottom-nav" aria-label="メインメニュー">
      {tabs.map((tab) => (
        <button
          className={active === tab.id ? 'active' : ''}
          type="button"
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onNavigate(tab.id)}
          key={tab.id}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}

function SummaryCard({
  label,
  completed,
  total,
  onClick,
}: {
  label: string;
  completed: number;
  total: number;
  onClick: () => void;
}) {
  return (
    <button className="parenting-summary-card" type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>
        {completed}
        <small> / {total}</small>
      </strong>
      <span aria-hidden="true">›</span>
    </button>
  );
}

export function ParentingDashboard({
  parenting,
  routine,
  today,
  onNavigate,
}: {
  parenting: ParentingData;
  routine: AppData;
  today: string;
  onNavigate: (
    destination: 'today' | 'week' | 'child' | 'records' | 'settings',
  ) => void;
}) {
  const daily = parenting.dailyRecords[today];
  const mode = daily?.modeOverride ?? dayModeFor(today);
  const dailyChecks = DAILY_CHECKS[mode];
  const dailyCompleted = dailyChecks.filter(
    (item) => daily?.items[item.id]?.completed,
  ).length;
  const weekStart = weekStartFor(today);
  const weeklyCompleted = WEEKLY_CHECKS.filter((item) =>
    parenting.weeklyRecords[weekStart]?.completedIds.includes(item.id),
  ).length;
  const latestGrowth = [...parenting.growthRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const reviewDates: Record<ReviewSettingKey, string | undefined> = {
    wifeBreak: latestWifeBreak(parenting),
    favorites: latestProfileConfirmation(parenting, 'favorites'),
    dislikes: latestProfileConfirmation(parenting, 'dislikes'),
    shoeSize: latestProfileConfirmation(parenting, 'shoeSize'),
    clothesSize: latestProfileConfirmation(parenting, 'clothesSize'),
  };
  const warnings = (Object.keys(reviewDates) as ReviewSettingKey[]).filter(
    (key) => {
      const setting = parenting.settings.reviews[key];
      const confirmed = reviewDates[key];
      return (
        setting.enabled &&
        (!confirmed || daysSince(confirmed, today) >= setting.days)
      );
    },
  );
  const completedRoutineItems = routine.items.filter(
    (item) =>
      routine.completion.completedIds.includes(item.id) &&
      /子|育児|お風呂|寝かしつけ|園/.test(item.label),
  );

  return (
    <main className="page parenting-page">
      <section className="parenting-hero">
        <p className="eyebrow">PARENTING</p>
        <h2>今日の家族に、ひとつずつ。</h2>
        <p>
          {mode === 'holiday' ? '休日モード' : '平日モード'} ·{' '}
          {today.replaceAll('-', '/')}
        </p>
      </section>
      <div className="parenting-summary-grid">
        <SummaryCard
          label="今日の育児"
          completed={dailyCompleted}
          total={dailyChecks.length}
          onClick={() => onNavigate('today')}
        />
        <SummaryCard
          label="今週の育児"
          completed={weeklyCompleted}
          total={WEEKLY_CHECKS.length}
          onClick={() => onNavigate('week')}
        />
      </div>

      <section className="panel parenting-panel">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">REVIEW</p>
            <h2>要確認</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => onNavigate('settings')}
          >
            設定
          </button>
        </div>
        {warnings.length === 0 ? (
          <p className="success-copy">
            現在、期限を迎えた確認項目はありません。
          </p>
        ) : (
          <ul className="review-list">
            {warnings.map((key) => {
              const confirmed = reviewDates[key];
              return (
                <li key={key}>
                  <span className="warning-mark" aria-hidden="true">
                    !
                  </span>
                  <span>
                    <strong>{REVIEW_LABELS[key]}</strong>
                    <small>
                      {confirmed
                        ? `最終確認 ${daysSince(confirmed, today)}日前`
                        : 'まだ記録がありません'}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(key === 'wifeBreak' ? 'today' : 'child')
                    }
                  >
                    確認する
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel parenting-panel">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">GROWTH</p>
            <h2>最近の成長・変化</h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => onNavigate('records')}
          >
            記録する
          </button>
        </div>
        {latestGrowth.length === 0 ? (
          <p className="empty-copy">まだ記録がありません。</p>
        ) : (
          <ul className="growth-preview-list">
            {latestGrowth.map((record) => (
              <li key={record.id}>
                <span>{record.category}</span>
                <div>
                  <strong>{record.title}</strong>
                  <small>{record.date.replaceAll('-', '/')}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel parenting-panel">
        <div className="section-heading">
          <p className="eyebrow">REFERENCE</p>
          <h2>完了した育児関連ルーティン</h2>
        </div>
        <p className="support-copy">
          参考表示です。育児チェックは自動では完了しません。
        </p>
        {completedRoutineItems.length === 0 ? (
          <p className="empty-copy">該当する完了済みルーティンはありません。</p>
        ) : (
          <ul className="reference-list">
            {completedRoutineItems.map((item) => (
              <li key={item.id}>
                ✓ {item.label}
                <time>{item.time}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export function DailyParentingView({
  parenting,
  setParenting,
  today,
  routineItems,
}: {
  parenting: ParentingData;
  setParenting: SetParenting;
  today: string;
  routineItems: RoutineItem[];
}) {
  const record = parenting.dailyRecords[today] ?? { date: today, items: {} };
  const mode = record.modeOverride ?? dayModeFor(today);
  const definitions = DAILY_CHECKS[mode];
  const [expanded, setExpanded] = useState<string | null>(null);
  const updateState = (id: string, changes: Partial<ParentingCheckState>) => {
    setParenting((current) => {
      const currentRecord = current.dailyRecords[today] ?? {
        date: today,
        items: {},
      };
      const currentState = currentRecord.items[id] ?? { completed: false };
      return {
        ...current,
        dailyRecords: {
          ...current.dailyRecords,
          [today]: {
            ...currentRecord,
            items: {
              ...currentRecord.items,
              [id]: { ...currentState, ...changes },
            },
          },
        },
      };
    });
  };
  const toggle = (id: string) => {
    const definition = definitions.find((item) => item.id === id)!;
    const state = record.items[id];
    if (
      !state?.completed &&
      definition.requireDetail &&
      !state?.detail?.trim()
    ) {
      setExpanded(id);
      return;
    }
    updateState(
      id,
      state?.completed
        ? { completed: false, completedAt: undefined }
        : { completed: true, completedAt: new Date().toISOString() },
    );
  };
  const setMode = (nextMode: ParentingDayMode) =>
    setParenting((current) => ({
      ...current,
      dailyRecords: {
        ...current.dailyRecords,
        [today]: {
          ...(current.dailyRecords[today] ?? { date: today, items: {} }),
          modeOverride: nextMode,
        },
      },
    }));

  return (
    <main className="page parenting-page">
      <section className="mode-switch" aria-label="今日のモード">
        {(['weekday', 'holiday'] as ParentingDayMode[]).map((item) => (
          <button
            className={mode === item ? 'active' : ''}
            type="button"
            onClick={() => setMode(item)}
            key={item}
          >
            {item === 'weekday' ? '平日モード' : '休日モード'}
          </button>
        ))}
      </section>
      <p className="support-copy centered-copy">
        土日祝は休日モードになります。今日だけ手動で変更できます。
      </p>
      <section className="panel parenting-panel">
        <div className="section-heading">
          <p className="eyebrow">TODAY</p>
          <h2>今日の育児</h2>
        </div>
        <ul className="parenting-checklist">
          {definitions.map((definition) => {
            const state = record.items[definition.id];
            const open = expanded === definition.id;
            return (
              <li
                className={state?.completed ? 'completed' : ''}
                key={definition.id}
              >
                <div className="parenting-check-row">
                  <button
                    className="round-check"
                    type="button"
                    aria-label={`${definition.label}を${state?.completed ? '未完了' : '完了'}にする`}
                    onClick={() => toggle(definition.id)}
                  >
                    {state?.completed ? '✓' : ''}
                  </button>
                  <button
                    className="check-copy-button"
                    type="button"
                    onClick={() => setExpanded(open ? null : definition.id)}
                  >
                    <strong>{definition.label}</strong>
                    {state?.detail && <small>{state.detail}</small>}
                    {state?.minutes !== undefined && (
                      <small>{state.minutes}分</small>
                    )}
                  </button>
                  {(definition.detailLabel || definition.minutesLabel) && (
                    <button
                      className="disclosure-button"
                      type="button"
                      aria-label="詳細を入力"
                      onClick={() => setExpanded(open ? null : definition.id)}
                    >
                      ›
                    </button>
                  )}
                </div>
                {open && (
                  <div className="check-details">
                    {definition.detailLabel && (
                      <label>
                        {definition.detailLabel}
                        <input
                          value={state?.detail ?? ''}
                          onChange={(event) =>
                            updateState(definition.id, {
                              detail: event.target.value,
                            })
                          }
                          placeholder="入力してください"
                        />
                      </label>
                    )}
                    {definition.minutesLabel && (
                      <label>
                        {definition.minutesLabel}
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="1440"
                          value={state?.minutes ?? ''}
                          onChange={(event) =>
                            updateState(definition.id, {
                              minutes:
                                event.target.value === ''
                                  ? undefined
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    )}
                    {definition.requireDetail && !state?.completed && (
                      <button
                        className="primary-button full-button"
                        type="button"
                        disabled={!state?.detail?.trim()}
                        onClick={() => {
                          updateState(definition.id, {
                            completed: true,
                            completedAt: new Date().toISOString(),
                          });
                          setExpanded(null);
                        }}
                      >
                        完了にする
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel parenting-panel">
        <div className="section-heading">
          <p className="eyebrow">REFERENCE</p>
          <h2>今日のルーティン</h2>
        </div>
        <p className="support-copy">
          参考表示のみです。育児チェックへは自動反映しません。
        </p>
        <ul className="reference-list">
          {routineItems.length ? (
            routineItems.map((item) => (
              <li key={item.id}>
                ✓ {item.label}
                <time>{item.time}</time>
              </li>
            ))
          ) : (
            <li className="empty-copy">育児関連の完了項目はありません。</li>
          )}
        </ul>
      </section>
    </main>
  );
}

export function WeeklyParentingView({
  parenting,
  setParenting,
  today,
  onNavigate,
}: {
  parenting: ParentingData;
  setParenting: SetParenting;
  today: string;
  onNavigate: (target: 'today' | 'records' | ChildProfileSection) => void;
}) {
  const weekStart = weekStartFor(today);
  const record = parenting.weeklyRecords[weekStart] ?? {
    weekStart,
    completedIds: [],
  };
  const toggle = (id: string) =>
    setParenting((current) => {
      const currentRecord = current.weeklyRecords[weekStart] ?? {
        weekStart,
        completedIds: [],
      };
      const completed = new Set(currentRecord.completedIds);
      const willComplete = !completed.has(id);
      if (willComplete) completed.add(id);
      else completed.delete(id);
      const next: ParentingData = {
        ...current,
        weeklyRecords: {
          ...current.weeklyRecords,
          [weekStart]: { ...currentRecord, completedIds: [...completed] },
        },
      };
      if (id !== 'wife-break') return next;
      const daily = current.dailyRecords[today] ?? { date: today, items: {} };
      return {
        ...next,
        dailyRecords: {
          ...next.dailyRecords,
          [today]: {
            ...daily,
            items: {
              ...daily.items,
              'wife-break': willComplete
                ? { completed: true, completedAt: new Date().toISOString() }
                : {
                    ...daily.items['wife-break'],
                    completed: false,
                    completedAt: undefined,
                  },
            },
          },
        },
      };
    });
  return (
    <main className="page parenting-page">
      <section className="panel parenting-panel">
        <div className="section-heading">
          <p className="eyebrow">THIS WEEK</p>
          <h2>今週の育児</h2>
          <p className="support-copy">
            {weekStart.replaceAll('-', '/')}からの1週間
          </p>
        </div>
        <ul className="parenting-checklist weekly-checklist">
          {WEEKLY_CHECKS.map((item) => {
            const completed = record.completedIds.includes(item.id);
            return (
              <li className={completed ? 'completed' : ''} key={item.id}>
                <div className="parenting-check-row">
                  <button
                    className="round-check"
                    type="button"
                    onClick={() => toggle(item.id)}
                  >
                    {completed ? '✓' : ''}
                  </button>
                  <button
                    className="check-copy-button"
                    type="button"
                    onClick={() =>
                      onNavigate(
                        item.target as
                          'today' | 'records' | ChildProfileSection,
                      )
                    }
                  >
                    <strong>{item.label}</strong>
                    <small>
                      {item.id === 'favorites' || item.id === 'dislikes'
                        ? '子ども情報で確認すると自動で完了します'
                        : '内容を確認・記録する'}
                    </small>
                  </button>
                  <button
                    className="disclosure-button"
                    type="button"
                    onClick={() =>
                      onNavigate(
                        item.target as
                          'today' | 'records' | ChildProfileSection,
                      )
                    }
                  >
                    ›
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

export function ChildProfileView({
  parenting,
  setParenting,
  today,
  initialSection,
}: {
  parenting: ParentingData;
  setParenting: SetParenting;
  today: string;
  initialSection?: ChildProfileSection;
}) {
  const [selected, setSelected] = useState<ChildProfileSection>(
    initialSection ?? 'favorites',
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const section = CHILD_SECTIONS.find((item) => item.id === selected)!;
  useEffect(() => {
    setSelected(initialSection ?? 'favorites');
  }, [initialSection]);
  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        section.fields.map((field) => [
          field.id,
          parenting.childProfile.find((entry) => entry.id === field.id)
            ?.value ?? '',
        ]),
      ),
    );
  }, [section, parenting.childProfile]);

  const saveField = (fieldId: string) => {
    const value = drafts[fieldId]?.trim() ?? '';
    if (!value) return;
    const now = new Date().toISOString();
    setParenting((current) => {
      const existing = current.childProfile.find(
        (entry) => entry.id === fieldId,
      );
      const next = {
        id: fieldId,
        section: selected,
        field: fieldId,
        value,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        confirmedAt: now,
      };
      const withProfile = {
        ...current,
        childProfile: [
          ...current.childProfile.filter((entry) => entry.id !== fieldId),
          next,
        ],
      };
      return completeWeeklyItem(withProfile, today, weeklyLinkedId(selected));
    });
  };
  const confirmField = (fieldId: string) =>
    setParenting((current) => {
      const existing = current.childProfile.find(
        (entry) => entry.id === fieldId,
      );
      if (!existing) return current;
      const withProfile = {
        ...current,
        childProfile: current.childProfile.map((entry) =>
          entry.id === fieldId
            ? { ...entry, confirmedAt: new Date().toISOString() }
            : entry,
        ),
      };
      return completeWeeklyItem(withProfile, today, weeklyLinkedId(selected));
    });

  return (
    <main className="page parenting-page child-page">
      <div
        className="section-tabs"
        role="tablist"
        aria-label="子ども情報の分類"
      >
        {CHILD_SECTIONS.map((item) => (
          <button
            className={selected === item.id ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={selected === item.id}
            onClick={() => setSelected(item.id)}
            key={item.id}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
      <section className="panel parenting-panel">
        <div className="section-heading">
          <p className="eyebrow">CHILD PROFILE</p>
          <h2>{section.label}</h2>
          <p className="support-copy">
            内容の変更日と、確認した日を別々に記録します。
          </p>
        </div>
        <div className="profile-fields">
          {section.fields.map((field) => {
            const entry = parenting.childProfile.find(
              (item) => item.id === field.id,
            );
            const Input = field.multiline ? 'textarea' : 'input';
            return (
              <article className="profile-field" key={field.id}>
                <label>
                  <strong>{field.label}</strong>
                  <Input
                    value={drafts[field.id] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="profile-dates">
                  <span>最終更新 {formatShortDate(entry?.updatedAt)}</span>
                  <span>最終確認 {formatShortDate(entry?.confirmedAt)}</span>
                </div>
                <div className="profile-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      !drafts[field.id]?.trim() ||
                      drafts[field.id]?.trim() === entry?.value
                    }
                    onClick={() => saveField(field.id)}
                  >
                    内容を保存
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={!entry}
                    onClick={() => confirmField(field.id)}
                  >
                    変更なし・確認済みにする
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

export function GrowthRecordsView({
  parenting,
  setParenting,
  today,
}: {
  parenting: ParentingData;
  setParenting: SetParenting;
  today: string;
}) {
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<GrowthCategory>('言葉');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const records = useMemo(
    () =>
      [...parenting.growthRecords].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.updatedAt.localeCompare(a.updatedAt),
      ),
    [parenting.growthRecords],
  );
  const resetForm = () => {
    setEditing(null);
    setDate(today);
    setCategory('言葉');
    setTitle('');
    setDetail('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const record: GrowthRecord = {
      id: editing?.id ?? newId('growth'),
      date,
      category,
      title: title.trim(),
      detail: detail.trim(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    setParenting((current) =>
      completeWeeklyItem(
        {
          ...current,
          growthRecords: [
            ...current.growthRecords.filter((item) => item.id !== record.id),
            record,
          ],
        },
        today,
        'growth',
      ),
    );
    resetForm();
  };
  const edit = (record: GrowthRecord) => {
    setEditing(record);
    setDate(record.date);
    setCategory(record.category);
    setTitle(record.title);
    setDetail(record.detail);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = (record: GrowthRecord) => {
    if (!window.confirm(`「${record.title}」を削除しますか？`)) return;
    setParenting((current) => ({
      ...current,
      growthRecords: current.growthRecords.filter(
        (item) => item.id !== record.id,
      ),
    }));
    if (editing?.id === record.id) resetForm();
  };
  return (
    <main className="page parenting-page records-page">
      <form className="panel growth-form" onSubmit={submit}>
        <div className="section-heading">
          <p className="eyebrow">GROWTH LOG</p>
          <h2>{editing ? '記録を編集' : '成長・変化を記録'}</h2>
        </div>
        <div className="form-grid">
          <label>
            日付
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            カテゴリ
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as GrowthCategory)
              }
            >
              {GROWTH_CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          タイトル
          <input
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="できるようになったこと・気づいたこと"
            required
          />
        </label>
        <label>
          詳細（任意）
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="その時の様子を残せます"
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editing ? '更新する' : '記録する'}
          </button>
          {editing && (
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
      <section className="records-list">
        {records.length === 0 ? (
          <div className="panel empty-copy">
            まだ成長・変化の記録がありません。
          </div>
        ) : (
          records.map((record) => (
            <article className="panel growth-record" key={record.id}>
              <div className="growth-record-heading">
                <span>{record.category}</span>
                <time>{record.date.replaceAll('-', '/')}</time>
              </div>
              <h3>{record.title}</h3>
              {record.detail && <p>{record.detail}</p>}
              <div className="record-actions">
                <button type="button" onClick={() => edit(record)}>
                  編集
                </button>
                <button
                  className="danger-text"
                  type="button"
                  onClick={() => remove(record)}
                >
                  削除
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export function ParentingSettingsPanel({
  parenting,
  setParenting,
}: {
  parenting: ParentingData;
  setParenting: SetParenting;
}) {
  const update = (
    key: ReviewSettingKey,
    changes: { enabled?: boolean; days?: number },
  ) =>
    setParenting((current) => ({
      ...current,
      settings: {
        ...current.settings,
        reviews: {
          ...current.settings.reviews,
          [key]: { ...current.settings.reviews[key], ...changes },
        },
      },
    }));
  const reset = () =>
    setParenting((current) => ({
      ...current,
      settings: {
        reviews: Object.fromEntries(
          Object.entries(REVIEW_DEFAULT_DAYS).map(([key, days]) => [
            key,
            { enabled: true, days },
          ]),
        ) as ParentingData['settings']['reviews'],
      },
    }));
  return (
    <section className="panel parenting-settings">
      <div className="section-heading">
        <p className="eyebrow">PARENTING REVIEW</p>
        <h2>育児・要確認の設定</h2>
        <p className="support-copy">
          日数を変更すると、要確認の表示だけを再計算します。過去の記録は変わりません。
        </p>
      </div>
      {(Object.keys(REVIEW_LABELS) as ReviewSettingKey[]).map((key) => {
        const setting = parenting.settings.reviews[key];
        return (
          <div className="review-setting-row" key={key}>
            <div>
              <strong>{REVIEW_LABELS[key]}</strong>
              <label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={setting.days}
                  onChange={(event) =>
                    update(key, {
                      days: Math.max(
                        1,
                        Math.min(3650, Number(event.target.value) || 1),
                      ),
                    })
                  }
                />
                日以上空いたら表示
              </label>
            </div>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={setting.enabled}
                onChange={(event) =>
                  update(key, { enabled: event.target.checked })
                }
              />
              <span>{setting.enabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        );
      })}
      <button
        className="secondary-button full-button"
        type="button"
        onClick={reset}
      >
        初期値に戻す
      </button>
    </section>
  );
}
