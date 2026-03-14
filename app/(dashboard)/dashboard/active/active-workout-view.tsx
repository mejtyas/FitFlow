"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { endWorkout, addSetToSessionExercise, updateSet, deleteSet, addExerciseToSession } from "@/app/actions/workout-session";
import { updateExerciseDescription } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, StopCircle, Trash2, TrendingUp, Check, Pause, Play, RotateCcw, X } from "lucide-react";

type SetRow = { id: string; set_index: number; kg: number | null; reps: number | null };
type SessionExercise = {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise_name: string;
  exercise_description: string | null;
  sets: SetRow[];
  previous_sets?: { kg: number | null; reps: number | null }[];
};
type ExerciseOption = { id: string; name: string; description: string | null };

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
  const [restStart, setRestStart] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [restPaused, setRestPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0);
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set());

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
  const [addExerciseOpen, setAddExerciseOpen] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");

  const startedMs = new Date(startedAt).getTime();

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startedMs);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedMs]);

  useEffect(() => {
    if (restStart === null || restPaused) return;
    const tick = () => setRestElapsed(Date.now() - restStart);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restStart, restPaused]);

  const handleConfirmSet = useCallback((setId: string) => {
    setConfirmedSets((prev) => new Set(prev).add(setId));
    setRestStart(Date.now());
    setRestPaused(false);
    setPausedAt(0);
    setRestElapsed(0);
  }, []);

  const handleEnd = useCallback(async () => {
    setEnding(true);
    await endWorkout(sessionId);
    router.push("/dashboard");
    router.refresh();
  }, [sessionId, router]);

  const handleAddSet = useCallback(async (sessionExerciseId: string) => {
    // Optimistic: append a placeholder set immediately
    const tempId = `temp-${Date.now()}`;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === sessionExerciseId
          ? { ...ex, sets: [...ex.sets, { id: tempId, set_index: (ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.set_index)) + 1 : 0), kg: null, reps: null }] }
          : ex
      )
    );

    const result = await addSetToSessionExercise(sessionExerciseId);
    if (result.error) {
      // Rollback on failure
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === sessionExerciseId
            ? { ...ex, sets: ex.sets.filter((s) => s.id !== tempId) }
            : ex
        )
      );
      return;
    }

    // Replace temp ID with real server ID
    if (result.set) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === sessionExerciseId
            ? { ...ex, sets: ex.sets.map((s) => s.id === tempId ? result.set! : s) }
            : ex
        )
      );
    }
  }, []);

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
    // Optimistic: remove the set immediately
    let snapshot: SessionExercise[] = [];
    setExercises((prev) => {
      snapshot = prev;
      return prev.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.id !== setId),
      }));
    });

    const result = await deleteSet(setId);
    if (result.error) {
      // Rollback on failure
      setExercises(snapshot);
    }
  }, []);

  const handleSaveDescription = useCallback(
    async (exerciseId: string) => {
      await updateExerciseDescription(exerciseId, editDescriptionValue);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? { ...ex, exercise_description: editDescriptionValue.trim() || null }
            : ex
        )
      );
      setEditingDescriptionId(null);
    },
    [editDescriptionValue]
  );

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      const exercise = availableExercises.find((e) => e.id === exerciseId);
      if (!exercise) return;

      // Find the exercise after which we're inserting
      const afterExId = addExerciseOpen;
      const insertIndex = exercises.findIndex((ex) => ex.id === afterExId);
      const insertAtOrder = insertIndex !== -1 ? exercises[insertIndex].order_index + 1 : exercises.length;
      const insertAtArrayPos = insertIndex !== -1 ? insertIndex + 1 : exercises.length;

      // Optimistic: insert exercise at the correct position
      const tempExId = `temp-ex-${Date.now()}`;
      const tempSetId = `temp-set-${Date.now()}`;
      const newExercise: SessionExercise = {
        id: tempExId,
        order_index: insertAtOrder,
        exercise_id: exerciseId,
        exercise_name: exercise.name,
        exercise_description: exercise.description,
        sets: [{ id: tempSetId, set_index: 0, kg: null, reps: null }],
        previous_sets: [],
      };

      // Build shifts from current state before optimistic update
      const shiftsById = exercises
        .slice(insertAtArrayPos)
        .map((ex) => ({ id: ex.id, order_index: ex.order_index + 1 }));

      setExercises((prev) => {
        const updated = [...prev];
        for (let i = insertAtArrayPos; i < updated.length; i++) {
          updated[i] = { ...updated[i], order_index: updated[i].order_index + 1 };
        }
        updated.splice(insertAtArrayPos, 0, newExercise);
        return updated;
      });
      setAddExerciseOpen(null);

      const result = await addExerciseToSession(sessionId, exerciseId, insertAtOrder, shiftsById.length > 0 ? shiftsById : undefined);
      if (result.error) {
        // Rollback on failure
        setExercises((prev) => prev.filter((ex) => ex.id !== tempExId));
        return;
      }

      // Replace temp IDs with real server IDs
      if (result.sessionExercise && result.initialSet) {
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === tempExId
              ? {
                  ...ex,
                  id: result.sessionExercise!.id,
                  order_index: result.sessionExercise!.order_index,
                  sets: [result.initialSet!],
                }
              : ex
          )
        );
      }
    },
    [sessionId, availableExercises, addExerciseOpen, exercises]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-xl pt-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-transparent data-[stuck]:border-border transition-all space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-primary">
              {workoutName}
            </h1>
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-bold tabular-nums tracking-tighter">
                {formatDuration(elapsed)}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={handleEnd}
            disabled={ending}
            size="sm"
            className="rounded-xl font-bold px-5 shadow-lg shadow-destructive/20 h-8 group"
          >
            <StopCircle className="size-4 group-hover:scale-110 transition-transform" />
            End Session
          </Button>
        </div>
        <div className={`flex items-center gap-3 rounded-full px-4 py-1.5 w-fit ${restStart !== null ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
          <span className="text-base font-black tabular-nums whitespace-nowrap">
            Rest: {formatDuration(restStart !== null ? (restPaused ? pausedAt : restElapsed) : 0)}
          </span>
          {restStart === null ? (
            <button
              type="button"
              className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors text-primary"
              onClick={() => {
                setRestStart(Date.now());
                setRestPaused(false);
                setPausedAt(0);
                setRestElapsed(0);
              }}
            >
              <Play className="size-4.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors"
                onClick={() => {
                  if (restPaused) {
                    setRestStart(Date.now() - pausedAt);
                    setRestPaused(false);
                  } else {
                    setPausedAt(restElapsed);
                    setRestPaused(true);
                  }
                }}
              >
                {restPaused ? <Play className="size-4.5" /> : <Pause className="size-4.5" />}
              </button>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors"
                onClick={() => {
                  setRestStart(Date.now());
                  setPausedAt(0);
                  setRestPaused(false);
                  setRestElapsed(0);
                }}
              >
                <RotateCcw className="size-4.5" />
              </button>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors"
                onClick={() => {
                  setRestStart(null);
                  setRestElapsed(0);
                  setRestPaused(false);
                  setPausedAt(0);
                }}
              >
                <X className="size-4.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {exercises.map((ex) => (
          <div key={ex.exercise_id} className="space-y-2">
          <Card className="overflow-hidden shadow-sm border-muted/60">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-tight">
                  {ex.exercise_name}
                </CardTitle>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {ex.sets.length} {ex.sets.length === 1 ? 'Set' : 'Sets'}
                </div>
              </div>
              {editingDescriptionId === ex.exercise_id ? (
                <Input
                  value={editDescriptionValue}
                  onChange={(e) => setEditDescriptionValue(e.target.value)}
                  placeholder="Add notes (machine settings, form cues...)"
                  className="h-7 text-xs mt-1 rounded-lg bg-background/50"
                  autoFocus
                  onBlur={() => handleSaveDescription(ex.exercise_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveDescription(ex.exercise_id);
                    if (e.key === "Escape") setEditingDescriptionId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => {
                    setEditingDescriptionId(ex.exercise_id);
                    setEditDescriptionValue(ex.exercise_description ?? "");
                  }}
                >
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {ex.exercise_description || "Add notes..."}
                  </p>
                </button>
              )}
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
                  <span className="sr-only">Done</span>
                  <span className="sr-only">Delete</span>
                </div>
              )}
              {ex.sets.map((set, index) => (
                <div
                  key={set.set_index}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`size-8 rounded-full transition-colors ${
                        confirmedSets.has(set.id)
                          ? "bg-green-500/15 text-green-600 hover:bg-green-500/25"
                          : "text-muted-foreground/30 hover:text-green-600 hover:bg-green-500/10"
                      }`}
                      onClick={() => handleConfirmSet(set.id)}
                    >
                      <Check className="size-3.5" />
                    </Button>
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
          {addExerciseOpen === ex.id ? (
            <div className="p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Add Exercise</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full"
                  onClick={() => setAddExerciseOpen(null)}
                >
                  <X className="size-3" />
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
                      className="rounded-xl font-bold h-8 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => handleAddExercise(e.id)}
                    >
                      {e.name}
                    </Button>
                  ))}
              </div>
              {availableExercises.filter(
                (e) => !exercises.some((se) => se.exercise_id === e.id)
              ).length === 0 && (
                <p className="text-xs text-center py-2 text-muted-foreground font-medium italic">
                  All exercises are already added.
                </p>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                className="size-7 rounded-full border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-muted-foreground/40 flex items-center justify-center transition-all"
                onClick={() => setAddExerciseOpen(ex.id)}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
          </div>
        ))}
      </div>
    </div>
  );
}
