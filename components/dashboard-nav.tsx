"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  History,
  Dumbbell,
  ListOrdered,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/workouts", label: "Workouts", icon: ListOrdered },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface DashboardNavProps {
  variant?: "mobile" | "desktop";
}

export function DashboardNav({ variant }: DashboardNavProps) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav className="fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 px-2 pb-safe backdrop-blur-lg md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-all",
                isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span className="text-[10px] font-medium leading-none uppercase tracking-wider">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex w-full flex-col gap-1 px-2 py-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
