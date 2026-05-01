"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function InvoiceSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("search") || "";
  const [value, setValue] = useState(initial);

  // Keep input in sync if the URL changes from elsewhere (status tab clicks).
  useEffect(() => {
    setValue(params.get("search") || "");
  }, [params]);

  // Debounce URL updates so we don't refetch on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("search") || "";
      if (value === current) return;

      const next = new URLSearchParams(params.toString());
      if (value.trim()) {
        next.set("search", value.trim());
      } else {
        next.delete("search");
      }
      next.delete("page"); // reset paging on new query

      router.replace(
        next.toString() ? `/invoices?${next.toString()}` : "/invoices"
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [value, params, router]);

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by invoice number or client…"
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => setValue("")}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
