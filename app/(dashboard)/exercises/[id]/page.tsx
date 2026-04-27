import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/supabase/get-authenticated-user';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Dumbbell,
  TrendingUp,
  Calendar,
  Trophy,
  Activity,
  ChevronRight,
  LineChart,
  Flame,
  Target,
} from 'lucide-react';
import type { Json } from '@/lib/supabase/database.types';
import { ExerciseWarmupSettingsForm } from '@/components/exercise-warmup-settings-form';
import { parseWarmupSettings } from '@/lib/warmup-settings';
import { buildExerciseProgressSeries } from '@/lib/exercise-progress-series';
import type { ExerciseHistoryRow, SessionSetRow } from '@/lib/exercise-progress-series';
import { estimatedOneRmEpley } from '@/lib/estimated-one-rm';
import { ExerciseProgressChart } from '@/components/exercise-progress-chart';

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect('/login');
  }
  const { supabase, user } = auth;

  // 1. Fetch exercise metadata
  const { data: exercise } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!exercise) {notFound();}

  const warmupInitial = parseWarmupSettings(exercise.warmup_settings as Json | null);

  // 2. Fetch exercise history (sessions, sets, workout names)
  // We'll get all session_exercises for this exercise, joining workout_sessions and session_sets
  const { data: history } = await supabase
    .from('session_exercises')
    .select(`
      id,
      workout_session_id,
      logged_order,
      first_logged_at,
      workout_sessions!inner (
        id,
        started_at,
        ended_at,
        workouts (
          name
        )
      ),
      session_sets (
        id,
        set_index,
        kg,
        reps
      )
    `)
    .eq('exercise_id', id)
    .not('workout_sessions.ended_at', 'is', null) // Only show completed sessions
    .order('workout_sessions(started_at)', { ascending: false });

  // 3. Calculate some stats
  const allSets = history?.flatMap(h => h.session_sets) || [];
  const maxWeight = Math.max(...allSets.map(s => Number(s.kg || 0)), 0);
  const totalVolume = allSets.reduce((sum, s) => sum + (Number(s.kg || 0) * Number(s.reps || 0)), 0);
  const bestEstOneRm = allSets.reduce((best, s) => {
    const e = estimatedOneRmEpley(Number(s.kg || 0), Number(s.reps || 0));
    if (e !== null && e !== undefined && e > best) {
      return e;
    }
    return best;
  }, 0);

  const progressPoints = buildExerciseProgressSeries(
    history as ExerciseHistoryRow[] | null | undefined
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
            <Link href="/exercises">
              <ChevronLeft className="mr-1 size-4" />
              Back to Exercises
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Dumbbell className="size-8 text-primary" />
            {exercise.name}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Personal performance history and progress tracking.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <Trophy className="size-5 text-primary" />
            <span className="text-2xl font-bold italic">{maxWeight}kg</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Personal Best</span>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20 border-secondary shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <TrendingUp className="size-5 text-secondary-foreground" />
            <span className="text-2xl font-bold italic">{Math.round(totalVolume).toLocaleString()}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Total Volume</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-muted shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <Activity className="size-5 text-muted-foreground" />
            <span className="text-2xl font-bold italic">{history?.length || 0}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Times Performed</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-muted shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <Target className="size-5 text-muted-foreground" />
            <span className="text-2xl font-bold italic tabular-nums">
              {bestEstOneRm > 0 ? (
                <>
                  {Math.round(bestEstOneRm * 10) / 10}
                  <span className="text-lg font-semibold not-italic">kg</span>
                </>
              ) : (
                '—'
              )}
            </span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">
              Est. 1RM (Epley)
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/60 shadow-none">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Flame className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
            Warm-up targets
          </CardTitle>
          <CardDescription className="text-xs">
            Defaults: 40–50% of last top weight for the first warm-up (reps below), then a second
            warm-up at 80% for two reps. Edit here; suggestions appear on the active workout.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ExerciseWarmupSettingsForm
            key={`${exercise.id}-${warmupInitial.w1_pct_low}-${warmupInitial.w1_pct_high}-${warmupInitial.w1_reps}-${warmupInitial.w2_pct}-${warmupInitial.w2_reps}`}
            exerciseId={exercise.id}
            initial={warmupInitial}
          />
        </CardContent>
      </Card>

      {progressPoints.length > 0 ? (
        <Card className="border-muted/60 shadow-none overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <LineChart className="size-5 text-primary" />
              Progress
            </CardTitle>
            <CardDescription className="text-xs">
              Strength uses best estimated 1RM per session (Epley). Volume is kg×reps summed. Completed
              sessions only.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            <ExerciseProgressChart points={progressPoints} />
          </CardContent>
        </Card>
      ) : null}

      {/* History List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="size-5 text-muted-foreground" />
          Training History
        </h2>

        {!history || history.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <Activity className="size-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg">No history found</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  You have not logged this exercise in any workouts yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(history as unknown as ExerciseHistoryRow[]).map((h) => {
              const session = h.workout_sessions;
              const dateStr = new Date(session.started_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              const workouts = session.workouts;
              const workoutName = (Array.isArray(workouts) ? workouts[0]?.name : workouts?.name) || 'Custom Session';

              return (
                <Card key={h.id} className="overflow-hidden border-muted/60 hover:border-primary/50 transition-all group">
                  <Link href={`/history/${session.id}`} className="block">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between group-hover:bg-primary/5 transition-colors">
                      <div className="space-y-0.5">
                        <CardTitle className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
                          {workoutName}
                        </CardTitle>
                        <CardDescription className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3" />
                            {dateStr}
                          </span>
                          {h.logged_order !== null && h.logged_order !== undefined && (
                            <span className="normal-case font-medium text-muted-foreground">
                              First logged as #{Number(h.logged_order) + 1} in that session
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        {[...(h.session_sets ?? [])]
                          .sort((a: SessionSetRow, b: SessionSetRow) => a.set_index - b.set_index)
                          .map((set: SessionSetRow, idx: number) => (
                          <div key={set.id} className="flex items-center gap-3">
                            <div className="size-6 rounded-full bg-muted/50 text-[10px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold leading-none">
                                {set.kg || 0}<span className="text-[10px] text-muted-foreground ml-0.5">kg</span>
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                                {set.reps || 0}<span className="ml-0.5">reps</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
