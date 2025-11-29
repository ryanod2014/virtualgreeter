"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, MessageSquare, LogOut } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/platform",
    label: "Overview",
    icon: BarChart3,
    exact: true,
  },
  {
    href: "/platform/organizations",
    label: "Organizations",
    icon: Building2,
  },
  {
    href: "/platform/feedback",
    label: "Feedback",
    icon: MessageSquare,
  },
  {
    href: "/platform/cancellations",
    label: "Cancellations",
    icon: LogOut,
  },
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="max-w-7xl mx-auto px-6">
      <div className="flex gap-1 -mb-px">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

