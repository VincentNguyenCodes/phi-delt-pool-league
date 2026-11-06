import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHandoff } from "../shared/handoff";
import { computeLeaderboard, matchupWeight } from "../shared/rating";

const handoff = parseHandoff(readFileSync("data/phi-delt-pool-website-handoff.md", "utf8"));
const board = computeLeaderboard(handoff.reports);
const byName = new Map(board.rows.map((r) => [r.id, r]));

describe("handoff parsing", () => {
  it("reads every report, standing and record", () => {
    expect(handoff.reports).toHaveLength(193);
    expect(handoff.standings).toHaveLength(39);
    expect(handoff.records).toHaveLength(39);
  });
});

describe("matchup weight", () => {
  it("matches the handoff examples", () => {
    expect(matchupWeight(1, 0)).toBeCloseTo(1.0, 4);
    expect(matchupWeight(2, 0)).toBeCloseTo(1.2, 4);
    expect(matchupWeight(3, 0)).toBeCloseTo(1.3333, 4);
    expect(matchupWeight(5, 0)).toBeCloseTo(1.5, 4);
    expect(matchupWeight(5, 1)).toBeCloseTo(1.2469, 4);
    expect(matchupWeight(3, 2)).toBeCloseTo(1.02, 4);
    expect(matchupWeight(1, 1)).toBeCloseTo(1.0, 4);
  });
});

describe("league totals", () => {
  it("matches players, games and unique matchups", () => {
    expect(board.players).toBe(39);
    expect(board.gamesPlayed).toBe(253);
    expect(board.matchups).toBe(154);
  });
});

describe("rankings", () => {
  it("reproduces the published ranking score and order", () => {
    for (const s of handoff.standings) {
      const row = byName.get(s.name)!;
      expect(row, s.name).toBeDefined();
      expect(row.elo, `${s.name} elo`).toBeCloseTo(s.elo, 0);
      expect(row.rank, `${s.name} rank`).toBe(s.rank);
    }
  });

  it("reproduces skill, singles, doubles and uncertainty", () => {
    for (const s of handoff.standings) {
      const row = byName.get(s.name)!;
      expect(Math.abs(row.skill - s.skill), `${s.name} skill`).toBeLessThan(0.15);
      expect(Math.abs(row.singles - s.singles), `${s.name} singles`).toBeLessThan(0.15);
      expect(Math.abs(row.doubles - s.doubles), `${s.name} doubles`).toBeLessThan(0.15);
      expect(Math.abs(row.uncertainty - s.uncertainty), `${s.name} U`).toBeLessThan(0.15);
    }
  });
});

describe("records", () => {
  it("reproduces unique W-L-T and raw game W-L", () => {
    for (const r of handoff.records) {
      const row = byName.get(r.name)!;
      expect(row.matchups, `${r.name} matchups`).toBe(r.matchups);
      expect([row.wins, row.losses, row.ties], `${r.name} wlt`).toEqual([r.wins, r.losses, r.ties]);
      expect([row.gameWins, row.gameLosses], `${r.name} games`).toEqual([r.gameWins, r.gameLosses]);
    }
  });
});

describe("records by format", () => {
  it("singles and doubles records add up to the overall record", () => {
    for (const row of board.rows) {
      expect(row.singlesRecord.wins + row.doublesRecord.wins, `${row.id} wins`).toBe(row.wins);
      expect(row.singlesRecord.losses + row.doublesRecord.losses, `${row.id} losses`).toBe(row.losses);
      expect(row.singlesRecord.ties + row.doublesRecord.ties, `${row.id} ties`).toBe(row.ties);
    }
  });

  it("splits a small ledger correctly", () => {
    const small = computeLeaderboard([
      { id: 1, format: "singles", sideA: ["a"], sideB: ["b"], winsA: 2, winsB: 0 },
      { id: 2, format: "singles", sideA: ["a"], sideB: ["c"], winsA: 1, winsB: 1 },
      { id: 3, format: "doubles", sideA: ["a", "b"], sideB: ["c", "d"], winsA: 0, winsB: 1 },
    ]);
    const row = (id: string) => small.rows.find((r) => r.id === id)!;
    expect(row("a").singlesRecord).toEqual({ wins: 1, losses: 0, ties: 1 });
    expect(row("a").doublesRecord).toEqual({ wins: 0, losses: 1, ties: 0 });
    expect(row("d").singlesRecord).toEqual({ wins: 0, losses: 0, ties: 0 });
    expect(row("d").doublesRecord).toEqual({ wins: 1, losses: 0, ties: 0 });
    expect(row("a").gameWins).toBe(3);
    expect(row("a").gameLosses).toBe(2);
  });
});
