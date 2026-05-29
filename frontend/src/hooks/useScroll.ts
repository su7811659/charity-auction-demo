import { useState, useEffect, useCallback, RefObject } from "react";

interface UseScrollOptions {
  container?: RefObject<HTMLElement | null> | HTMLElement | null; // custom scroll container, defaults to window
  onScroll?: (scrollY: number, direction: "up" | "down") => void;
  thresholdTop?: number;
  thresholdBottom?: number;
}

const useScroll = ({ container, onScroll, thresholdTop = 0, thresholdBottom = 0 }: UseScrollOptions = {}) => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const el =
      container && "current" in container ? container.current : container || window;

    if (!el) return;

    let lastScrollY = el === window ? window.scrollY : (el as HTMLElement).scrollTop;

    const handleScroll = () => {
      const currentScrollY =
        el === window ? window.scrollY : (el as HTMLElement).scrollTop;

      const direction = currentScrollY > lastScrollY ? "down" : "up";

      setScrollY(currentScrollY);
      setIsScrollingUp(direction === "up");

      if (el === window) {
        setIsAtTop(currentScrollY <= thresholdTop);
        setIsAtBottom(
          window.innerHeight + currentScrollY >=
            document.body.scrollHeight - thresholdBottom
        );
      } else {
        const containerEl = el as HTMLElement;
        setIsAtTop(currentScrollY <= thresholdTop);
        setIsAtBottom(
          containerEl.scrollTop + containerEl.clientHeight >=
            containerEl.scrollHeight - thresholdBottom
        );
      }

      if (onScroll) {
        onScroll(currentScrollY, direction);
      }

      lastScrollY = currentScrollY;
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [container, onScroll, thresholdTop, thresholdBottom]);

  const scrollToTop = useCallback(
    (duration: number = 500): Promise<void> => {
      return new Promise((resolve) => {
        const el =
          container && "current" in container ? container.current : container || window;
        if (!el) return resolve();

        const start = el === window ? window.scrollY : (el as HTMLElement).scrollTop;
        const startTime = performance.now();

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const scrollStep = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = easeOutCubic(progress);

          if (el === window) {
            window.scrollTo(0, start * (1 - ease));
          } else {
            (el as HTMLElement).scrollTop = start * (1 - ease);
          }

          if (progress < 1) {
            requestAnimationFrame(scrollStep);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(scrollStep);
      });
    },
    [container]
  );

  return { scrollY, isScrollingUp, isAtTop, isAtBottom, scrollToTop };
};

export default useScroll;
