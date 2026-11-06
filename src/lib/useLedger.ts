import { useCallback, useEffect, useMemo, useState } from "react";
import { computeLeaderboard } from "../../shared/rating";
import { fetchLedger, type Ledger } from "./data";

export function useLedger() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLedger(await fetchLedger());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the ladder");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const board = useMemo(() => (ledger ? computeLeaderboard(ledger.reports) : null), [ledger]);
  const names = useMemo(() => new Map((ledger?.players ?? []).map((p) => [String(p.id), p.name])), [ledger]);

  return { ledger, board, names, error, refresh };
}
