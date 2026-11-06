import { computeLeaderboard, type Report } from "./rating.ts";

export interface DatedReport extends Report {
  createdAt: number;
}

export interface Leader {
  ids: string[];
  value: number;
}

export interface Climb {
  id: string;
  from: number;
  to: number;
}

export interface WeeklyStats {
  reports: number;
  games: number;
  mostGames: Leader | null;
  mostWins: Leader | null;
  mostLosses: Leader | null;
  riser: Climb | null;
  faller: Climb | null;
}

function leader(totals: Map<string, number>): Leader | null {
  let value: number | null = null;
  let ids: string[] = [];
  for (const [id, v] of totals) {
    if (value === null || v > value) {
      value = v;
      ids = [id];
    } else if (v === value) {
      ids.push(id);
    }
  }
  if (value === null || value <= 0) return null;
  return { ids: ids.sort(), value };
}

export function weeklyStats(all: DatedReport[], since: number, until = Infinity): WeeklyStats {
  const upTo = all.filter((r) => r.createdAt < until);
  const window = upTo.filter((r) => r.createdAt >= since);
  const before = upTo.filter((r) => r.createdAt < since);

  const games = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const bump = (map: Map<string, number>, id: string, n: number) => map.set(id, (map.get(id) ?? 0) + n);

  let totalGames = 0;
  for (const r of window) {
    totalGames += r.winsA + r.winsB;
    for (const id of r.sideA) {
      bump(games, id, r.winsA + r.winsB);
      bump(wins, id, r.winsA);
      bump(losses, id, r.winsB);
    }
    for (const id of r.sideB) {
      bump(games, id, r.winsA + r.winsB);
      bump(wins, id, r.winsB);
      bump(losses, id, r.winsA);
    }
  }

  let riser: Climb | null = null;
  let faller: Climb | null = null;
  if (before.length > 0 && window.length > 0) {
    const was = new Map(computeLeaderboard(before).rows.map((r) => [r.id, r.rank]));
    for (const row of computeLeaderboard(upTo).rows) {
      const from = was.get(row.id);
      if (from === undefined) continue;
      const shift = from - row.rank;
      if (shift > 0 && (!riser || shift > riser.from - riser.to)) riser = { id: row.id, from, to: row.rank };
      if (shift < 0 && (!faller || shift < faller.from - faller.to)) faller = { id: row.id, from, to: row.rank };
    }
  }

  return {
    reports: window.length,
    games: totalGames,
    mostGames: leader(games),
    mostWins: leader(wins),
    mostLosses: leader(losses),
    riser,
    faller,
  };
}
