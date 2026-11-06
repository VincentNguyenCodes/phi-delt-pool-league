export type Format = "singles" | "doubles";

export interface Report {
  id: number;
  format: Format;
  sideA: string[];
  sideB: string[];
  winsA: number;
  winsB: number;
}

export interface Matchup {
  format: Format;
  sideA: string[];
  sideB: string[];
  a: number;
  b: number;
}

export interface Row {
  id: string;
  rank: number;
  elo: number;
  skill: number;
  singles: number;
  doubles: number;
  uncertainty: number;
  wins: number;
  losses: number;
  ties: number;
  gameWins: number;
  gameLosses: number;
  matchups: number;
}

export interface Leaderboard {
  rows: Row[];
  gamesPlayed: number;
  players: number;
  matchups: number;
}

export interface Move {
  id: string;
  rankBefore: number | null;
  rankAfter: number;
  eloBefore: number | null;
  eloAfter: number;
}

export const REFERENCE = 928.6;
const PRIOR_SD = 200;
const PARTNER_SD = 150;
const K = Math.LN10 / 400;

export function matchupWeight(a: number, b: number): number {
  const n = a + b;
  if (n === 0) return 1;
  const lead = (a - b) / n;
  return 1 + ((n - 1) / (n + 3)) * lead * lead;
}

export function aggregate(reports: Report[]): Matchup[] {
  const map = new Map<string, Matchup>();
  for (const r of reports) {
    let sideA = [...r.sideA].sort();
    let sideB = [...r.sideB].sort();
    let a = r.winsA;
    let b = r.winsB;
    if (sideA.join("|") > sideB.join("|")) {
      [sideA, sideB] = [sideB, sideA];
      [a, b] = [b, a];
    }
    const key = `${r.format}:${sideA.join("|")}:${sideB.join("|")}`;
    const existing = map.get(key);
    if (existing) {
      existing.a += a;
      existing.b += b;
    } else {
      map.set(key, { format: r.format, sideA, sideB, a, b });
    }
  }
  return [...map.values()];
}

function softplus(z: number): number {
  return Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
}

function logistic(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function cholesky(h: Float64Array, n: number): Float64Array {
  const l = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = h[i * n + j];
      for (let k = 0; k < j; k++) sum -= l[i * n + k] * l[j * n + k];
      if (i === j) {
        l[i * n + i] = Math.sqrt(sum);
      } else {
        l[i * n + j] = sum / l[j * n + j];
      }
    }
  }
  return l;
}

function choleskySolve(l: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= l[i * n + k] * y[k];
    y[i] = sum / l[i * n + i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= l[k * n + i] * x[k];
    x[i] = sum / l[i * n + i];
  }
  return x;
}

interface Row0 {
  idx: number[];
  coef: number[];
  weight: number;
  y: number;
}

export function computeLeaderboard(reports: Report[]): Leaderboard {
  const matchups = aggregate(reports);
  const ids = new Set<string>();
  for (const m of matchups) {
    for (const p of m.sideA) ids.add(p);
    for (const p of m.sideB) ids.add(p);
  }
  const players = [...ids].sort();
  const n = players.length;
  const sIdx = new Map<string, number>();
  const dIdx = new Map<string, number>();
  players.forEach((p, i) => {
    sIdx.set(p, i);
    dIdx.set(p, n + i);
  });
  const cIdx = new Map<string, number>();
  const pairKey = (side: string[]) => [...side].sort().join("|");
  let size = 2 * n;
  for (const m of matchups) {
    if (m.format !== "doubles") continue;
    for (const side of [m.sideA, m.sideB]) {
      const key = pairKey(side);
      if (!cIdx.has(key)) cIdx.set(key, size++);
    }
  }

  const rows: Row0[] = matchups.map((m) => {
    const idx: number[] = [];
    const coef: number[] = [];
    const add = (i: number, c: number) => {
      idx.push(i);
      coef.push(c * K);
    };
    if (m.format === "singles") {
      add(sIdx.get(m.sideA[0])!, PRIOR_SD);
      add(sIdx.get(m.sideB[0])!, -PRIOR_SD);
    } else {
      for (const p of m.sideA) add(dIdx.get(p)!, PRIOR_SD / 2);
      for (const p of m.sideB) add(dIdx.get(p)!, -PRIOR_SD / 2);
      add(cIdx.get(pairKey(m.sideA))!, PARTNER_SD);
      add(cIdx.get(pairKey(m.sideB))!, -PARTNER_SD);
    }
    const y = m.a > m.b ? 1 : m.a < m.b ? 0 : 0.5;
    return { idx, coef, weight: matchupWeight(m.a, m.b), y };
  });

  const margin = (r: Row0, x: Float64Array) => {
    let z = 0;
    for (let k = 0; k < r.idx.length; k++) z += r.coef[k] * x[r.idx[k]];
    return z;
  };

  const objective = (x: Float64Array) => {
    let f = 0;
    for (let i = 0; i < size; i++) f += 0.5 * x[i] * x[i];
    for (const r of rows) {
      const z = margin(r, x);
      f += r.weight * (softplus(z) - r.y * z);
    }
    return f;
  };

  const gradient = (x: Float64Array) => {
    const g = Float64Array.from(x);
    for (const r of rows) {
      const p = logistic(margin(r, x));
      const s = r.weight * (p - r.y);
      for (let k = 0; k < r.idx.length; k++) g[r.idx[k]] += s * r.coef[k];
    }
    return g;
  };

  const hessian = (x: Float64Array) => {
    const h = new Float64Array(size * size);
    for (let i = 0; i < size; i++) h[i * size + i] = 1;
    for (const r of rows) {
      const p = logistic(margin(r, x));
      const w = r.weight * p * (1 - p);
      for (let a = 0; a < r.idx.length; a++) {
        for (let b = 0; b < r.idx.length; b++) {
          h[r.idx[a] * size + r.idx[b]] += w * r.coef[a] * r.coef[b];
        }
      }
    }
    return h;
  };

  let x = new Float64Array(size);
  for (let iter = 0; iter < 100; iter++) {
    const g = gradient(x);
    let norm = 0;
    for (let i = 0; i < size; i++) norm += g[i] * g[i];
    if (Math.sqrt(norm) < 1e-10) break;
    const d = choleskySolve(cholesky(hessian(x), size), size, g);
    let slope = 0;
    for (let i = 0; i < size; i++) slope += g[i] * d[i];
    const f0 = objective(x);
    let t = 1;
    let next = x;
    for (let tries = 0; tries < 40; tries++) {
      next = new Float64Array(size);
      for (let i = 0; i < size; i++) next[i] = x[i] - t * d[i];
      if (objective(next) <= f0 - 1e-4 * t * slope) break;
      t /= 2;
    }
    x = next;
  }

  const l = cholesky(hessian(x), size);
  const variance = (i: number) => {
    const e = new Float64Array(size);
    e[i] = 1;
    return choleskySolve(l, size, e)[i] * PRIOR_SD * PRIOR_SD;
  };

  const stats = new Map<string, Row>();
  players.forEach((p) => {
    const s = REFERENCE + PRIOR_SD * x[sIdx.get(p)!];
    const d = REFERENCE + PRIOR_SD * x[dIdx.get(p)!];
    const u = Math.sqrt((4 / 9) * variance(sIdx.get(p)!) + (1 / 9) * variance(dIdx.get(p)!));
    const skill = (2 * s + d) / 3;
    stats.set(p, {
      id: p,
      rank: 0,
      elo: skill - 0.5 * u,
      skill,
      singles: s,
      doubles: d,
      uncertainty: u,
      wins: 0,
      losses: 0,
      ties: 0,
      gameWins: 0,
      gameLosses: 0,
      matchups: 0,
    });
  });

  let gamesPlayed = 0;
  for (const m of matchups) {
    gamesPlayed += m.a + m.b;
    const outcome = m.a > m.b ? "A" : m.a < m.b ? "B" : "T";
    const settle = (side: string[], won: boolean, tied: boolean, gw: number, gl: number) => {
      for (const p of side) {
        const row = stats.get(p)!;
        row.matchups++;
        row.gameWins += gw;
        row.gameLosses += gl;
        if (tied) row.ties++;
        else if (won) row.wins++;
        else row.losses++;
      }
    };
    settle(m.sideA, outcome === "A", outcome === "T", m.a, m.b);
    settle(m.sideB, outcome === "B", outcome === "T", m.b, m.a);
  }

  const sorted = [...stats.values()].sort((p, q) => q.elo - p.elo || (p.id < q.id ? -1 : 1));
  sorted.forEach((row, i) => {
    row.rank = i + 1;
  });

  return { rows: sorted, gamesPlayed, players: n, matchups: matchups.length };
}

export function diffLeaderboards(before: Leaderboard, after: Leaderboard, ids: string[]): Move[] {
  const prev = new Map(before.rows.map((r) => [r.id, r]));
  const moves: Move[] = [];
  for (const row of after.rows) {
    if (!ids.includes(row.id)) continue;
    const old = prev.get(row.id);
    moves.push({
      id: row.id,
      rankBefore: old ? old.rank : null,
      rankAfter: row.rank,
      eloBefore: old ? old.elo : null,
      eloAfter: row.elo,
    });
  }
  return moves;
}
