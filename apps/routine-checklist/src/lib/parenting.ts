import { isJapaneseHoliday } from './japaneseHolidays';
import type {
  ChildProfileSection,
  ParentingData,
  ParentingDayMode,
  ReviewSettingKey,
} from '../parentingTypes';

export interface ParentingCheckDefinition {
  id: string;
  label: string;
  detailLabel?: string;
  minutesLabel?: string;
  requireDetail?: boolean;
}

export interface ChildFieldDefinition {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  reviewKey?: ReviewSettingKey;
}

export const DAILY_CHECKS: Record<
  ParentingDayMode,
  ParentingCheckDefinition[]
> = {
  weekday: [
    {
      id: 'child-state',
      label: '今日の子どもの様子を把握した',
      detailLabel: '機嫌・体調など（任意）',
    },
    {
      id: 'focused-time',
      label: 'スマホを置いて子どもと向き合った',
      minutesLabel: '向き合った時間（分）',
    },
    {
      id: 'led-care',
      label: '自分主体で育児を1つ完結した',
      detailLabel: '完結した内容',
      requireDetail: true,
    },
    {
      id: 'reduced-load',
      label: '妻の負担を1つ減らした',
      detailLabel: '減らした内容',
      requireDetail: true,
    },
    { id: 'checked-plans', label: '明日・直近の予定を確認した' },
  ],
  holiday: [
    {
      id: 'child-state',
      label: '今日の子どもの様子を把握した',
      detailLabel: '機嫌・体調など（任意）',
    },
    {
      id: 'played-together',
      label: 'スマホなしでしっかり一緒に遊んだ',
      minutesLabel: '遊んだ時間（分）',
    },
    {
      id: 'led-care',
      label: '食事・着替え・外出等を主体的に担当した',
      detailLabel: '担当した内容',
      requireDetail: true,
    },
    {
      id: 'went-out',
      label: '子どもと外に出た、または一緒に活動した',
      detailLabel: '場所・活動（任意）',
    },
    {
      id: 'wife-break',
      label: '妻が育児から離れられる時間を作った',
      detailLabel: 'その間にしたこと',
      minutesLabel: '時間（分）',
    },
    { id: 'checked-next-week', label: '来週の予定・必要物を確認した' },
  ],
};

export const WEEKLY_CHECKS = [
  {
    id: 'favorites',
    label: '最近好きなものを把握している',
    target: 'favorites',
  },
  {
    id: 'dislikes',
    label: '最近嫌がるもの・苦手なものを把握している',
    target: 'dislikes',
  },
  {
    id: 'growth',
    label: '最近できるようになったことを把握している',
    target: 'records',
  },
  {
    id: 'nursery',
    label: '園・家庭で最近変わったことを把握している',
    target: 'nursery',
  },
  { id: 'plans', label: '今後2週間の予定を把握している', target: 'nursery' },
  {
    id: 'supplies',
    label: '消耗品・服・靴など必要なものを確認した',
    target: 'sizes',
  },
  {
    id: 'wife-break',
    label: '妻が育児から離れられる時間を作った',
    target: 'today',
  },
] as const;

export const CHILD_SECTIONS: Array<{
  id: ChildProfileSection;
  label: string;
  icon: string;
  fields: ChildFieldDefinition[];
}> = [
  {
    id: 'favorites',
    label: '好きなもの',
    icon: '♥',
    fields: [
      {
        id: 'favorite-food',
        label: '好きな食べ物',
        placeholder: 'バナナ、うどん',
        reviewKey: 'favorites',
      },
      {
        id: 'favorite-toys',
        label: '好きなおもちゃ',
        placeholder: 'ミニカー、積み木',
        reviewKey: 'favorites',
      },
      {
        id: 'favorite-play',
        label: '好きな遊び',
        placeholder: '追いかけっこ、滑り台',
        reviewKey: 'favorites',
      },
      {
        id: 'favorite-characters',
        label: 'キャラクター・動物',
        placeholder: 'ペンギン',
        reviewKey: 'favorites',
      },
      {
        id: 'favorite-media',
        label: 'よく見るもの',
        placeholder: '絵本、動画',
        reviewKey: 'favorites',
      },
      {
        id: 'favorite-delights',
        label: '最近喜ぶこと',
        placeholder: '公園、高い高い',
        reviewKey: 'favorites',
      },
    ],
  },
  {
    id: 'dislikes',
    label: '苦手・嫌がるもの',
    icon: '△',
    fields: [
      {
        id: 'dislike-food',
        label: '苦手な食べ物',
        placeholder: '食材や調理方法',
        reviewKey: 'dislikes',
      },
      {
        id: 'dislike-fears',
        label: '怖がるもの',
        placeholder: '音、物、状況',
        reviewKey: 'dislikes',
      },
      {
        id: 'dislike-actions',
        label: '嫌がる行動',
        placeholder: '歯磨き、着替え',
        reviewKey: 'dislikes',
      },
      {
        id: 'dislike-places',
        label: '苦手な場所',
        placeholder: '場所や環境',
        reviewKey: 'dislikes',
      },
      {
        id: 'dislike-times',
        label: '嫌がる時間帯',
        placeholder: '起床直後など',
        reviewKey: 'dislikes',
      },
      {
        id: 'calming',
        label: '落ち着く方法',
        placeholder: '抱っこ、好きな歌',
        reviewKey: 'dislikes',
      },
    ],
  },
  {
    id: 'sizes',
    label: 'サイズ・用品',
    icon: '◇',
    fields: [
      { id: 'height', label: '身長', placeholder: '例：98 cm' },
      { id: 'weight', label: '体重', placeholder: '例：15.2 kg' },
      {
        id: 'clothes-size',
        label: '服サイズ',
        placeholder: '例：100',
        reviewKey: 'clothesSize',
      },
      {
        id: 'shoe-size',
        label: '靴サイズ',
        placeholder: '例：16.0 cm',
        reviewKey: 'shoeSize',
      },
      { id: 'hat-size', label: '帽子サイズ', placeholder: '例：52 cm' },
      { id: 'diaper', label: 'おむつ', placeholder: 'メーカー・商品・サイズ' },
      {
        id: 'needed-items',
        label: '次に必要なもの',
        placeholder: '服、靴、消耗品',
        multiline: true,
      },
    ],
  },
  {
    id: 'rhythm',
    label: '生活リズム',
    icon: '◷',
    fields: [
      { id: 'wake-time', label: '起床', placeholder: '7:00頃' },
      { id: 'nap-time', label: '昼寝', placeholder: '12:30〜14:00頃' },
      { id: 'dinner-time', label: '夕食', placeholder: '18:00頃' },
      { id: 'bath-time', label: 'お風呂', placeholder: '19:00頃' },
      { id: 'bed-time', label: '就寝', placeholder: '20:30頃' },
      {
        id: 'meal-guide',
        label: '食事量・硬さの目安',
        placeholder: '普段の量や食べられる硬さ',
        multiline: true,
      },
    ],
  },
  {
    id: 'nursery',
    label: '園',
    icon: '⌂',
    fields: [
      { id: 'nursery-name', label: '園名', placeholder: '園の名前' },
      { id: 'nursery-class', label: 'クラス', placeholder: 'クラス名' },
      {
        id: 'nursery-teachers',
        label: '担任・よく関わる先生',
        placeholder: '先生の名前',
      },
      {
        id: 'nursery-friends',
        label: '仲の良い友達',
        placeholder: '友達の名前',
      },
      {
        id: 'nursery-items',
        label: '基本・曜日別の持ち物',
        placeholder: '水筒、お昼寝セットなど',
        multiline: true,
      },
      {
        id: 'nursery-event',
        label: '次の行事・予定',
        placeholder: '日付と内容',
        multiline: true,
      },
      {
        id: 'nursery-submission',
        label: '提出物',
        placeholder: '内容と期限',
        multiline: true,
      },
    ],
  },
  {
    id: 'medical',
    label: '医療',
    icon: '＋',
    fields: [
      { id: 'doctor', label: 'かかりつけ', placeholder: '病院名・連絡先' },
      {
        id: 'allergies',
        label: 'アレルギー',
        placeholder: '必要な範囲で記録',
        multiline: true,
      },
      {
        id: 'medicine',
        label: 'よく使う薬',
        placeholder: '薬名・注意点',
        multiline: true,
      },
      {
        id: 'medical-memo',
        label: '受診時に伝えること',
        placeholder: '発熱、食事、水分、睡眠、排便、機嫌など',
        multiline: true,
      },
    ],
  },
];

export const GROWTH_CATEGORIES = [
  '言葉',
  '運動',
  '食事',
  '興味',
  '遊び',
  '感情',
  '生活',
  'その他',
] as const;

export function dayModeFor(dateKey: string): ParentingDayMode {
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 || isJapaneseHoliday(dateKey)
    ? 'holiday'
    : 'weekday';
}

export function weekStartFor(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function daysSince(date: string, today: string): number {
  const from = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  const to = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

export function latestProfileConfirmation(
  data: ParentingData,
  reviewKey: ReviewSettingKey,
): string | undefined {
  const dates = data.childProfile
    .filter((entry) =>
      CHILD_SECTIONS.flatMap((section) => section.fields)
        .filter((field) => field.reviewKey === reviewKey)
        .some((field) => field.id === entry.field),
    )
    .map((entry) => entry.confirmedAt)
    .sort();
  return dates.at(-1);
}

export function latestWifeBreak(data: ParentingData): string | undefined {
  return Object.values(data.dailyRecords)
    .filter((record) => record.items['wife-break']?.completed)
    .map((record) => record.date)
    .sort()
    .at(-1);
}
