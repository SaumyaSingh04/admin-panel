"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetch-on-mount with reload. `fetcher` must be stable (wrap it in useCallback);
 * a new identity refetches. State is only set from promise callbacks, and a
 * response that lands after unmount or a newer request is dropped.
 */
export function useLoader<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    fetcher().then(
      (d) => { if (live) { setData(d); setError(null); setLoading(false); } },
      (e) => { if (live) { setError(e); setLoading(false); } },
    );
    return () => { live = false; };
  }, [fetcher, tick]);

  const reload = useCallback(() => { setLoading(true); setTick((t) => t + 1); }, []);

  return { data, error, loading, reload, setData };
}
