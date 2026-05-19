import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StartWorkoutButton } from '@/components/start-workout-button';
import { DeleteWorkoutForm } from './delete-workout-form';
import { ChevronRight, Dumbbell, Edit2, ListOrdered, Plus } from 'lucide-react';

type WorkoutExerciseRow = {
  id: string;
  order_index: number;
  default_sets: number;
  exercises: { name: string } | { name: string }[] | null;
};

type WorkoutListRow = {
  id: string;
  name: string;
  created_at: string;
  workout_exercises: WorkoutExerciseRow[] | null;
};

function exerciseNameFromJoin(
  exercises: WorkoutExerciseRow['exercises']
): string | null {
  if (!exercises) {return null;}
  if (Array.isArray(exercises)) {return exercises[0]?.name?.trim() ?? null;}
  return exercises.name?.trim() ?? null;
}

function exercisePreview(workoutExercises: WorkoutExerciseRow[] | null, maxNames = 6): string {
  if (!workoutExercises?.length) {return 'No exercises yet — add some when you edit.';}
  const ordered = [...workoutExercises].sort((a, b) => a.order_index - b.order_index);
  const names = ordered
    .map((we) => exerciseNameFromJoin(we.exercises))
    .filter((n): n is string => Boolean(n?.trim()));
  if (names.length === 0) {return 'No exercise names loaded.';}
  const shown = names.slice(0, maxNames).join(' · ');
  return names.length > maxNames ? `${shown} · …` : shown;
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {return null;}

  const [{ data: workoutsRaw }, { data: completedRuns }] = await Promise.all([
    supabase
      .from('workouts')
      .select(
        'id, name, created_at, workout_exercises(id, order_index, default_sets, exercises(name))'
      )
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('workout_sessions')
      .select('workout_id, ended_at')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false }),
  ]);

  const workouts = (workoutsRaw ?? []) as unknown as WorkoutListRow[];
  const total = workouts.length;
  const lastRunByWorkoutId = (completedRuns ?? []).reduce((acc, run) => {
    if (run.workout_id && run.ended_at && !acc.has(run.workout_id)) {
      acc.set(run.workout_id, run.ended_at);
    }
    return acc;
  }, new Map<string, string>());
  const filters = ['All', 'Push / Pull', 'Full body', 'Archived'] as const;

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Library
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.025em] md:text-[2.375rem]">
            Workouts
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Saved routines you can start in one tap. Edit structure, sets, and exercise order anytime.
          </p>
        </div>
        <Button
          asChild
          size="default"
          className="cursor-pointer shrink-0 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
        >
          <Link href="/workouts/new">
            <Plus className="size-4" aria-hidden />
            New routine
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={
              filter === 'All'
                ? 'cursor-pointer rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary'
                : 'cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground'
            }
          >
            {filter}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground">
          {total} {total === 1 ? 'routine' : 'routines'}
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-secondary">
            <ListOrdered className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">No routines yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a routine with your usual exercises so starting a session is faster.
            </p>
          </div>
          <Button asChild className="cursor-pointer rounded-lg font-semibold">
            <Link href="/workouts/new">
              Create routine
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {workouts.map((w) => {
              const we = w.workout_exercises;
              const exerciseCount = Array.isArray(we) ? we.length : 0;
              const preview = exercisePreview(we);
              const lastRun = lastRunByWorkoutId.get(w.id);

              return (
                <li key={w.id}>
                  <article className="grid gap-4 p-4 transition-colors duration-200 hover:bg-secondary md:grid-cols-[3.5rem_1fr_8rem_5.5rem_auto] md:items-center md:gap-4 md:p-5">
                    <div className="hidden md:block">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground"
                        aria-hidden
                      >
                        <Dumbbell className="size-5" />
                      </div>
                    </div>
                    <div className="flex min-w-0 gap-3 md:block">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground md:hidden"
                        aria-hidden
                      >
                        <Dumbbell className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={`/workouts/${w.id}/edit`}
                          className="font-semibold tracking-tight text-foreground underline-offset-4 transition-colors duration-200 hover:text-primary"
                        >
                          {w.name}
                        </Link>
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {preview}
                        </p>
                      </div>
                    </div>
                    <div className="hidden flex-col gap-1 md:flex">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        Last run
                      </span>
                      <span className="font-mono text-[13px] text-foreground">
                        {lastRun
                          ? new Date(lastRun).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Never'}
                      </span>
                    </div>
                    <span className="hidden w-fit rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground md:inline-flex">
                      {exerciseCount} ex
                    </span>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3 md:border-t-0 md:pt-0">
                      <Button variant="outline" size="sm" className="cursor-pointer rounded-lg" asChild>
                        <Link href={`/workouts/${w.id}/edit`}>
                          <Edit2 className="size-4" aria-hidden />
                          Edit
                        </Link>
                      </Button>
                      <StartWorkoutButton workoutId={w.id} size="sm" className="min-w-[6.5rem]" />
                      <DeleteWorkoutForm id={w.id} label={w.name} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          <Link
            href="/workouts/new"
            className="flex items-center justify-center gap-2 border-t border-dashed border-border px-4 py-4 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
          >
            <Plus className="size-4" aria-hidden />
            Build a new routine from scratch
          </Link>
        </div>
      )}
    </div>
  );
}
