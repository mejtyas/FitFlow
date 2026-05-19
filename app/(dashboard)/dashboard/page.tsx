import Link from 'next/link';
import { workoutNameFromRelation } from '@/lib/workouts/workout-name-from-relation';
import {
  queryCompletedSessionDurations,
  queryCompletedSessionsCount,
} from '@/lib/supabase/queries/completed-workout-sessions';
import { createClient } from '@/lib/supabase/server';
import { WorkoutSelector } from '@/components/workout-selector';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Dumbbell,
  Flame,
  History as HistoryIcon,
  ListOrdered,
  Play,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SessionWithWorkoutName = {
  id: string;
  ended_at?: string | null;
  workouts: unknown;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {return null;}

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: activeSession },
    { data: lastSession },
    { count: totalSessions },
    { data: last30DaySessions },
    { data: exerciseData },
    { data: workouts },
  ] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, started_at, workout_id, workouts(name)')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workout_sessions')
      .select('id, started_at, ended_at, workouts(name)')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    queryCompletedSessionsCount(supabase, user.id),
    queryCompletedSessionDurations(
      supabase,
      user.id,
      thirtyDaysAgo.toISOString()
    ),
    supabase
      .from('session_exercises')
      .select('exercise_id, workout_sessions!inner(user_id)')
      .eq('workout_sessions.user_id', user.id),
    supabase
      .from('workouts')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name'),
  ]);

  const hasActiveSession = !!activeSession;

  const lastSessionTyped = lastSession as SessionWithWorkoutName | null;
  const lastWorkoutName = lastSessionTyped
    ? workoutNameFromRelation(lastSessionTyped.workouts)
    : null;

  const weeklyWorkouts =
    last30DaySessions?.filter((s) => new Date(s.ended_at!) >= sevenDaysAgo).length ?? 0;

  const activeDaysInLast30 = new Set(
    last30DaySessions?.map((s) => new Date(s.started_at).toDateString())
  ).size;
  const consistency = Math.round((activeDaysInLast30 / 30) * 100);

  const totalPRs = new Set(exerciseData?.map((e) => e.exercise_id)).size;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const displayName = user.email?.split('@')[0] ?? 'there';
  const activeDates = new Set(
    last30DaySessions?.map((s) => new Date(s.started_at).toDateString())
  );
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekBars = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const active = activeDates.has(date.toDateString());
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active,
      height: active ? `${54 + ((index * 17) % 38)}%` : '12%',
    };
  });

  const quickLinks = [
    {
      href: '/history',
      label: 'History',
      description: `${totalSessions ?? 0} sessions logged — review sets, RPE, notes.`,
      icon: HistoryIcon,
    },
    {
      href: '/workouts',
      label: 'Workouts',
      description: `${workouts?.length ?? 0} saved routines — start a session in one tap.`,
      icon: ListOrdered,
    },
    {
      href: '/stats',
      label: 'Stats',
      description: 'Volume, PRs, and frequency by muscle group.',
      icon: BarChart3,
    },
  ] as const;

  return (
    <div className="space-y-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 md:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.025em] md:text-[2.375rem]">
            {greeting},{' '}
            <span className="text-primary">{displayName}.</span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Your week so far — sessions, consistency, and what to lift next.
            You are {consistency}% of the way through your monthly consistency target.
          </p>
        </div>
        {!hasActiveSession && (
          <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            Total completed workouts:{' '}
            <span className="tabular-nums text-foreground">{totalSessions ?? 0}</span>
          </p>
        )}
      </header>

      <section aria-label="Summary stats">
        <ul className="grid gap-3 md:grid-cols-[1.1fr_1.4fr_1fr]">
          <li>
            <div className="h-full rounded-xl border border-border bg-card px-5 py-4 transition-colors duration-200 hover:border-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                  <Calendar className="size-3.5" aria-hidden />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  This week
                </span>
              </div>
              <p className="font-mono text-[2.375rem] font-medium leading-none tracking-tight">
                {weeklyWorkouts}{' '}
                <span className="text-sm text-muted-foreground">/ 4 sessions</span>
              </p>
              <div className="mt-3 flex h-7 items-end gap-1">
                {weekBars.map((bar) => (
                  <span
                    key={bar.key}
                    className={bar.active ? 'flex-1 rounded-sm bg-primary' : 'flex-1 rounded-sm bg-border'}
                    style={{ height: bar.height }}
                    aria-label={`${bar.label}: ${bar.active ? 'active' : 'rest'}`}
                  />
                ))}
              </div>
            </div>
          </li>
          <li>
            <div className="h-full rounded-xl border border-border bg-card px-5 py-4 transition-colors duration-200 hover:border-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                  <Activity className="size-3.5" aria-hidden />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  30-day consistency
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="grid size-14 place-items-center rounded-full bg-[conic-gradient(var(--primary)_calc(var(--p)*1%),var(--border)_0)]"
                  style={{ '--p': consistency } as React.CSSProperties}
                >
                  <div className="grid size-11 place-items-center rounded-full bg-card font-mono text-[13px] font-semibold">
                    {consistency}%
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[2rem] font-medium leading-none tracking-tight">
                    {activeDaysInLast30}{' '}
                    <span className="text-sm text-muted-foreground">/ 30 days</span>
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Goal 70% · {totalSessions ?? 0} completed workouts
                  </p>
                </div>
              </div>
            </div>
          </li>
          <li>
            <div className="h-full rounded-xl border border-border bg-card px-5 py-4 transition-colors duration-200 hover:border-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                  <Dumbbell className="size-3.5" aria-hidden />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  Unique exercises
                </span>
              </div>
              <p className="font-mono text-[2.375rem] font-medium leading-none tracking-tight">
                {totalPRs}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                All-time variety from logged sessions.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px w-6 bg-border" />
            Continue where you left off
          </h2>
          <Link href="/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary">
            See all activity
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-4">
          {!hasActiveSession && (
            <section aria-labelledby="start-heading" className="rounded-xl border border-primary/25 bg-primary/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Play className="size-5" fill="currentColor" aria-hidden />
                <h3 id="start-heading" className="text-base font-semibold tracking-tight">
                  Start a workout
                </h3>
              </div>
              <WorkoutSelector workouts={workouts} />
              {(!workouts || workouts.length === 0) && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  No routines yet.{' '}
                  <Link
                    href="/workouts"
                    className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Create one
                  </Link>
                  .
                </p>
              )}
            </section>
          )}

          <section aria-label="Shortcuts">
            <h3 className="sr-only">Shortcuts</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {quickLinks.map(({ href, label, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex min-h-36 cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary motion-reduce:hover:translate-y-0"
                >
                  <span className="flex items-center justify-between">
                    <span className="grid size-8 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors duration-200 group-hover:border-primary/35 group-hover:text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-base font-semibold tracking-tight">{label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:min-h-0">
          {lastSession && lastWorkoutName ? (
            <section aria-labelledby="last-workout-heading" className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="last-workout-heading" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  Last workout
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
                  <Activity className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-tight">{lastWorkoutName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {new Date(lastSession.ended_at!).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="my-4 grid grid-cols-3 gap-3 border-y border-border py-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                  <p className="mt-1 font-mono text-base">{totalSessions ?? 0}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Days</p>
                  <p className="mt-1 font-mono text-base">{activeDaysInLast30}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ex</p>
                  <p className="mt-1 font-mono text-base">{totalPRs}</p>
                </div>
              </div>
              <Link
                href={`/history/${lastSession.id}`}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:hover:translate-y-0"
              >
                View workout
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center lg:sticky lg:top-6">
              <Dumbbell className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">No completed workouts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a routine to see your last session here.
              </p>
            </section>
          )}
        </div>
                  </div>
      </div>
    </div>
  );
}
