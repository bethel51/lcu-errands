import { useEffect, useRef } from "react";

/**
 * Locks body scroll without layout jump.
 * Uses overflow:hidden + stored scrollY offset.
 * Safe for iOS Safari, Android Chrome, and desktop.
 */

let lockCount = 0; // reference count — multiple components can lock safely

export function useBodyScrollLock(isLocked) {
  const scrollY = useRef(0);

  useEffect(() => {
    if (isLocked) {
      lockCount++;
      if (lockCount === 1) {
        // First lock: freeze the page
        scrollY.current = window.scrollY || window.pageYOffset;
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY.current}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
      }
    } else {
      if (lockCount > 0) lockCount--;
      if (lockCount === 0) {
        // Last unlock: restore scroll position
        const savedY = parseInt(document.body.style.top || "0") * -1;
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, savedY || scrollY.current);
      }
    }

    return () => {
      // Cleanup on unmount — treat as unlock
      if (isLocked) {
        if (lockCount > 0) lockCount--;
        if (lockCount === 0) {
          const savedY = parseInt(document.body.style.top || "0") * -1;
          document.body.style.overflow = "";
          document.body.style.position = "";
          document.body.style.top = "";
          document.body.style.left = "";
          document.body.style.right = "";
          window.scrollTo(0, savedY || scrollY.current);
        }
      }
    };
  }, [isLocked]);
}
