const DAY_MS = 86_400_000;

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function nthMonday(year: number, month: number, nth: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((8 - firstDay) % 7) + (nth - 1) * 7;
}

function springEquinox(year: number): number {
  return Math.floor(
    20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  );
}

function autumnEquinox(year: number): number {
  return Math.floor(
    23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  );
}

export function japaneseHolidayKeys(year: number): Set<string> {
  const holidays = new Set<string>();
  const add = (month: number, day: number) =>
    holidays.add(dateKey(year, month, day));

  add(1, 1);
  add(1, nthMonday(year, 1, 2));
  add(2, 11);
  if (year >= 2020) add(2, 23);
  add(3, springEquinox(year));
  add(4, 29);
  add(5, 3);
  add(5, 4);
  add(5, 5);

  if (year === 2020) {
    add(7, 23);
    add(7, 24);
    add(8, 10);
  } else if (year === 2021) {
    add(7, 22);
    add(7, 23);
    add(8, 8);
  } else {
    add(7, nthMonday(year, 7, 3));
    add(8, 11);
    add(10, nthMonday(year, 10, 2));
  }

  add(9, nthMonday(year, 9, 3));
  add(9, autumnEquinox(year));
  add(11, 3);
  add(11, 23);

  // 国民の祝日に挟まれた平日は「国民の休日」。
  for (
    let time = Date.UTC(year, 0, 2);
    time < Date.UTC(year + 1, 0, 1);
    time += DAY_MS
  ) {
    const current = new Date(time);
    const key = dateKey(
      current.getUTCFullYear(),
      current.getUTCMonth() + 1,
      current.getUTCDate(),
    );
    if (holidays.has(key) || current.getUTCDay() === 0) continue;
    const previous = new Date(time - DAY_MS);
    const next = new Date(time + DAY_MS);
    const previousKey = dateKey(
      previous.getUTCFullYear(),
      previous.getUTCMonth() + 1,
      previous.getUTCDate(),
    );
    const nextKey = dateKey(
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
    );
    if (holidays.has(previousKey) && holidays.has(nextKey)) holidays.add(key);
  }

  // 日曜の祝日は、直後の祝日ではない日に振替。
  [...holidays].forEach((key) => {
    const holiday = new Date(`${key}T00:00:00Z`);
    if (holiday.getUTCDay() !== 0) return;
    let substitute = new Date(holiday.getTime() + DAY_MS);
    let substituteKey = substitute.toISOString().slice(0, 10);
    while (holidays.has(substituteKey)) {
      substitute = new Date(substitute.getTime() + DAY_MS);
      substituteKey = substitute.toISOString().slice(0, 10);
    }
    holidays.add(substituteKey);
  });

  return holidays;
}

export function isJapaneseHoliday(dateKeyValue: string): boolean {
  const year = Number(dateKeyValue.slice(0, 4));
  return japaneseHolidayKeys(year).has(dateKeyValue);
}
