import { useEffect, useState } from 'react';

/**
 * Flips to true after `ms` of the caller still being mounted. Used to show a
 * "this is taking a while" message on loading screens without flashing it on
 * every fast load — e.g. the Render free-tier backend cold-starting after 15
 * minutes idle, which can take 30-60s and otherwise looks like a stuck spinner.
 */
export function useDelayedFlag(ms: number): boolean {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFlag(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);

  return flag;
}
