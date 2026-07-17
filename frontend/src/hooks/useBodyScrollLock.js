import { useEffect, useRef } from "react";

/**
 * Locks body scroll in a mobile-friendly way.
 * Uses position:fixed trick instead of overflow:hidden to prevent
 * iOS Safari from breaking scroll inside modals.
 */
export function useBodyScrollLock(isLocked) {
  const scrollY = useRef(0);

  useEffect(() => {
    if (isLocked) {
      scrollY.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY.current}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll"; // prevents layout shift
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
      window.scrollTo(0, scrollY.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
    };
  }, [isLocked]);
}
