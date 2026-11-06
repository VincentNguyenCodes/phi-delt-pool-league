import { createClient } from "@supabase/supabase-js";
import { resumeBullets, summarize } from "../shared/projectStats.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const db = createClient(url, key);
const SEEDED_PLAYERS = 39;
const LIVE_SINCE = Date.parse("2026-06-01T00:00:00Z");

async function all<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await db.from(table).select(columns).order("id").range(from, from + 999);
    if (res.error) throw res.error;
    rows.push(...(res.data as unknown as T[]));
    if (res.data.length < 1000) break;
  }
  return rows;
}

const reports = await all<{
  id: number;
  format: "singles" | "doubles";
  side_a: number[];
  side_b: number[];
  wins_a: number;
  wins_b: number;
  created_at: string;
  announced_at: string | null;
}>("reports", "id, format, side_a, side_b, wins_a, wins_b, created_at, announced_at");
const players = await all<{ id: number }>("players", "id");
const votes = await all<{ poll: string; voter_id: number }>("poll_votes", "poll, voter_id");
const visits = await all<{ visitor: string; created_at: string }>("visits", "visitor, created_at");
const issues = await db.from("issues").select("id", { count: "exact", head: true });
const botPosts = await db.from("bot_posts").select("key", { count: "exact", head: true });

const dated = reports.map((r) => ({
  id: r.id,
  format: r.format,
  sideA: r.side_a.map(String),
  sideB: r.side_b.map(String),
  winsA: r.wins_a,
  winsB: r.wins_b,
  createdAt: Date.parse(r.created_at),
}));

const stats = summarize({
  now: Date.now(),
  liveSince: LIVE_SINCE,
  seededPlayers: SEEDED_PLAYERS,
  reports: dated,
  playerCount: players.length,
  votes: votes.map((v) => ({ poll: v.poll, voterId: v.voter_id })),
  visits: visits.map((v) => ({ visitor: v.visitor, createdAt: Date.parse(v.created_at) })),
  issues: issues.count ?? 0,
  botPosts: botPosts.count ?? 0,
  announcedLive: reports.filter((r) => r.announced_at && Date.parse(r.created_at) >= LIVE_SINCE).length,
});

console.log("USAGE");
console.log(`  Days live:                 ${stats.daysLive}`);
console.log(`  Unique visitors:           ${stats.uniqueVisitors}`);
console.log(`  Total daily visits:        ${stats.totalVisits}`);
console.log(`  Days with traffic:         ${stats.activeDays}`);
console.log(`  Avg unique visitors/day:   ${stats.avgDailyVisitors}`);
console.log(`  Peak unique visitors/day:  ${stats.peakDayVisitors}`);
console.log("GAMES AND PLAYERS");
console.log(`  Games tracked (all time):  ${stats.gamesAllTime} in ${stats.reportsAllTime} reports, ${stats.matchupsAllTime} unique matchups`);
console.log(`  Games logged on the site:  ${stats.gamesLive} in ${stats.reportsLive} reports`);
console.log(`  Players on the ladder:     ${stats.playersOnLadder}`);
console.log(`  Players who played live:   ${stats.playersWhoPlayedLive}`);
console.log(`  Players added on the site: ${stats.playersAdded}`);
console.log("POLL AND NEWS");
console.log(`  Polls run:                 ${stats.polls}`);
console.log(`  Ballots cast:              ${stats.ballots} from ${stats.uniqueVoters} unique voters`);
console.log(`  Weekly issues published:   ${stats.issues}`);
console.log(`  GroupMe posts sent:        ${stats.groupMePosts}`);
console.log("");
console.log("DRAFT RESUME BULLETS (edit the numbers and wording to match what you can defend)");
for (const b of resumeBullets(stats)) console.log(`  - ${b}`);
