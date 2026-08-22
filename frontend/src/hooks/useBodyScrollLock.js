import { useEffect } from "react";

/**
 * Locks body scroll without any layout jump or position:fixed trick.
 * Uses overflow:hidden only — this is the safest approach that doesn't
 * break fixed-position children (modals, sheets, etc.) on iOS or Android.
 *
 * Reference-counted — multiple components can safely call this
 * and the body only unlocks when ALL callers have unmounted/unlocked.
 */

let lockCount = 0;

export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      if (lockCount === 1) {
        const scrollY = window.scrollY;
        document.body.dataset.scrollY = String(scrollY);
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
      }
    }

    return () => {
      if (isLocked) {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          document.body.style.overflow = "";
          document.body.style.width = "";
          const savedY = parseInt(document.body.dataset.scrollY || "0", 10);
          delete document.body.dataset.scrollY;
          if (savedY) window.scrollTo(0, savedY);
        }
      }
    };
  }, [isLocked]);
}
