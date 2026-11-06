import { describe, expect, it } from "vitest";
import { summarize } from "../shared/projectStats";

const day = 86400000;
const now = Date.parse("2026-11-20T12:00:00Z");
const liveSince = Date.parse("2026-06-01T00:00:00Z");

const report = (id: number, a: string, b: string, wa: number, wb: number, createdAt: number) => ({
  id,
  format: "singles" as const,
  sideA: [a],
  sideB: [b],
  winsA: wa,
  winsB: wb,
  createdAt,
});

const input = {
  now,
  liveSince,
  seededPlayers: 2,
  reports: [
    report(1, "1", "2", 1, 0, Date.parse("2026-01-01T00:00:00Z")),
    report(2, "1", "3", 3, 1, now - 5 * day),
    report(3, "2", "3", 1, 0, now - 2 * day),
  ],
  playerCount: 4,
  votes: [
    { poll: "2026-11-14", voterId: 1 },
    { poll: "2026-11-14", voterId: 2 },
    { poll: "2026-11-14", voterId: 3 },
    { poll: "2026-11-21", voterId: 1 },
  ],
  visits: [
    { visitor: "aaaaaaaa", createdAt: now - 3 * day },
    { visitor: "bbbbbbbb", createdAt: now - 3 * day },
    { visitor: "aaaaaaaa", createdAt: now - 2 * day },
    { visitor: "cccccccc", createdAt: now - 1 * day },
  ],
  issues: 2,
  botPosts: 6,
  announcedLive: 2,
};

describe("project stats", () => {
  const s = summarize(input);

  it("separates all-time games from games logged on the site", () => {
    expect(s.gamesAllTime).toBe(1 + 4 + 1);
    expect(s.reportsAllTime).toBe(3);
    expect(s.gamesLive).toBe(5);
    expect(s.reportsLive).toBe(2);
    expect(s.playersWhoPlayedLive).toBe(3);
  });

  it("counts players added after the seed", () => {
    expect(s.playersAdded).toBe(2);
    expect(s.playersOnLadder).toBe(3);
  });

  it("counts polls, ballots and unique voters", () => {
    expect(s.polls).toBe(2);
    expect(s.ballots).toBe(4);
    expect(s.uniqueVoters).toBe(3);
  });

  it("counts visitors and daily traffic", () => {
    expect(s.uniqueVisitors).toBe(3);
    expect(s.totalVisits).toBe(4);
    expect(s.activeDays).toBe(3);
    expect(s.peakDayVisitors).toBe(2);
    expect(s.avgDailyVisitors).toBe(1.3);
  });

  it("adds up bot posts and issues", () => {
    expect(s.groupMePosts).toBe(8);
    expect(s.issues).toBe(2);
    expect(s.daysLive).toBe(5);
  });

  it("handles an empty project", () => {
    const empty = summarize({ ...input, reports: [], votes: [], visits: [], playerCount: 0, botPosts: 0, announcedLive: 0, issues: 0 });
    expect(empty.uniqueVisitors).toBe(0);
    expect(empty.avgDailyVisitors).toBe(0);
    expect(empty.gamesLive).toBe(0);
  });
});
