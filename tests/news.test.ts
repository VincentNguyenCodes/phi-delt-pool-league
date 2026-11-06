import { describe, expect, it } from "vitest";
import { buildIssue } from "../shared/news";
import type { DatedReport } from "../shared/stats";

const day = 86400000;
const now = Date.parse("2026-11-09T19:30:00Z");
const names = new Map(["Pi", "Kartman", "Frosty", "Lev", "Drew", "AK", "Sir", "Roman", "Dih", "John", "Soren", "Send"].map((n, i) => [String(i + 1), n]));

let nextId = 1;
const single = (a: number, b: number, wa: number, wb: number, ago: number): DatedReport => ({
  id: nextId++,
  format: "singles",
  sideA: [String(a)],
  sideB: [String(b)],
  winsA: wa,
  winsB: wb,
  createdAt: now - ago * day,
});
const double = (a: number[], b: number[], wa: number, wb: number, ago: number): DatedReport => ({
  id: nextId++,
  format: "doubles",
  sideA: a.map(String),
  sideB: b.map(String),
  winsA: wa,
  winsB: wb,
  createdAt: now - ago * day,
});

const reports: DatedReport[] = [
  single(1, 2, 1, 0, 30),
  single(3, 4, 1, 0, 30),
  single(1, 6, 3, 0, 3),
  single(1, 6, 1, 0, 3),
  single(7, 6, 2, 0, 2),
  single(7, 8, 1, 0, 2),
  double([1, 2], [3, 4], 1, 0, 20),
  double([1, 2], [5, 6], 1, 0, 3),
  double([1, 2], [9, 10], 1, 0, 3),
  double([1, 2], [11, 12], 1, 0, 2),
  double([3, 4], [5, 6], 1, 0, 2),
];

const base = {
  names,
  since: now - 7 * day,
  until: now,
  weekNumber: 2,
  weekStart: "2026-11-09",
  dateLabel: "NOV 09, 2026",
  pollId: "2026-11-07",
};

describe("weekly issue", () => {
  const votes = [
    [1, 2, 3, 4, 5],
    [2, 1, 3, 4, 6],
    [1, 3, 2, 7, 8],
    [1, 2, 3, 9, 10],
    [11, 12, 1, 2, 3],
  ];
  const issue = buildIssue({ ...base, reports, votes });

  it("splits the poll into a top 5 and the next 5", () => {
    expect(issue.poll.ballots).toBe(5);
    expect(issue.poll.top).toHaveLength(5);
    expect(issue.poll.top[0].name).toBe("Pi");
    expect(issue.poll.others.length).toBeGreaterThan(0);
    expect(issue.poll.others.length).toBeLessThanOrEqual(5);
  });

  it("builds the six chalk talk cards and six weekly cards", () => {
    expect(issue.cards.map((c) => c.key)).toEqual(["hottest", "coldest", "duos", "toughest", "carried", "edge"]);
    expect(issue.weekCards).toHaveLength(6);
  });

  it("finds the clearest singles edge", () => {
    const edge = issue.cards.find((c) => c.key === "edge")!;
    expect(edge.headline).toBe("Pi OVER AK / 4-0");
    expect(edge.detail).toContain("1.429x");
  });

  it("counts only the weekly window", () => {
    const games = issue.weekCards.find((c) => c.key === "games")!;
    expect(games.headline).toBe("11 GAMES");
  });

  it("never uses em dashes", () => {
    expect(JSON.stringify(issue)).not.toContain("—");
  });
});

describe("quiet weeks", () => {
  it("falls back gracefully with no games and no votes", () => {
    const issue = buildIssue({ ...base, reports: [], votes: [] });
    expect(issue.poll.top).toHaveLength(0);
    expect(issue.cards.every((c) => c.headline === "NOT ENOUGH DATA")).toBe(true);
    expect(issue.weekCards[0].headline).toBe("0 GAMES");
  });
});
