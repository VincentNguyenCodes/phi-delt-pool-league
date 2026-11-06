const ALIASES: Record<string, string> = {
  ahmed: "AK",
  "sam wyler": "Send",
  nickmo: "Nick Mo",
  nikcmo: "Nick Mo",
  andrew: "Andrew Chen",
  chen: "Andrew Chen",
};

export function canonicalName(raw: string): string {
  const name = raw.trim();
  return ALIASES[name.toLowerCase()] ?? name;
}
