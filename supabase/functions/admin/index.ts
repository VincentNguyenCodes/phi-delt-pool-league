import { safeEqual, type AdminGame } from "../../../shared/admin.ts";
import { summarize } from "../../../shared/projectStats.ts";
import { adminClient, allRows, corsHeaders, json, loadNames, loadReports } from "../_shared.ts";

const SEEDED_PLAYERS = 39;
const LIVE_SINCE = Date.parse("2026-06-01T00:00:00Z");
const GAME_LIST_LIMIT = 300;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const key = Deno.env.get("ADMIN_KEY");
  if (!key) return json({ error: "ADMIN_KEY is not set" }, 500);
  if (!safeEqual(req.headers.get("x-admin-key") ?? "", key)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return json({ error: "unauthorized" }, 401);
  }

  let body: { action?: string; id?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }

  const db = adminClient();

  try {
    if (body.action === "check") return json({ ok: true });

    if (body.action === "stats") {
      const reports = await loadReports(db);
      const players = await db.from("players").select("id", { count: "exact", head: true });
      const votes = await allRows<{ poll: string; voter_id: number }>(db, "poll_votes", "poll, voter_id");
      const visits = await allRows<{ visitor: string; created_at: string }>(db, "visits", "visitor, created_at");
      const issues = await db.from("issues").select("id", { count: "exact", head: true });
      const botPosts = await db.from("bot_posts").select("key", { count: "exact", head: true });
      const announced = await db
        .from("reports")
        .select("id", { count: "exact", head: true })
        .not("announced_at", "is", null)
        .gte("created_at", new Date(LIVE_SINCE).toISOString());
      const stats = summarize({
        now: Date.now(),
        liveSince: LIVE_SINCE,
        seededPlayers: SEEDED_PLAYERS,
        reports,
        playerCount: players.count ?? 0,
        votes: votes.map((v) => ({ poll: v.poll, voterId: v.voter_id })),
        visits: visits.map((v) => ({ visitor: v.visitor, createdAt: Date.parse(v.created_at) })),
        issues: issues.count ?? 0,
        botPosts: botPosts.count ?? 0,
        announcedLive: announced.count ?? 0,
      });
      return json({ stats });
    }

    if (body.action === "games") {
      const names = await loadNames(db);
      const res = await db
        .from("reports")
        .select("id, format, side_a, side_b, wins_a, wins_b, created_at, announced_at")
        .order("id", { ascending: false })
        .limit(GAME_LIST_LIMIT);
      if (res.error) throw res.error;
      const label = (ids: number[]) => ids.map((id) => names.get(String(id)) ?? String(id));
      const games: AdminGame[] = res.data.map((r) => ({
        id: r.id,
        format: r.format,
        sideA: label(r.side_a as number[]),
        sideB: label(r.side_b as number[]),
        winsA: r.wins_a,
        winsB: r.wins_b,
        createdAt: r.created_at,
        announcedAt: r.announced_at,
      }));
      return json({ games });
    }

    if (body.action === "delete_game") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) return json({ error: "invalid id" }, 400);
      const res = await db.from("reports").delete().eq("id", id).select("id");
      if (res.error) throw res.error;
      if (res.data.length === 0) return json({ error: "game not found" }, 404);
      return json({ deleted: id });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as { message?: string }).message ?? "failed" }, 500);
  }
});
