import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` milliseconds while the page is visible. */
export default function usePolling(fn, ms, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => { if (!document.hidden) saved.current(); }, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}
