"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createExercise, deleteExercise } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Trash2, Pencil, Search, X, Dumbbell, Save, ChevronRight } from "lucide-react";
import Link from "next/link";

type Exercise = { id: string; name: string; description: string | null; created_at: string };

export function ExerciseList({ exercises: initial }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    setExercises(initial);
  }, [initial]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises;
    return exercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exercises, searchQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("name", newName.trim());
    if (newDescription.trim()) formData.set("description", newDescription.trim());
    const result = await createExercise(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewName("");
    setNewDescription("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this exercise? It will be removed from all workouts.")) return;
    setError(null);
    const result = await deleteExercise(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function startEdit(ex: Exercise) {
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditDescription(ex.description ?? "");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("name", editName.trim());
    if (editDescription.trim()) formData.set("description", editDescription.trim());
    const { updateExercise } = await import("@/app/actions/exercises");
    const result = await updateExercise(id, formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name: editName.trim(), description: editDescription.trim() || null } : e)).sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[350px_1fr]">
        {/* Left Column: Add/Search */}
        <div className="space-y-6">
          <Card className="shadow-lg shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                Add New Exercise
              </CardTitle>
              <CardDescription>
                Create a custom exercise for your library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Exercise Name
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="e.g. Incline Bench Press"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={loading}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-description" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Description <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="new-description"
                    placeholder="e.g. Seat height 3, grip width 2"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    disabled={loading}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-xl font-bold shadow-md shadow-primary/20"
                  disabled={loading || !newName.trim()}
                >
                  {loading ? "Adding..." : "Create Exercise"}
                </Button>
                {error && (
                  <p className="mt-2 text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full transition-colors"
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Exercise List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-primary" />
              Your Library ({filteredExercises.length})
            </h2>
          </div>

          <div className="grid gap-2">
            {filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/20 border-2 border-dashed rounded-3xl">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Dumbbell className="size-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg">No exercises found</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {searchQuery ? `No results for "${searchQuery}".` : "Your library is empty. Add your first exercise on the left."}
                  </p>
                </div>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="rounded-full">
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              filteredExercises.map((ex) => (
                <Card key={ex.id} className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    {editingId === ex.id ? (
                      <div className="flex w-full flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 rounded-lg"
                            placeholder="Exercise name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(ex.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => saveEdit(ex.id)}
                            disabled={loading}
                            className="rounded-lg px-4"
                          >
                            <Save className="mr-2 size-4" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg"
                          >
                            Cancel
                          </Button>
                        </div>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="flex-1 rounded-lg"
                          placeholder="Description (optional)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(ex.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <Link 
                          href={`/exercises/${ex.id}`}
                          className="flex-1 flex items-center gap-4 min-w-0 group/link"
                        >
                          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground shrink-0 border border-secondary/20 shadow-inner group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Dumbbell className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-base block truncate group-hover:text-primary transition-colors">
                              {ex.name}
                            </span>
                            {ex.description && (
                              <span className="text-xs text-muted-foreground block truncate">
                                {ex.description}
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => startEdit(ex)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleDelete(ex.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Link href={`/exercises/${ex.id}`}>
                            <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all ml-1" />
                          </Link>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
