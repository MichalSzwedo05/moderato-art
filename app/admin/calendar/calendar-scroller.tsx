"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CalendarScroller({ children, currentDate }: { children: ReactNode; currentDate: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentDay = containerRef.current?.querySelector<HTMLElement>(`[data-calendar-date="${currentDate}"]`);
    currentDay?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [currentDate]);

  return <div className="admin-calendar-grid" ref={containerRef}>{children}</div>;
}
