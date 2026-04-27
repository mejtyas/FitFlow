import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StartWorkoutButton } from '@/components/start-workout-button';
import { DeleteWorkoutForm } from './delete-workout-form';
import {
  ChevronRight,
  Dumbbell,
  Edit2,
  ListOrdered,
  Plus,
} from 'lucide-react';

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

function exercisePreview(workoutExercises: WorkoutExerciseRow[] | null, maxNames = 3): string {
  if (!workoutExercises?.length) {return 'No exercises yet — add some when you edit.';}
  const ordered = [...workoutExercises].sort((a, b) => a.order_index - b.order_index);
  const names = ordered
    .map((we) => exerciseNameFromJoin(we.exercises))
    .filter((n): n is string => Boolean(n?.trim()));
  if (names.length === 0) {return 'No exercise names loaded.';}
  const shown = names.slice(0, maxNames).join(', ');
  return names.length > maxNames ? `${shown}…` : shown;
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {return null;}

  const { data: workoutsRaw } = await supabase
    .from('workouts')
    .select(
      'id, name, created_at, workout_exercises(id, order_index, default_sets, exercises(name))'
    )
    .eq('user_id', user.id)
    .order('name');

  const workouts = (workoutsRaw ?? []) as unknown as WorkoutListRow[];
  const total = workouts.length;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListOrdered className="size-[1.35rem]" aria-hidden />
            </span>
            Workouts
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Saved routines you can start in one tap. Edit structure, sets, and exercise order anytime.
          </p>
          {total > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              <span className="tabular-nums text-foreground">{total}</span>{' '}
              {total === 1 ? 'routine' : 'routines'}
            </p>
          )}
        </div>
        <Button
          asChild
          size="default"
          className="cursor-pointer shrink-0 rounded-lg font-semibold shadow-sm"
        >
          <Link href="/workouts/new">
            <Plus className="size-4" aria-hidden />
            New routine
          </Link>
        </Button>
      </header>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
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
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {workouts.map((w) => {
            const we = w.workout_exercises;
            const exerciseCount = Array.isArray(we) ? we.length : 0;
            const preview = exercisePreview(we, 3);

            return (
              <li key={w.id}>
                <article className="flex flex-col gap-4 p-4 transition-colors duration-200 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
                      aria-hidden
                    >
                      <Dumbbell className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                        <Link
                          href={`/workouts/${w.id}/edit`}
                          className="font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:text-primary"
                        >
                          {w.name}
                        </Link>
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {preview}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
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
      )}
    </div>
  );
}
