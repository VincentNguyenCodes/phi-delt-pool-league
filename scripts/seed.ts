import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseHandoff } from "../shared/handoff";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const db = createClient(url, key);
const handoff = parseHandoff(readFileSync("data/phi-delt-pool-website-handoff.md", "utf8"));

const names = [...new Set(handoff.reports.flatMap((r) => [...r.sideA, ...r.sideB]))].sort();

const existing = await db.from("reports").select("id", { count: "exact", head: true });
if (existing.error) throw existing.error;
if ((existing.count ?? 0) > 0) {
  console.log(`reports table already has ${existing.count} rows, skipping seed`);
  process.exit(0);
}

const inserted = await db.from("players").upsert(names.map((name) => ({ name })), { onConflict: "name" }).select("id, name");
if (inserted.error) throw inserted.error;
const ids = new Map(inserted.data.map((p) => [p.name as string, p.id as number]));

const rows = handoff.reports.map((r) => ({
  format: r.format,
  side_a: r.sideA.map((n) => ids.get(n)),
  side_b: r.sideB.map((n) => ids.get(n)),
  wins_a: r.winsA,
  wins_b: r.winsB,
  announced_at: new Date().toISOString(),
}));

const result = await db.from("reports").insert(rows);
if (result.error) throw result.error;
console.log(`seeded ${names.length} players and ${rows.length} reports`);
