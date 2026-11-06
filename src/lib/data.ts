import handoffMarkdown from "../../data/phi-delt-pool-website-handoff.md?raw";
import { parseHandoff } from "../../shared/handoff";
import type { Format, Report } from "../../shared/rating";
import { supabase } from "./supabase";

export interface Player {
  id: number;
  name: string;
}

export interface Ledger {
  players: Player[];
  reports: Report[];
}

export interface GameInput {
  format: Format;
  sideA: number[];
  sideB: number[];
  winsA: number;
  winsB: number;
}

let offline: Ledger | null = null;

function offlineLedger(): Ledger {
  if (offline) return offline;
  const handoff = parseHandoff(handoffMarkdown);
  const names = [...new Set(handoff.reports.flatMap((r) => [...r.sideA, ...r.sideB]))].sort();
  const ids = new Map(names.map((name, i) => [name, i + 1]));
  offline = {
    players: names.map((name) => ({ id: ids.get(name)!, name })),
    reports: handoff.reports.map((r) => ({
      id: r.id,
      format: r.format,
      sideA: r.sideA.map((n) => String(ids.get(n))),
      sideB: r.sideB.map((n) => String(ids.get(n))),
      winsA: r.winsA,
      winsB: r.winsB,
    })),
  };
  return offline;
}

export const isOffline = supabase === null;

export async function fetchLedger(): Promise<Ledger> {
  if (!supabase) {
    const l = offlineLedger();
    return { players: [...l.players], reports: [...l.reports] };
  }
  const players = await supabase.from("players").select("id, name").order("name");
  if (players.error) throw players.error;
  const reports: Report[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await supabase
      .from("reports")
      .select("id, format, side_a, side_b, wins_a, wins_b")
      .order("id")
      .range(from, from + 999);
    if (page.error) throw page.error;
    for (const r of page.data) {
      reports.push({
        id: r.id,
        format: r.format,
        sideA: (r.side_a as number[]).map(String),
        sideB: (r.side_b as number[]).map(String),
        winsA: r.wins_a,
        winsB: r.wins_b,
      });
    }
    if (page.data.length < 1000) break;
  }
  return { players: players.data as Player[], reports };
}

export async function addPlayer(name: string): Promise<Player> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!supabase) {
    const l = offlineLedger();
    const found = l.players.find((p) => p.name.toLowerCase() === clean.toLowerCase());
    if (found) return found;
    const player = { id: Math.max(0, ...l.players.map((p) => p.id)) + 1, name: clean };
    l.players.push(player);
    return player;
  }
  const inserted = await supabase.from("players").insert({ name: clean }).select("id, name").single();
  if (!inserted.error) return inserted.data as Player;
  const existing = await supabase.from("players").select("id, name").ilike("name", clean).single();
  if (existing.error) throw inserted.error;
  return existing.data as Player;
}

export async function logGame(game: GameInput): Promise<number> {
  if (!supabase) {
    const l = offlineLedger();
    const id = Math.max(0, ...l.reports.map((r) => r.id)) + 1;
    l.reports.push({
      id,
      format: game.format,
      sideA: game.sideA.map(String),
      sideB: game.sideB.map(String),
      winsA: game.winsA,
      winsB: game.winsB,
    });
    return id;
  }
  const inserted = await supabase
    .from("reports")
    .insert({
      format: game.format,
      side_a: game.sideA,
      side_b: game.sideB,
      wins_a: game.winsA,
      wins_b: game.winsB,
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id as number;
}

export async function announce(reportId: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("announce", { body: { report_id: reportId } });
  } catch {
    return;
  }
}
