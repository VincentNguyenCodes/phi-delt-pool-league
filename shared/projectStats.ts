import { computeLeaderboard, type Report } from "./rating.ts";

export interface StatsInput {
  now: number;
  liveSince: number;
  seededPlayers: number;
  reports: (Report & { createdAt: number })[];
  playerCount: number;
  votes: { poll: string; voterId: number }[];
  visits: { visitor: string; createdAt: number }[];
  issues: number;
  botPosts: number;
  announcedLive: number;
}

export interface ProjectStats {
  daysLive: number;
  gamesAllTime: number;
  reportsAllTime: number;
  matchupsAllTime: number;
  playersOnLadder: number;
  gamesLive: number;
  reportsLive: number;
  playersWhoPlayedLive: number;
  playersAdded: number;
  polls: number;
  ballots: number;
  uniqueVoters: number;
  issues: number;
  groupMePosts: number;
  uniqueVisitors: number;
  totalVisits: number;
  activeDays: number;
  peakDayVisitors: number;
  avgDailyVisitors: number;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function summarize(input: StatsInput): ProjectStats {
  const live = input.reports.filter((r) => r.createdAt >= input.liveSince);
  const board = computeLeaderboard(input.reports);
  const firstLive = live.length ? Math.min(...live.map((r) => r.createdAt)) : input.now;

  const perDay = new Map<string, Set<string>>();
  for (const v of input.visits) {
    const d = day(v.createdAt);
    (perDay.get(d) ?? perDay.set(d, new Set()).get(d)!).add(v.visitor);
  }
  const daily = [...perDay.values()].map((s) => s.size);

  return {
    daysLive: Math.max(1, Math.ceil((input.now - firstLive) / 86400000)),
    gamesAllTime: board.gamesPlayed,
    reportsAllTime: input.reports.length,
    matchupsAllTime: board.matchups,
    playersOnLadder: board.players,
    gamesLive: live.reduce((n, r) => n + r.winsA + r.winsB, 0),
    reportsLive: live.length,
    playersWhoPlayedLive: new Set(live.flatMap((r) => [...r.sideA, ...r.sideB])).size,
    playersAdded: Math.max(0, input.playerCount - input.seededPlayers),
    polls: new Set(input.votes.map((v) => v.poll)).size,
    ballots: input.votes.length,
    uniqueVoters: new Set(input.votes.map((v) => v.voterId)).size,
    issues: input.issues,
    groupMePosts: input.announcedLive + input.botPosts,
    uniqueVisitors: new Set(input.visits.map((v) => v.visitor)).size,
    totalVisits: input.visits.length,
    activeDays: perDay.size,
    peakDayVisitors: daily.length ? Math.max(...daily) : 0,
    avgDailyVisitors: daily.length ? Math.round((daily.reduce((a, b) => a + b, 0) / daily.length) * 10) / 10 : 0,
  };
}

export function resumeBullets(s: ProjectStats): string[] {
  const bullets = [
    `Built and shipped a full-stack league ranking web app (React, TypeScript, Supabase Postgres) used by ${s.uniqueVisitors || "N"} unique visitors, tracking ${s.gamesAllTime} games across ${s.playersOnLadder} players.`,
    `Implemented a Bayesian logistic rating model with Laplace-approximated uncertainty, refit from the full game history on every result and verified against a reference dataset.`,
    `Automated league communication with Supabase Edge Functions and scheduled GitHub Actions: a GroupMe bot posts every logged game with rank and rating changes, and publishes a weekly poll and stats issue.`,
    `Designed a time-windowed, private-ballot voting system enforced with Postgres row-level security, collecting ${s.ballots} ballots from ${s.uniqueVoters} voters across ${s.polls} polls.`,
    `Deployed on free-tier infrastructure (GitHub Pages, Supabase, GitHub Actions) with CI that runs the test suite before every release.`,
  ];
  return bullets;
}
