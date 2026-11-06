export interface Tally {
  id: number;
  points: number;
  firstPlace: number;
}

export function pollWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function tally(votes: number[][]): Tally[] {
  const map = new Map<number, Tally>();
  for (const picks of votes) {
    picks.forEach((id, i) => {
      const t = map.get(id) ?? { id, points: 0, firstPlace: 0 };
      t.points += picks.length - i;
      if (i === 0) t.firstPlace++;
      map.set(id, t);
    });
  }
  return [...map.values()].sort((a, b) => b.points - a.points || b.firstPlace - a.firstPlace || a.id - b.id);
}
