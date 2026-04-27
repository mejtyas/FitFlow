import { createClient } from '@/lib/supabase/server';
import { ExerciseList } from './exercise-list';
import { Dumbbell } from 'lucide-react';

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {return null;}

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, description, created_at')
    .eq('user_id', user.id)
    .order('name');

  const items = exercises ?? [];

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 space-y-6 md:space-y-8">
      <header className="space-y-1.5">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight md:text-3xl">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Dumbbell className="size-[1.35rem]" aria-hidden />
          </span>
          Exercises
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Your movement library. Add custom exercises, then use them in workouts and sessions.
        </p>
        {items.length > 0 && (
          <p className="text-xs font-medium text-muted-foreground">
            <span className="tabular-nums text-foreground">{items.length}</span>{' '}
            {items.length === 1 ? 'exercise' : 'exercises'}
          </p>
        )}
      </header>

      <ExerciseList exercises={items} />
    </div>
  );
}
