export type GermanHoliday = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isAllDay: true;
  type: "holiday";
};

/**
 * Wandelt ein Datum in einen vergleichbaren Schlüssel um.
 */
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Verschiebt ein Datum um die angegebene Anzahl an Tagen.
 */
function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

/**
 * Erzeugt einen Feiertag mit normalisiertem Datumsschlüssel.
 */
function createHoliday(year: number, title: string, date: Date): GermanHoliday {
  const key = toDateKey(date);

  return {
    id: `holiday-${year}-${key}-${title.toLowerCase().replaceAll(" ", "-")}`,
    title,
    startsAt: `${key}T00:00:00.000`,
    endsAt: `${key}T23:59:59.999`,
    isAllDay: true,
    type: "holiday",
  };
}

/**
 * Berechnet das Datum des Ostersonntags für das angegebene Jahr.
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Ermittelt die bundesweit verwendeten deutschen Feiertage für ein Jahr.
 */
export function getGermanPublicHolidays(year: number): GermanHoliday[] {
  const easterSunday = calculateEasterSunday(year);

  return [
    createHoliday(year, "Neujahr", new Date(year, 0, 1)),
    createHoliday(year, "Karfreitag", addDays(easterSunday, -2)),
    createHoliday(year, "Ostermontag", addDays(easterSunday, 1)),
    createHoliday(year, "Tag der Arbeit", new Date(year, 4, 1)),
    createHoliday(year, "Christi Himmelfahrt", addDays(easterSunday, 39)),
    createHoliday(year, "Pfingstmontag", addDays(easterSunday, 50)),
    createHoliday(year, "Tag der Deutschen Einheit", new Date(year, 9, 3)),
    createHoliday(year, "1. Weihnachtstag", new Date(year, 11, 25)),
    createHoliday(year, "2. Weihnachtstag", new Date(year, 11, 26)),
  ];
}

/**
 * Fasst die deutschen Feiertage mehrerer Jahre zusammen und sortiert sie chronologisch.
 */
export function getGermanPublicHolidaysForYears(
  years: number[],
): GermanHoliday[] {
  const uniqueYears = [...new Set(years)].sort(
    (firstYear, secondYear) => firstYear - secondYear,
  );

  return uniqueYears.flatMap((year) => getGermanPublicHolidays(year));
}
