export const GROUPME_LIMIT = 1000;

export function chunkMessage(text: string, limit = GROUPME_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > limit) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export async function postToGroupMe(botId: string, text: string): Promise<void> {
  for (const part of chunkMessage(text)) {
    const res = await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, text: part }),
    });
    if (!res.ok) throw new Error(`GroupMe responded ${res.status}`);
  }
}
