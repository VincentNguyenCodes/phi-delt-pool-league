import { canonicalName } from "./aliases";
import type { Format } from "./rating";

export interface HandoffReport {
  id: number;
  format: Format;
  sideA: string[];
  sideB: string[];
  winsA: number;
  winsB: number;
}

export interface HandoffStanding {
  rank: number;
  name: string;
  elo: number;
  skill: number;
  singles: number;
  doubles: number;
  uncertainty: number;
}

export interface HandoffRecord {
  name: string;
  matchups: number;
  wins: number;
  losses: number;
  ties: number;
  gameWins: number;
  gameLosses: number;
}

export interface Handoff {
  reports: HandoffReport[];
  standings: HandoffStanding[];
  records: HandoffRecord[];
}

const cells = (line: string) =>
  line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

export function parseHandoff(markdown: string): Handoff {
  const reports: HandoffReport[] = [];
  const standings: HandoffStanding[] = [];
  const records: HandoffRecord[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    const c = cells(line);
    if (c.length === 6 && /^\d+$/.test(c[0]) && /^(Singles|Doubles)$/.test(c[1])) {
      reports.push({
        id: Number(c[0]),
        format: c[1].toLowerCase() as Format,
        sideA: c[2].split("/").map(canonicalName),
        sideB: c[3].split("/").map(canonicalName),
        winsA: Number(c[4]),
        winsB: Number(c[5]),
      });
    } else if (c.length === 8 && /^\d+$/.test(c[0])) {
      standings.push({
        rank: Number(c[0]),
        name: canonicalName(c[1]),
        elo: Number(c[2]),
        skill: Number(c[3]),
        singles: Number(c[4]),
        doubles: Number(c[5]),
        uncertainty: Number(c[6]),
      });
    } else if (c.length === 4 && /^\d+$/.test(c[1]) && /^\d+-\d+-\d+$/.test(c[2])) {
      const [w, l, t] = c[2].split("-").map(Number);
      const [gw, gl] = c[3].split("-").map(Number);
      records.push({
        name: canonicalName(c[0]),
        matchups: Number(c[1]),
        wins: w,
        losses: l,
        ties: t,
        gameWins: gw,
        gameLosses: gl,
      });
    }
  }
  return { reports, standings, records };
}
