import { canonicalName } from "../../shared/aliases";

export function cleanName(raw: string): string {
  const spaced = raw.trim().replace(/\s+/g, " ");
  if (spaced.length < 1 || spaced.length > 40) throw new Error("Names must be 1 to 40 characters.");
  if (!/^[\p{L}\p{N} .'-]+$/u.test(spaced)) {
    throw new Error("Use letters, numbers, spaces, periods, hyphens and apostrophes only.");
  }
  if (spaced !== spaced.toLowerCase()) return spaced;
  return spaced.replace(/(^|[ '-])(\p{L})/gu, (_, lead: string, c: string) => lead + c.toUpperCase());
}

export function findExisting<T extends { name: string }>(name: string, players: T[]): T | undefined {
  const lower = name.toLowerCase();
  const alias = canonicalName(name).toLowerCase();
  return players.find((p) => {
    const have = p.name.toLowerCase();
    return have === lower || have === alias;
  });
}
