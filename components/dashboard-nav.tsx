'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  History,
  Dumbbell,
  ListOrdered,
  BarChart3,
  MessageSquareText,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, section: 'Workspace' },
  { href: '/history', label: 'History', icon: History, section: 'Workspace' },
  { href: '/workouts', label: 'Workouts', icon: ListOrdered, section: 'Workspace' },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell, section: 'Workspace' },
  { href: '/stats', label: 'Stats', icon: BarChart3, section: 'Workspace' },
  { href: '/feedback', label: 'Feedback', icon: MessageSquareText, section: 'Account' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'Account' },
];

const navSections = ['Workspace', 'Account'] as const;

interface DashboardNavProps {
  variant?: 'mobile' | 'desktop';
}

export function DashboardNav({ variant }: DashboardNavProps) {
  const pathname = usePathname();

  if (variant === 'mobile') {
    return (
      <nav className="fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/90 px-2 pb-safe backdrop-blur-lg md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
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
    <nav className="flex w-full flex-col gap-1">
      {navSections.map((section) => (
        <div key={section} className="space-y-1">
          <p className="px-2.5 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {section}
          </p>
          {navItems
            .filter((item) => item.section === section)
            .map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-card text-foreground before:absolute before:-left-4 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-primary'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[1.125rem] shrink-0',
                      isActive && 'text-primary'
                    )}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
