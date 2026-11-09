import { postToGroupMe } from "../../../shared/groupme.ts";
import { buildIssue, dateLabel } from "../../../shared/news.ts";
import {
  addDays,
  dueTasks,
  mondayOf,
  pacificInstant,
  pacificParts,
  pollIdFor,
  weekNumber,
  ymd,
  type Task,
} from "../../../shared/schedule.ts";
import { adminClient, corsHeaders, json, loadNames, loadReports } from "../_shared.ts";

const TASKS: Task[] = ["poll-open", "poll-closing", "issue"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const forced = url.searchParams.get("task") as Task | null;
  if (forced && !TASKS.includes(forced)) return json({ error: "unknown task" }, 400);

  const botId = Deno.env.get("GROUPME_BOT_ID");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  if (!dry && !botId) return json({ error: "GROUPME_BOT_ID is not set" }, 500);

  const now = new Date();
  const p = pacificParts(now);
  const monday = mondayOf(p);
  const weekend = pollIdFor(p) ?? ymd(addDays(monday, -2));

  const due = forced
    ? [{ task: forced, key: forced === "issue" ? `issue:${ymd(monday)}` : `${forced}:${weekend}` }]
    : dueTasks(p);

  const db = adminClient();
  const results: Record<string, unknown>[] = [];

  for (const { task, key } of due) {
    if (!dry && !forced) {
      const claim = await db.from("bot_posts").insert({ key });
      if (claim.error) {
        results.push({ task, skipped: claim.error.code === "23505" ? "already done" : claim.error.message });
        continue;
      }
    }
    try {
      let message: string;
      if (task === "poll-open") {
        message = `Phi Delt Power Poll is open! Vote your top 5 before Sunday 11:59pm PT: ${siteUrl}/#/poll`;
      } else if (task === "poll-closing") {
        message = `Last call: the Phi Delt Power Poll closes at midnight tonight. Vote your top 5: ${siteUrl}/#/poll`;
      } else {
        const pollId = ymd(addDays(monday, -2));
        const votes = await db.from("poll_votes").select("picks").eq("poll", pollId);
        if (votes.error) throw votes.error;
        const issue = buildIssue({
          reports: await loadReports(db),
          names: await loadNames(db),
          since: pacificInstant(addDays(monday, -7)).getTime(),
          until: pacificInstant(monday).getTime(),
          weekNumber: weekNumber(monday),
          weekStart: ymd(monday),
          dateLabel: dateLabel(monday.year, monday.month, monday.day),
          pollId,
          votes: votes.data.map((v) => v.picks as number[]),
        });
        if (!dry) {
          const saved = await db
            .from("issues")
            .upsert({ week_start: issue.weekStart, payload: issue, published_at: now.toISOString() }, { onConflict: "week_start" });
          if (saved.error) throw saved.error;
        }
        message = `Weekly AP poll and stats have dropped, check em out here: ${siteUrl}/#/news`;
        results.push({ task, key, message, issue: dry ? issue : undefined, posted: !dry });
        if (!dry) await postToGroupMe(botId!, message);
        continue;
      }
      results.push({ task, key, message, posted: !dry });
      if (!dry) await postToGroupMe(botId!, message);
    } catch (e) {
      if (!dry && !forced) await db.from("bot_posts").delete().eq("key", key);
      results.push({ task, error: (e as { message?: string }).message ?? String(e) });
    }
  }

  return json({ dry, pacific: p, due: due.map((d) => d.key), results });
});
