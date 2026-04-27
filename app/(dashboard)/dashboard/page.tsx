import Link from 'next/link';
import { workoutNameFromRelation } from '@/lib/workouts/workout-name-from-relation';
import {
  queryCompletedSessionDurations,
  queryCompletedSessionsCount,
} from '@/lib/supabase/queries/completed-workout-sessions';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  started_at: string;
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

  const activeWorkoutName = hasActiveSession
    ? workoutNameFromRelation(activeSession.workouts)
    : null;

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

  const quickLinks = [
    { href: '/history', label: 'History', icon: HistoryIcon },
    { href: '/workouts', label: 'Workouts', icon: ListOrdered },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
  ] as const;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {greeting},{' '}
            <span className="text-foreground">{displayName}</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your overview — sessions, consistency, and the next thing to do.
          </p>
        </div>
        {!hasActiveSession && (
          <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5 shrink-0 text-orange-500" strokeWidth={2} aria-hidden />
            Total completed workouts:{' '}
            <span className="tabular-nums text-foreground">{totalSessions ?? 0}</span>
          </p>
        )}
        {hasActiveSession && (
          <Link
            href="/dashboard/active"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary/10 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Resume: {activeWorkoutName}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </header>

      <section aria-label="Summary stats">
        <ul className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          <li>
            <div className="rounded-xl border bg-card px-3 py-3 shadow-sm transition-colors duration-200 sm:px-4 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <Calendar className="size-4 text-primary sm:size-5" aria-hidden />
                <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                  {weeklyWorkouts}
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                This week
              </p>
            </div>
          </li>
          <li>
            <div className="rounded-xl border bg-card px-3 py-3 shadow-sm transition-colors duration-200 sm:px-4 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <Activity className="size-4 text-primary sm:size-5" aria-hidden />
                <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                  {consistency}%
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                30-day consistency
              </p>
            </div>
          </li>
          <li>
            <div className="rounded-xl border bg-card px-3 py-3 shadow-sm transition-colors duration-200 sm:px-4 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <Dumbbell className="size-4 text-muted-foreground sm:size-5" aria-hidden />
                <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                  {totalPRs}
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Unique exercises
              </p>
            </div>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="space-y-4 lg:col-span-7">
          {!hasActiveSession && (
            <section aria-labelledby="start-heading">
              <div className="mb-3 flex items-center gap-2">
                <Play className="size-5 text-primary" fill="currentColor" aria-hidden />
                <h2 id="start-heading" className="text-base font-semibold tracking-tight">
                  Start a workout
                </h2>
              </div>
              <Card className="border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Choose a routine</CardTitle>
                  <CardDescription className="text-sm">
                    Pick a saved workout, then hit Start.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <WorkoutSelector workouts={workouts} />
                  {(!workouts || workouts.length === 0) && (
                    <p className="text-center text-xs text-muted-foreground">
                      No routines yet.{' '}
                      <Link
                        href="/workouts"
                        className="font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
                      >
                        Create one
                      </Link>
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          <section aria-label="Shortcuts">
            <h3 className="sr-only">Shortcuts</h3>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-muted cursor-pointer sm:text-sm"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {label}
                  <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 lg:min-h-0">
          {lastSession && lastWorkoutName ? (
            <section aria-labelledby="last-workout-heading" className="lg:sticky lg:top-6">
              <div className="mb-3 flex items-center gap-2">
                <HistoryIcon className="size-5 text-muted-foreground" aria-hidden />
                <h2 id="last-workout-heading" className="text-base font-semibold tracking-tight">
                  Last workout
                </h2>
              </div>
              <Card className="overflow-hidden border bg-card shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Activity className="size-5 text-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{lastWorkoutName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lastSession.ended_at!).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 cursor-pointer" asChild>
                      <Link href={`/history/${lastSession.id}`}>
                        View
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center lg:sticky lg:top-6">
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
  );
}
