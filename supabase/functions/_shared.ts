import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Report } from "../../shared/rating.ts";
import type { DatedReport } from "../../shared/stats.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function loadNames(db: SupabaseClient): Promise<Map<string, string>> {
  const res = await db.from("players").select("id, name");
  if (res.error) throw res.error;
  return new Map(res.data.map((p) => [String(p.id), p.name as string]));
}

export async function loadReports(db: SupabaseClient, upToId?: number): Promise<DatedReport[]> {
  const out: DatedReport[] = [];
  for (let from = 0; ; from += 1000) {
    let query = db
      .from("reports")
      .select("id, format, side_a, side_b, wins_a, wins_b, created_at")
      .order("id")
      .range(from, from + 999);
    if (upToId !== undefined) query = query.lte("id", upToId);
    const res = await query;
    if (res.error) throw res.error;
    for (const r of res.data) {
      out.push({
        id: r.id,
        format: r.format,
        sideA: (r.side_a as number[]).map(String),
        sideB: (r.side_b as number[]).map(String),
        winsA: r.wins_a,
        winsB: r.wins_b,
        createdAt: Date.parse(r.created_at),
      });
    }
    if (res.data.length < 1000) break;
  }
  return out;
}

export type { Report };
