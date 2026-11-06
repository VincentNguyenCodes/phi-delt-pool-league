export const ZONE = "America/Los_Angeles";
const FIRST_ISSUE_MONDAY = Date.UTC(2026, 10, 2);

export interface Parts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function pacificParts(date: Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  });
  const get: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) get[part.type] = part.value;
  return {
    year: Number(get.year),
    month: Number(get.month),
    day: Number(get.day),
    weekday: WEEKDAYS[get.weekday],
    hour: Number(get.hour),
    minute: Number(get.minute),
  };
}

export function ymd(p: Ymd): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function parseYmd(text: string): Ymd {
  const [year, month, day] = text.split("-").map(Number);
  return { year, month, day };
}

export function addDays(p: Ymd, n: number): Ymd {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function isPollOpen(p: Parts): boolean {
  return (p.weekday === 6 && p.hour >= 9) || p.weekday === 0;
}

export function pollIdFor(p: Parts): string | null {
  if (p.weekday === 6) return ymd(p);
  if (p.weekday === 0) return ymd(addDays(p, -1));
  return null;
}

export function mondayOf(p: Ymd & { weekday: number }): Ymd {
  const back = p.weekday === 0 ? 6 : p.weekday - 1;
  return addDays(p, -back);
}

export function weekNumber(monday: Ymd): number {
  const diff = Date.UTC(monday.year, monday.month - 1, monday.day) - FIRST_ISSUE_MONDAY;
  return Math.floor(diff / (7 * 86400000)) + 1;
}

function offsetMinutes(date: Date): number {
  const floored = Math.floor(date.getTime() / 60000) * 60000;
  const p = pacificParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - floored) / 60000);
}

export function pacificInstant(p: Ymd, hour = 0, minute = 0): Date {
  const guess = Date.UTC(p.year, p.month - 1, p.day, hour, minute);
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

export function nextOpening(now: Date): Date {
  const p = pacificParts(now);
  let ahead = (6 - p.weekday + 7) % 7;
  let target = pacificInstant(addDays(p, ahead), 9, 0);
  if (target.getTime() <= now.getTime() && !isPollOpen(p)) {
    ahead += 7;
    target = pacificInstant(addDays(p, ahead), 9, 0);
  }
  return target;
}
