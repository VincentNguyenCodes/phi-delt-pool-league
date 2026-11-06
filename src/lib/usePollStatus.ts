import { useEffect, useState } from "react";
import { isPollOpen, nextOpening, pacificParts, pollIdFor } from "../../shared/schedule";

const FORCED = import.meta.env.VITE_FORCE_POLL_OPEN === "1";

function read() {
  const now = new Date();
  if (FORCED) return { open: true, pollId: "local-test" as string | null, nextOpening: nextOpening(now) };
  const parts = pacificParts(now);
  const open = isPollOpen(parts);
  return { open, pollId: open ? pollIdFor(parts) : null, nextOpening: nextOpening(now) };
}

export function usePollStatus() {
  const [status, setStatus] = useState(read);
  useEffect(() => {
    const timer = setInterval(() => setStatus(read()), 30000);
    return () => clearInterval(timer);
  }, []);
  return status;
}
