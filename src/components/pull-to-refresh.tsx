"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 80;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const canPull = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!canPull()) return;
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        setPullDistance(0);
        return;
      }
      const dampened = Math.min(dy * 0.4, 120);
      setPullDistance(dampened);
    }

    function onTouchEnd() {
      if (!pulling) return;
      setPulling(false);
      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD * 0.5);
        router.refresh();
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 800);
      } else {
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pulling, pullDistance, refreshing, canPull, router]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : "0px" }}
      >
        <div
          className="text-gray-400 dark:text-gray-500 text-sm"
          style={{ opacity: progress, transform: `rotate(${progress * 360}deg)` }}
        >
          {refreshing ? "↻" : progress >= 1 ? "↓" : "↓"}
        </div>
      </div>
      {children}
    </div>
  );
}
