import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { WorkoutSelector } from "@/components/workout-selector";
import { Play, Plus, History as HistoryIcon, Activity, Flame, Calendar, ChevronRight, Dumbbell, ListOrdered } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: activeSession } = await supabase
    .from("workout_sessions")
    .select("id, started_at, workout_id, workouts(name)")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasActiveSession = !!activeSession;

  const activeWorkoutName = hasActiveSession 
    ? (Array.isArray(activeSession.workouts) 
        ? (activeSession.workouts as any)[0]?.name 
        : (activeSession.workouts as any)?.name) ?? "Unnamed Session"
    : null;

  // 2. Get last completed session
  const { data: lastSession } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, workouts(name)")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastWorkoutName = lastSession 
    ? (Array.isArray(lastSession.workouts) 
        ? (lastSession.workouts as any)[0]?.name 
        : (lastSession.workouts as any)?.name) ?? "Unnamed Session"
    : null;

  // 3. Get workout count for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: weeklyWorkouts } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .gte("ended_at", sevenDaysAgo.toISOString());

  // 4. Get total workouts for consistency and PRs
  const { data: allSessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  const totalSessions = allSessions?.length || 0;
  
  // Calculate consistency (days worked out in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeDaysInLast30 = new Set(
    allSessions
      ?.filter(s => new Date(s.ended_at!) >= thirtyDaysAgo)
      .map(s => new Date(s.started_at).toDateString())
  ).size;
  const consistency = Math.round((activeDaysInLast30 / 30) * 100);

  // Total PRs (using unique exercises performed as a proxy for now)
  let totalPRs = 0;
  const sessionIds = allSessions?.map(s => s.id) || [];
  if (sessionIds.length > 0) {
    const { data: exerciseData } = await supabase
      .from("session_exercises")
      .select("exercise_id")
      .in("workout_session_id", sessionIds);
    totalPRs = new Set(exerciseData?.map(e => e.exercise_id)).size;
  }

  // 5. Get available workouts
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Welcome Header */}
      <section className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting}, <span className="text-primary italic">{user.email?.split("@")[0]}</span>
        </h1>
        <p className="text-muted-foreground text-sm flex items-center gap-2 font-medium">
          Ready to crush your goals today? <Flame className="size-4 text-orange-500 fill-orange-500" />
        </p>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <Calendar className="size-5 text-primary" />
            <span className="text-2xl font-bold">{weeklyWorkouts || 0}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Weekly Sessions</span>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50 border-secondary shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
            <Activity className="size-5 text-secondary-foreground" />
            <span className="text-2xl font-bold italic">{consistency}%</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Consistency</span>
          </CardContent>
        </Card>
        <Card className="hidden md:flex bg-muted/30 border-muted shadow-none">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-1 w-full">
            <Dumbbell className="size-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{totalPRs}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Exercises logged</span>
          </CardContent>
        </Card>
      </div>

      {/* Active Session / Quick Start Toggle */}
      {hasActiveSession ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Active Session
          </h2>
          <Card className="relative overflow-hidden border-none bg-primary shadow-2xl shadow-primary/30 text-primary-foreground animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Activity className="size-24 -mr-8 -mt-8 animate-pulse" />
            </div>
            <div className="absolute top-0 right-0 p-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                Workout in Progress
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 font-bold text-base">
                You are currently doing "{activeWorkoutName}"
              </CardDescription>
            </CardHeader>
            <CardFooter className="relative z-10">
              <Button asChild size="lg" variant="secondary" className="w-full group font-black rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Link href="/dashboard/active">
                  Resume Session
                  <ChevronRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Play className="size-5 fill-primary text-primary" />
            Start Workout
          </h2>
          
          <Card className="border-none shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/20 relative">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-4 relative">
              <div className="flex-1 w-full max-w-md">
                <WorkoutSelector workouts={workouts} />
                {(!workouts || workouts.length === 0) && (
                  <p className="mt-2 text-[10px] text-center text-muted-foreground font-medium italic">
                    No routines found. <Link href="/workouts" className="text-primary hover:underline">Create one</Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent Activity */}
      {lastSession && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HistoryIcon className="size-5 text-muted-foreground" />
            Last Workout
          </h2>
          <Card className="overflow-hidden border-none bg-gradient-to-br from-card to-muted/30">
            <CardContent className="p-0">
              <div className="flex items-center p-5 gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary-foreground shrink-0 border border-secondary/20 shadow-inner">
                  <Activity className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{lastWorkoutName}</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {new Date(lastSession.ended_at!).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" asChild>
                  <Link href={`/history/${lastSession.id}`}>
                    <ChevronRight className="size-5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
