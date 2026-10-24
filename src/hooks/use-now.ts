import { useEffect, useState } from 'react';

/** The current time, refreshed periodically, so render stays pure. */
export function useNow(refreshMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);
  return now;
}
