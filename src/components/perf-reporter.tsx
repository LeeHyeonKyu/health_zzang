"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PerfReporter() {
  const pathname = usePathname();
  const navStart = useRef<number>(0);
  const prevPath = useRef<string>("");

  useEffect(() => {
    if (prevPath.current && prevPath.current !== pathname) {
      const duration = performance.now() - navStart.current;
      reportMetric(pathname, "nav_duration", Math.round(duration));
    }
    navStart.current = performance.now();
    prevPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) reportMetric(window.location.pathname, "lcp", Math.round(last.startTime));
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            reportMetric(window.location.pathname, "slow_interaction", Math.round(entry.duration), { name: entry.name });
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true });

      return () => {
        lcpObserver.disconnect();
        inpObserver.disconnect();
      };
    } catch {
      // PerformanceObserver not supported
    }
  }, []);

  return null;
}

const REPORT_QUEUE: { page: string; metric: string; value: number; metadata?: Record<string, unknown> }[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function reportMetric(page: string, metric: string, value: number, metadata?: Record<string, unknown>) {
  REPORT_QUEUE.push({ page, metric, value, metadata });

  if (!flushTimeout) {
    flushTimeout = setTimeout(flushMetrics, 5000);
  }
}

async function flushMetrics() {
  flushTimeout = null;
  if (REPORT_QUEUE.length === 0) return;

  const batch = REPORT_QUEUE.splice(0);

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("performance_log").insert(
      batch.map((m) => ({
        user_id: user.id,
        page: m.page,
        metric: m.metric,
        value: m.value,
        metadata: m.metadata ?? null,
      }))
    );
  } catch {
    // silently fail — metrics are best-effort
  }
}
