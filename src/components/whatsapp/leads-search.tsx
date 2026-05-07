"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LeadsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("search") || "");

  useEffect(() => {
    setValue(params.get("search") || "");
  }, [params]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("search") || "";
      if (value === current) return;

      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("search", value.trim());
      else next.delete("search");

      router.replace(
        next.toString() ? `/whatsapp/leads?${next.toString()}` : "/whatsapp/leads"
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [value, params, router]);

  return (
    <div className="relative max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name or phone…"
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
