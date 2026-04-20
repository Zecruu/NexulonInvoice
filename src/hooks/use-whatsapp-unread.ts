"use client";

import { useEffect, useState } from "react";

export function useWhatsAppUnread(pollMs = 15000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/api/whatsapp/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch {
        // silent
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return count;
}
