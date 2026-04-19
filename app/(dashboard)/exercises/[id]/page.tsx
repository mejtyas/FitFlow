import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Dumbbell, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Trophy, 
  Activity,
  ChevronRight
} from "lucide-react";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch exercise metadata
  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!exercise) notFound();

  // 2. Fetch exercise history (sessions, sets, workout names)
  // We'll get all session_exercises for this exercise, joining workout_sessions and session_sets
  const { data: history } = await supabase
    .from("session_exercises")
    .select(`
      id,
      workout_session_id,
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
    .eq("exercise_id", id)
    .not("workout_sessions.ended_at", "is", null) // Only show completed sessions
    .order("workout_sessions(started_at)", { ascending: false });

  // 3. Calculate some stats
  const allSets = history?.flatMap(h => h.session_sets) || [];
  const maxWeight = Math.max(...allSets.map(s => Number(s.kg || 0)), 0);
  const totalVolume = allSets.reduce((sum, s) => sum + (Number(s.kg || 0) * Number(s.reps || 0)), 0);
  const totalReps = allSets.reduce((sum, s) => sum + (Number(s.reps || 0)), 0);

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
            <Activity className="size-5 text-muted-foreground" />
            <span className="text-2xl font-bold italic">{totalReps}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Total Reps</span>
          </CardContent>
        </Card>
      </div>

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
                  You haven't logged this exercise in any workouts yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((h: any) => {
              const session = h.workout_sessions;
              const dateStr = new Date(session.started_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              const workouts = session.workouts;
              const workoutName = (Array.isArray(workouts) ? workouts[0]?.name : workouts?.name) || "Custom Session";

              return (
                <Card key={h.id} className="overflow-hidden border-muted/60 hover:border-primary/50 transition-all group">
                  <Link href={`/history/${session.id}`} className="block">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between group-hover:bg-primary/5 transition-colors">
                      <div className="space-y-0.5">
                        <CardTitle className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
                          {workoutName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                          <Calendar className="size-3" />
                          {dateStr}
                        </CardDescription>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        {h.session_sets.sort((a: any, b: any) => a.set_index - b.set_index).map((set: any, idx: number) => (
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
