"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CalendarScroller({ children, className = "admin-calendar-grid", currentDate }: { children: ReactNode; className?: string; currentDate: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentDay = containerRef.current?.querySelector<HTMLElement>(`[data-calendar-date="${currentDate}"]`);
    currentDay?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [currentDate]);

  return <div className={className} ref={containerRef}>{children}</div>;
}
