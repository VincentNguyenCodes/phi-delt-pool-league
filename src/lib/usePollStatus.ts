import { useEffect, useState } from "react";
import { isPollOpen, nextOpening, pacificParts, pollIdFor } from "../../shared/schedule";

function read() {
  const now = new Date();
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
