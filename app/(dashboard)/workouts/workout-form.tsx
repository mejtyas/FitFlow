"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkout, updateWorkout } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

type Exercise = { id: string; name: string };
type ExerciseEntry = { exercise_id: string; default_sets: number };

export function WorkoutForm({
  exercises,
  workoutId,
  initialName = "",
  initialExercises = [],
}: {
  exercises: Exercise[];
  workoutId?: string;
  initialName?: string;
  initialExercises?: ExerciseEntry[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [entries, setEntries] = useState<ExerciseEntry[]>(initialExercises);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addExercise = (exerciseId: string) => {
    if (entries.some((e) => e.exercise_id === exerciseId)) return;
    setEntries((prev) => [...prev, { exercise_id: exerciseId, default_sets: 2 }]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= entries.length - 1) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const setDefaultSets = (index: number, value: number) => {
    const n = Math.max(1, Math.min(99, value));
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, default_sets: n } : e))
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("exercises", JSON.stringify(entries));

    const result = workoutId
      ? await updateWorkout(workoutId, formData)
      : await createWorkout(formData);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/workouts");
    router.refresh();
  }

  const getExerciseName = (id: string) =>
    exercises.find((e) => e.id === id)?.name ?? "?";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workout name</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="name" className="sr-only">
            Name
          </Label>
          <Input
            id="name"
            placeholder="e.g. Push day"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercises (order & default sets)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add exercises in order. Default sets is how many set rows appear when you start this workout.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {exercises.map((ex) => (
              <Button
                key={ex.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addExercise(ex.id)}
                disabled={entries.some((e) => e.exercise_id === ex.id)}
              >
                <Plus className="size-4" /> {ex.name}
              </Button>
            ))}
            {exercises.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No exercises yet. Add some in Exercises.
              </p>
            )}
          </div>

          <ul className="space-y-2">
            {entries.map((entry, index) => (
              <li
                key={`${entry.exercise_id}-${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-2"
              >
                <span className="w-6 text-muted-foreground">{index + 1}.</span>
                <span className="min-w-[120px] font-medium">
                  {getExerciseName(entry.exercise_id)}
                </span>
                <Label htmlFor={`sets-${index}`} className="sr-only">
                  Default sets
                </Label>
                <Input
                  id={`sets-${index}`}
                  type="number"
                  min={1}
                  max={99}
                  className="w-16"
                  value={entry.default_sets}
                  onChange={(e) =>
                    setDefaultSets(index, parseInt(e.target.value, 10) || 1)
                  }
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">default sets</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => moveDown(index)}
                    disabled={index === entries.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => removeEntry(index)}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {workoutId ? "Save workout" : "Create workout"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
