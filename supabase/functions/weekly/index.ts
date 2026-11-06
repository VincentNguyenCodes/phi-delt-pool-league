import { postToGroupMe } from "../../../shared/groupme.ts";
import { pollWeek, tally } from "../../../shared/poll.ts";
import { formatPollResults, formatRecap, weeklyStats } from "../../../shared/stats.ts";
import { adminClient, corsHeaders, json, loadNames, loadReports } from "../_shared.ts";

const DAY = 86400000;

const short = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const botId = Deno.env.get("GROUPME_BOT_ID");
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  if (!dry && !botId) return json({ error: "GROUPME_BOT_ID is not set" }, 500);

  const db = adminClient();
  const now = Date.now();
  const names = await loadNames(db);
  const reports = await loadReports(db);
  const messages: string[] = [];

  const lastWeek = pollWeek(new Date(now - 7 * DAY));
  const votes = await db.from("poll_votes").select("picks").eq("week", lastWeek);
  if (votes.error) return json({ error: votes.error.message }, 500);
  if (votes.data.length > 0) {
    const rows = tally(votes.data.map((v) => v.picks as number[])).map((t) => ({
      name: names.get(String(t.id)) ?? String(t.id),
      points: t.points,
    }));
    messages.push(formatPollResults(rows, votes.data.length, lastWeek));
  }

  const since = now - 7 * DAY;
  messages.push(formatRecap(weeklyStats(reports, since), names, `${short(since)} to ${short(now)}`));
  messages.push(`New weekly power poll is open. Vote your top 5:\n${siteUrl}/#/poll`);

  if (!dry) {
    for (const text of messages) await postToGroupMe(botId!, text);
  }
  return json({ posted: !dry, messages });
});
