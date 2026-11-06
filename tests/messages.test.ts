import { describe, expect, it } from "vitest";
import { buildAnnouncement, describeMove } from "../shared/format";
import { chunkMessage } from "../shared/groupme";
import { pollWeek, tally } from "../shared/poll";
import { computeLeaderboard, diffLeaderboards, type Report } from "../shared/rating";
import { weeklyStats, type DatedReport } from "../shared/stats";

const names = new Map([
  ["1", "AK"],
  ["2", "Pi"],
  ["3", "Drew"],
  ["4", "Lev"],
]);

const single = (id: number, a: string, b: string, wa: number, wb: number): Report => ({
  id,
  format: "singles",
  sideA: [a],
  sideB: [b],
  winsA: wa,
  winsB: wb,
});

describe("announcement", () => {
  it("describes the game and each move", () => {
    const base = [single(1, "2", "1", 1, 0), single(2, "3", "4", 1, 0)];
    const before = computeLeaderboard(base);
    const next = single(3, "1", "2", 3, 0);
    const after = computeLeaderboard([...base, next]);
    const moves = diffLeaderboards(before, after, ["1", "2"]);
    const text = buildAnnouncement(["AK"], ["Pi"], 3, 0, moves, names);
    expect(text.split("\n")[0]).toBe("AK beat Pi 3-0");
    expect(text).toContain("AK: ");
    expect(text).toContain("Pi: ");
    expect(text).not.toContain("—");
  });

  it("uses the compact move format", () => {
    const down = describeMove("AK", { id: "1", rankBefore: 6, rankAfter: 9, eloBefore: 957.2, eloAfter: 926.0 });
    const up = describeMove("Sir", { id: "2", rankBefore: 22, rankAfter: 12, eloBefore: 845.7, eloAfter: 903.0 });
    const same = describeMove("Pi", { id: "3", rankBefore: 1, rankAfter: 1, eloBefore: 1035.0, eloAfter: 1035.0 });
    expect(down).toBe("AK: #9 (-3), 926.0 (-31.2)");
    expect(up).toBe("Sir: #12 (+10), 903.0 (+57.3)");
    expect(same).toBe("Pi: #1 (0), 1035.0 (0.0)");
  });

  it("marks debuts", () => {
    const line = describeMove("Newbie", { id: "9", rankBefore: null, rankAfter: 7, eloBefore: null, eloAfter: 905.12 });
    expect(line).toBe("Newbie: debuts at #7, 905.1");
  });

  it("reports ties", () => {
    expect(buildAnnouncement(["AK"], ["Pi"], 1, 1, [], names)).toBe("AK tied Pi 1-1");
  });
});

describe("chunking", () => {
  it("splits long text on line boundaries under the limit", () => {
    const text = Array.from({ length: 80 }, (_, i) => `line number ${i} with some padding text`).join("\n");
    const parts = chunkMessage(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(1000);
    expect(parts.join("\n")).toBe(text);
  });
});

describe("poll", () => {
  it("tallies Borda points with first place tiebreak", () => {
    const rows = tally([
      [1, 2, 3, 4, 5],
      [2, 1, 3, 4, 5],
      [2, 3, 1, 4, 5],
    ]);
    expect(rows[0]).toEqual({ id: 2, points: 5 + 4 + 5, places: [2, 1, 0, 0, 0] });
    expect(rows[1].id).toBe(1);
  });

  it("breaks point ties by first place votes, then second place votes", () => {
    const rows = tally([
      [1, 3, 2, 4, 5],
      [3, 4, 2, 5, 1],
    ]);
    expect(rows.map((r) => r.id)).toEqual([3, 1, 4, 2, 5]);
    expect(rows.slice(1, 4).map((r) => r.points)).toEqual([6, 6, 6]);
  });

  it("rolls the poll week over on Sunday", () => {
    expect(pollWeek(new Date("2026-11-07T12:00:00Z"))).not.toBe(pollWeek(new Date("2026-11-08T12:00:00Z")));
    expect(pollWeek(new Date("2026-11-08T12:00:00Z"))).toBe(pollWeek(new Date("2026-11-14T12:00:00Z")));
  });
});

describe("weekly stats", () => {
  const day = 86400000;
  const now = Date.parse("2026-11-08T22:00:00Z");
  const dated = (r: Report, ago: number): DatedReport => ({ ...r, createdAt: now - ago * day });
  const ledger: DatedReport[] = [
    dated(single(1, "1", "2", 1, 0), 20),
    dated(single(2, "3", "4", 1, 0), 20),
    dated(single(3, "2", "1", 1, 0), 2),
    dated(single(4, "2", "1", 1, 0), 2),
    dated(single(5, "2", "3", 2, 0), 1),
    dated(single(6, "1", "4", 1, 0), 1),
  ];

  it("computes leaders for the window", () => {
    const stats = weeklyStats(ledger, now - 7 * day);
    expect(stats.reports).toBe(4);
    expect(stats.games).toBe(5);
    expect(stats.mostWins?.ids).toEqual(["2"]);
    expect(stats.mostWins?.value).toBe(4);
    expect(stats.mostLosses?.value).toBe(2);
  });

  it("handles an empty week", () => {
    const stats = weeklyStats(ledger, now + day);
    expect(stats.reports).toBe(0);
    expect(stats.mostWins).toBeNull();
  });

  it("respects the end of the window", () => {
    const stats = weeklyStats(ledger, now - 7 * day, now - 1.5 * day);
    expect(stats.reports).toBe(2);
  });
});
