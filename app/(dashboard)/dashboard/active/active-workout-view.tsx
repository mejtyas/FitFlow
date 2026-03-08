"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { endWorkout, addSetToSessionExercise, updateSet, deleteSet, addExerciseToSession } from "@/app/actions/workout-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, StopCircle, Trash2, TrendingUp } from "lucide-react";

type SetRow = { id: string; set_index: number; kg: number | null; reps: number | null };
type SessionExercise = {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise_name: string;
  sets: SetRow[];
  previous_sets?: { kg: number | null; reps: number | null }[];
};
type ExerciseOption = { id: string; name: string };

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActiveWorkoutView({
  sessionId,
  startedAt,
  workoutName,
  sessionExercises,
  availableExercises,
}: {
  sessionId: string;
  startedAt: string;
  workoutName: string;
  sessionExercises: SessionExercise[];
  availableExercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(sessionExercises);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Only sync structural changes (added/removed exercises or sets) from server,
    // but preserve local kg/reps values to avoid overwriting user input
    setExercises((prev) => {
      const prevById = new Map<string, SetRow>();
      for (const ex of prev) {
        for (const s of ex.sets) {
          prevById.set(s.id, s);
        }
      }
      return sessionExercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          const local = prevById.get(s.id);
          return local ? { ...s, kg: local.kg, reps: local.reps } : s;
        }),
      }));
    });
  }, [sessionExercises]);
  const [ending, setEnding] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);

  const startedMs = new Date(startedAt).getTime();

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startedMs);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedMs]);

  const handleEnd = useCallback(async () => {
    setEnding(true);
    await endWorkout(sessionId);
    router.push("/dashboard");
    router.refresh();
  }, [sessionId, router]);

  const handleAddSet = useCallback(async (sessionExerciseId: string) => {
    const result = await addSetToSessionExercise(sessionExerciseId);
    if (result.error) return;
    router.refresh();
  }, [router]);

  const handleSetChange = useCallback(
    (setId: string, field: "kg" | "reps", value: number | "") => {
      const num = value === "" ? null : Number(value);
      // Update local state immediately (optimistic)
      setExercises((prev) =>
        prev.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId
              ? { ...s, [field]: num }
              : s
          ),
        }))
      );
      // Fire-and-forget server update (don't block UI)
      updateSet(setId, field === "kg" ? { kg: num ?? null } : { reps: num ?? null });
    },
    []
  );
  
  const handleDeleteSet = useCallback(async (setId: string) => {
    const result = await deleteSet(setId);
    if (result.error) return;
    router.refresh();
  }, [router]);

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      const result = await addExerciseToSession(sessionId, exerciseId);
      if (result.error) return;
      setAddExerciseOpen(false);
      router.refresh();
    },
    [sessionId, router]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center justify-between gap-4 sticky top-16 z-20 bg-background/80 backdrop-blur-xl py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-transparent data-[stuck]:border-border transition-all">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold tracking-tight text-primary">
            {workoutName}
          </h1>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-lg font-black tabular-nums tracking-tighter">
              {formatDuration(elapsed)}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={handleEnd}
          disabled={ending}
          size="sm"
          className="rounded-xl font-bold px-5 shadow-lg shadow-destructive/20 h-10 group"
        >
          <StopCircle className="size-4 mr-2 group-hover:scale-110 transition-transform" />
          End Session
        </Button>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {exercises.map((ex) => (
          <Card key={ex.id} className="overflow-hidden shadow-sm border-muted/60">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold tracking-tight">
                {ex.exercise_name}
              </CardTitle>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {ex.sets.length} {ex.sets.length === 1 ? 'Set' : 'Sets'}
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {ex.previous_sets && ex.previous_sets.length > 0 && (
                <div className="mb-4 p-2 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <TrendingUp className="size-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/70">Previous Session</span>
                  </div>
                  <div className="flex gap-4 px-1">
                    {ex.previous_sets.map((ps, i) => (
                      <div key={i} className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60">Set {i + 1}:</span>
                        <span className="text-xs font-black text-primary/80">
                          {ps.kg ?? 0}kg × {ps.reps ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ex.sets.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_40px_40px] gap-3 px-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">KG</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Reps</span>
                  <span className="sr-only">Set #</span>
                  <span className="sr-only">Delete</span>
                </div>
              )}
              {ex.sets.map((set, index) => (
                <div
                  key={set.id}
                  className="grid grid-cols-[1fr_1fr_40px_40px] gap-3 items-center animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <Input
                      id={`kg-${set.id}`}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={set.kg ?? ""}
                      onChange={(e) =>
                        handleSetChange(set.id, "kg", e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      className="h-9 rounded-xl font-bold bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      id={`reps-${set.id}`}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={set.reps ?? ""}
                      onChange={(e) =>
                        handleSetChange(set.id, "reps", e.target.value === "" ? "" : parseInt(e.target.value, 10))
                      }
                      className="h-9 rounded-xl font-bold bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[10px] font-black text-muted-foreground/40 bg-muted/50 size-6 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => handleDeleteSet(set.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full mt-1 h-8 rounded-xl border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all text-[11px] font-bold uppercase tracking-wider"
                onClick={() => handleAddSet(ex.id)}
              >
                <Plus className="size-3 mr-1" /> Add Set
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors rounded-2xl cursor-pointer overflow-hidden group">
          <CardContent className="p-0">
            {addExerciseOpen ? (
              <div className="p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Add Exercise</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full"
                    onClick={() => setAddExerciseOpen(false)}
                  >
                    <Plus className="size-3 rotate-45" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableExercises
                    .filter(
                      (e) => !exercises.some((se) => se.exercise_id === e.id)
                    )
                    .map((e) => (
                      <Button
                        key={e.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-xl font-bold h-9 px-4 hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={() => handleAddExercise(e.id)}
                      >
                        {e.name}
                      </Button>
                    ))}
                </div>
                {availableExercises.filter(
                  (e) => !exercises.some((se) => se.exercise_id === e.id)
                ).length === 0 && (
                  <p className="text-xs text-center py-4 text-muted-foreground font-medium italic">
                    All your exercises are already in this workout.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="w-full flex flex-col items-center justify-center py-8 gap-2 group-hover:scale-105 transition-transform"
                onClick={() => setAddExerciseOpen(true)}
              >
                <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                  <Plus className="size-6" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Add Movement</span>
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
