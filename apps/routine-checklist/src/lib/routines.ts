import type { RoutineGroup, RoutineItem, Weekday } from '../types';

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function normalizeWeekdays(days: Weekday[]): Weekday[] {
  if (
    days.length === 0 ||
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new Error('表示する曜日を1つ以上選んでください。');
  }
  const selected = new Set(days);
  return ALL_WEEKDAYS.filter((day) => selected.has(day));
}

export function normalizeOrders(items: RoutineItem[]): RoutineItem[] {
  const result: RoutineItem[] = [];

  (['morning', 'evening'] as const).forEach((group) => {
    items
      .filter((item) => item.group === group)
      .sort((a, b) => a.order - b.order)
      .forEach((item, index) => result.push({ ...item, order: index }));
  });

  return result;
}

export function addRoutine(
  items: RoutineItem[],
  label: string,
  group: RoutineGroup,
  time: string,
  days: Weekday[] = ALL_WEEKDAYS,
  id: string = crypto.randomUUID(),
): RoutineItem[] {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    throw new Error('項目名を入力してください。');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('時刻を正しく入力してください。');
  }

  const nextOrder = items.filter((item) => item.group === group).length;
  return [
    ...items,
    {
      id,
      label: cleanLabel,
      group,
      time,
      days: normalizeWeekdays(days),
      enabled: true,
      order: nextOrder,
    },
  ];
}

export function updateRoutine(
  items: RoutineItem[],
  id: string,
  patch: Partial<
    Pick<RoutineItem, 'label' | 'group' | 'time' | 'days' | 'enabled'>
  >,
): RoutineItem[] {
  const current = items.find((item) => item.id === id);
  if (!current) return items;

  const label = patch.label === undefined ? current.label : patch.label.trim();
  if (!label) throw new Error('項目名を空にすることはできません。');
  if (
    patch.time !== undefined &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.time)
  ) {
    throw new Error('時刻を正しく入力してください。');
  }
  const days =
    patch.days === undefined ? current.days : normalizeWeekdays(patch.days);

  return normalizeOrders(
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            label,
            days,
            order:
              patch.group && patch.group !== current.group
                ? Number.MAX_SAFE_INTEGER
                : item.order,
          }
        : item,
    ),
  );
}

export function removeRoutine(items: RoutineItem[], id: string): RoutineItem[] {
  return normalizeOrders(items.filter((item) => item.id !== id));
}

export function moveRoutine(
  items: RoutineItem[],
  id: string,
  direction: -1 | 1,
): RoutineItem[] {
  const current = items.find((item) => item.id === id);
  if (!current) return items;

  const groupItems = items
    .filter((item) => item.group === current.group)
    .sort((a, b) => a.order - b.order);
  const index = groupItems.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= groupItems.length) return items;

  const target = groupItems[targetIndex];
  return normalizeOrders(
    items.map((item) => {
      if (item.id === current.id) return { ...item, order: target.order };
      if (item.id === target.id) return { ...item, order: current.order };
      return item;
    }),
  );
}
