import type { Move } from "./rating.ts";

export function describeGame(a: string[], b: string[], winsA: number, winsB: number): string {
  const verb = winsA === winsB ? "tied" : "beat";
  return `${a.join(" / ")} ${verb} ${b.join(" / ")} ${winsA}-${winsB}`;
}

function signed(n: number, digits = 0): string {
  const text = n.toFixed(digits);
  return n > 0 ? `+${text}` : text;
}

export function describeMove(name: string, move: Move): string {
  if (move.rankBefore === null || move.eloBefore === null) {
    return `${name}: debuts at #${move.rankAfter}, ${move.eloAfter.toFixed(1)}`;
  }
  const shift = move.rankBefore - move.rankAfter;
  const rank = shift === 0 ? `#${move.rankAfter} (no change)` : `#${move.rankBefore} to #${move.rankAfter} (${signed(shift)})`;
  const delta = move.eloAfter - move.eloBefore;
  return `${name}: ${rank}, ${move.eloBefore.toFixed(1)} to ${move.eloAfter.toFixed(1)} (${signed(delta, 1)})`;
}

export function buildAnnouncement(
  a: string[],
  b: string[],
  winsA: number,
  winsB: number,
  moves: Move[],
  names: Map<string, string>,
  siteUrl?: string,
): string {
  const lines = [describeGame(a, b, winsA, winsB)];
  for (const move of moves) lines.push(describeMove(names.get(move.id) ?? move.id, move));
  if (siteUrl) lines.push(siteUrl);
  return lines.join("\n");
}
