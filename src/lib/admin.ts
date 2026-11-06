import type { AdminGame } from "../../shared/admin";
import type { ProjectStats } from "../../shared/projectStats";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const adminAvailable = Boolean(url && anon);

export class AdminError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(key: string, body: object): Promise<T> {
  const res = await fetch(`${url}/functions/v1/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": key, apikey: anon! },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AdminError(res.status, (data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export const adminApi = {
  check: (key: string) => call<{ ok: boolean }>(key, { action: "check" }),
  stats: (key: string) => call<{ stats: ProjectStats; bullets: string[] }>(key, { action: "stats" }),
  games: (key: string) => call<{ games: AdminGame[] }>(key, { action: "games" }),
  deleteGame: (key: string, id: number) => call<{ deleted: number }>(key, { action: "delete_game", id }),
};
