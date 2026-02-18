"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...navItems, { label: "Admin", href: "/admin", icon: Shield }]
    : navItems;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <FileText className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Nexulon Invoice</span>
      </div>
      <nav className="space-y-1 p-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
