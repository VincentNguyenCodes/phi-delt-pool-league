import { aggregate, computeLeaderboard, type Report } from "./rating.ts";

export interface DatedReport extends Report {
  createdAt: number;
}

export interface Leader {
  ids: string[];
  value: number;
}

export interface FormLeader {
  ids: string[];
  wins: number;
  losses: number;
}

export interface Duo {
  ids: string[];
  wins: number;
  matchups: number;
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
  hottest: FormLeader | null;
  coldest: FormLeader | null;
  bestDuo: Duo | null;
  riser: Climb | null;
  faller: Climb | null;
}

const MIN_FORM_GAMES = 4;
const MIN_DUO_MATCHUPS = 2;

function leader(totals: Map<string, number>, best: "max" | "min" = "max"): Leader | null {
  let value: number | null = null;
  let ids: string[] = [];
  for (const [id, v] of totals) {
    if (value === null || (best === "max" ? v > value : v < value)) {
      value = v;
      ids = [id];
    } else if (v === value) {
      ids.push(id);
    }
  }
  if (value === null || value <= 0) return null;
  return { ids: ids.sort(), value };
}

export function weeklyStats(all: DatedReport[], since: number): WeeklyStats {
  const window = all.filter((r) => r.createdAt >= since);
  const before = all.filter((r) => r.createdAt < since);

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

  const rated = [...games.keys()].filter((id) => (games.get(id) ?? 0) >= MIN_FORM_GAMES);
  const rate = (id: string) => (wins.get(id) ?? 0) / (games.get(id) ?? 1);
  const form = (pick: "max" | "min"): FormLeader | null => {
    if (rated.length === 0) return null;
    const target = pick === "max" ? Math.max(...rated.map(rate)) : Math.min(...rated.map(rate));
    const ids = rated.filter((id) => rate(id) === target).sort();
    return { ids, wins: wins.get(ids[0]) ?? 0, losses: losses.get(ids[0]) ?? 0 };
  };
  const hottest = form("max");
  const coldest = form("min");
  const sameForm = hottest && coldest && hottest.ids.join() === coldest.ids.join();

  const teams = new Map<string, Duo>();
  for (const m of aggregate(window.filter((r) => r.format === "doubles"))) {
    for (const [side, own, other] of [
      [m.sideA, m.a, m.b],
      [m.sideB, m.b, m.a],
    ] as [string[], number, number][]) {
      const key = [...side].sort().join("|");
      const duo = teams.get(key) ?? { ids: [...side].sort(), wins: 0, matchups: 0 };
      duo.matchups++;
      if (own > other) duo.wins++;
      teams.set(key, duo);
    }
  }
  const duos = [...teams.values()]
    .filter((d) => d.matchups >= MIN_DUO_MATCHUPS && d.wins > 0)
    .sort((a, b) => b.wins / b.matchups - a.wins / a.matchups || b.matchups - a.matchups);

  let riser: Climb | null = null;
  let faller: Climb | null = null;
  if (before.length > 0 && window.length > 0) {
    const was = new Map(computeLeaderboard(before).rows.map((r) => [r.id, r.rank]));
    for (const row of computeLeaderboard(all).rows) {
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
    hottest,
    coldest: sameForm ? null : coldest,
    bestDuo: duos[0] ?? null,
    riser,
    faller,
  };
}

export function formatRecap(stats: WeeklyStats, names: Map<string, string>, label: string): string {
  const name = (id: string) => names.get(id) ?? id;
  const list = (ids: string[]) => ids.map(name).join(", ");
  const lines = [`PHI DELT POOL: WEEKLY RECAP (${label})`];
  if (stats.reports === 0) {
    lines.push("No games logged this week. Get to the table.");
    return lines.join("\n");
  }
  lines.push(`${stats.games} games across ${stats.reports} reports.`);
  if (stats.mostGames) lines.push(`Most games played: ${list(stats.mostGames.ids)} (${stats.mostGames.value})`);
  if (stats.mostWins) lines.push(`Most wins: ${list(stats.mostWins.ids)} (${stats.mostWins.value})`);
  if (stats.mostLosses) lines.push(`Most losses: ${list(stats.mostLosses.ids)} (${stats.mostLosses.value})`);
  if (stats.hottest) lines.push(`Hottest: ${list(stats.hottest.ids)} (${stats.hottest.wins}-${stats.hottest.losses})`);
  if (stats.coldest) lines.push(`Coldest: ${list(stats.coldest.ids)} (${stats.coldest.wins}-${stats.coldest.losses})`);
  if (stats.bestDuo) {
    lines.push(`Best duo: ${stats.bestDuo.ids.map(name).join(" + ")} (${stats.bestDuo.wins}-${stats.bestDuo.matchups - stats.bestDuo.wins})`);
  }
  if (stats.riser) lines.push(`Biggest climb: ${name(stats.riser.id)} (#${stats.riser.from} to #${stats.riser.to})`);
  if (stats.faller) lines.push(`Biggest drop: ${name(stats.faller.id)} (#${stats.faller.from} to #${stats.faller.to})`);
  return lines.join("\n");
}

export function formatPollResults(rows: { name: string; points: number }[], voters: number, week: string): string {
  if (voters === 0) return `Poll ${week}: no votes were cast.`;
  const lines = [`PHI DELT POWER POLL ${week} (${voters} ballots)`];
  rows.slice(0, 5).forEach((r, i) => lines.push(`${i + 1}. ${r.name} (${r.points} pts)`));
  return lines.join("\n");
}
