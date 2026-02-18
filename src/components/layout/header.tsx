"use client";

import { UserButton } from "@clerk/nextjs";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  isAdmin?: boolean;
}

export function Header({ isAdmin }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <MobileNav isAdmin={isAdmin} />
        <h2 className="text-lg font-semibold lg:hidden">Nexulon Invoice</h2>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
