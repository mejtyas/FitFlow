import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard-nav';
import { signOut } from '@/app/actions/auth';
import { Activity, ChevronRight, LogOut } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {redirect('/login');}

  const { data: activeSession } = await supabase
    .from('workout_sessions')
    .select('id, started_at, workouts(name)')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasActiveSession = !!activeSession;
  const displayName = user.email?.split('@')[0] ?? 'Athlete';
  const activeWorkoutName = (() => {
    if (!activeSession?.workouts) {return 'Workout';}
    const workouts = activeSession.workouts as { name: string | null } | { name: string | null }[];
    return (Array.isArray(workouts) ? workouts[0]?.name : workouts.name) ?? 'Workout';
  })();

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-background px-4 py-5 md:flex">
        <div className="px-2">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-[1.0625rem] font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/25">
              F
            </span>
            <span>FitFlow<span className="text-primary">.</span></span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-6">
          <DashboardNav variant="desktop" />
        </div>
        <div className="mt-auto space-y-2">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors duration-200 hover:bg-secondary">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-semibold uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-semibold">{displayName}</p>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Athlete
              </p>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          </Link>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-lg md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              F
            </span>
            FitFlow<span className="text-primary">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <form action={signOut}>
              <button
                type="submit"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors duration-200 hover:text-destructive"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-16 md:pt-6">
          <div className="mx-auto w-full max-w-6xl">
            {hasActiveSession && (
              <Link 
                href="/dashboard/active" 
                className="mb-7 flex items-center justify-between gap-4 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-foreground shadow-lg shadow-primary/10 transition-colors duration-200 hover:bg-primary/15"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative flex size-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Workout active
                  </span>
                  <span className="hidden h-4 w-px bg-primary/35 sm:block" />
                  <span className="truncate text-sm font-medium">
                    {activeWorkoutName}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                  Resume <Activity className="size-4" />
                </div>
              </Link>
            )}
            {children}
          </div>
        </main>
      </div>
      
      <DashboardNav variant="mobile" />
    </div>
  );
}
