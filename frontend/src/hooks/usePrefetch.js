import { useCallback } from "react";

/**
 * A simple hook to prefetch lazy-loaded components.
 * Pass a function that returns a dynamic import, e.g. () => import('./pages/Dashboard')
 */
export const usePrefetch = () => {
  const prefetch = useCallback((importFn) => {
    importFn().catch(() => {
      // Ignore errors, we're just prefetching
    });
  }, []);

  return prefetch;
};
