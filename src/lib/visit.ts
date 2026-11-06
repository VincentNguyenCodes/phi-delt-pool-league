import { supabase } from "./supabase";

export function logVisit() {
  if (!supabase || !import.meta.env.PROD || location.hostname === "localhost") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("pdpl-visit-day") === today) return;
    const token = localStorage.getItem("pdpl-visitor") ?? crypto.randomUUID();
    localStorage.setItem("pdpl-visitor", token);
    localStorage.setItem("pdpl-visit-day", today);
    supabase
      .from("visits")
      .insert({ visitor: token, path: (location.hash || "#/").slice(0, 40) })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    return;
  }
}
