import { buildAnnouncement } from "../../../shared/format.ts";
import { postToGroupMe } from "../../../shared/groupme.ts";
import { computeLeaderboard, diffLeaderboards } from "../../../shared/rating.ts";
import { adminClient, corsHeaders, json, loadNames, loadReports } from "../_shared.ts";

const HOURLY_LIMIT = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const botId = Deno.env.get("GROUPME_BOT_ID");
  if (!botId) return json({ error: "GROUPME_BOT_ID is not set" }, 500);

  let reportId: number;
  try {
    reportId = Number((await req.json()).report_id);
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  if (!Number.isInteger(reportId) || reportId < 1) return json({ error: "invalid report_id" }, 400);

  const db = adminClient();

  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await db
    .from("reports")
    .select("id", { count: "exact", head: true })
    .not("announced_at", "is", null)
    .gte("created_at", hourAgo);
  if (recent.error) return json({ error: recent.error.message }, 500);
  if ((recent.count ?? 0) >= HOURLY_LIMIT) return json({ skipped: "rate limited" }, 429);

  const claimed = await db
    .from("reports")
    .update({ announced_at: new Date().toISOString() })
    .eq("id", reportId)
    .is("announced_at", null)
    .select("id, format, side_a, side_b, wins_a, wins_b");
  if (claimed.error) return json({ error: claimed.error.message }, 500);
  if (claimed.data.length === 0) return json({ skipped: "already announced or missing" }, 409);

  try {
    const report = claimed.data[0];
    const names = await loadNames(db);
    const reports = await loadReports(db, reportId);
    const before = computeLeaderboard(reports.filter((r) => r.id !== reportId));
    const after = computeLeaderboard(reports);
    const sideA = (report.side_a as number[]).map(String);
    const sideB = (report.side_b as number[]).map(String);
    const moves = diffLeaderboards(before, after, [...sideA, ...sideB]);
    const label = (ids: string[]) => ids.map((id) => names.get(id) ?? id);
    const text = buildAnnouncement(
      label(sideA),
      label(sideB),
      report.wins_a,
      report.wins_b,
      moves,
      names,
    );
    await postToGroupMe(botId, text);
    return json({ posted: true });
  } catch (e) {
    await db.from("reports").update({ announced_at: null }).eq("id", reportId);
    return json({ error: e instanceof Error ? e.message : "failed" }, 502);
  }
});
