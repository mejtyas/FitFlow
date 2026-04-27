'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createExercise, deleteExercise } from '@/app/actions/exercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';

type Exercise = { id: string; name: string; description: string | null; created_at: string };

export function ExerciseList({ exercises: initial }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initial);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    setExercises(initial);
  }, [initial]);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {return exercises;}
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [exercises, searchQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {return;}
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set('name', newName.trim());
    if (newDescription.trim()) {formData.set('description', newDescription.trim());}
    const result = await createExercise(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setNewName('');
    setNewDescription('');
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exercise? It will be removed from all workouts.')) {return;}
    setError(null);
    setBusyDeleteId(id);
    const result = await deleteExercise(id);
    setBusyDeleteId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  function startEdit(ex: Exercise) {
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditDescription(ex.description ?? '');
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {return;}
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set('name', editName.trim());
    if (editDescription.trim()) {formData.set('description', editDescription.trim());}
    const { updateExercise } = await import('@/app/actions/exercises');
    const result = await updateExercise(id, formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditingId(null);
    setExercises((prev) =>
      prev
        .map((e) =>
          e.id === id
            ? { ...e, name: editName.trim(), description: editDescription.trim() || null }
            : e
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Plus className="size-4 text-primary" aria-hidden />
                New exercise
              </CardTitle>
              <CardDescription className="text-sm">
                Name is required; notes are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="new-name"
                  placeholder="e.g. Incline bench press"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={loading}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-description" className="text-sm font-medium">
                  Notes{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="new-description"
                  placeholder="e.g. Seat height, grip width"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={loading}
                  className="rounded-lg"
                />
              </div>
              <Button
                type="submit"
                className="w-full cursor-pointer rounded-lg font-semibold transition-colors duration-200"
                disabled={loading || !newName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Adding…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden />
                    Add exercise
                  </>
                )}
              </Button>
            </form>
            </CardContent>
          </Card>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border bg-background pl-10 pr-10"
            aria-label="Search exercises by name"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <section
        aria-labelledby="exercise-library-heading"
        className="min-h-0 lg:max-h-[min(42rem,calc(100vh-11rem))] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-muted/15 lg:p-1 lg:shadow-inner"
      >
        <div className="lg:p-3 lg:pt-2">
          <h2
            id="exercise-library-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Library{' '}
            <span className="tabular-nums text-foreground">{filteredExercises.length}</span>
          </h2>

          {filteredExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Dumbbell className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">No exercises here</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {searchQuery ? (
                    <>No names match your search.</>
                  ) : (
                    <>Use the composer to add your first exercise.</>
                  )}
                </p>
              </div>
              {searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer rounded-lg"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {filteredExercises.map((ex) => (
                <li key={ex.id}>
                  {editingId === ex.id ? (
                    <div className="space-y-3 bg-muted/30 p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg sm:flex-1"
                          placeholder="Exercise name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {void saveEdit(ex.id);}
                            if (e.key === 'Escape') {setEditingId(null);}
                          }}
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="cursor-pointer rounded-lg"
                            onClick={() => void saveEdit(ex.id)}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                                Saving…
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            className="cursor-pointer rounded-lg"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="rounded-lg"
                        placeholder="Notes (optional)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {void saveEdit(ex.id);}
                          if (e.key === 'Escape') {setEditingId(null);}
                        }}
                      />
                    </div>
                  ) : (
                    <article className="flex flex-col gap-3 p-4 transition-colors duration-200 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                      <Link
                        href={`/exercises/${ex.id}`}
                        className="group flex min-w-0 flex-1 cursor-pointer items-start gap-3 sm:items-center sm:gap-4"
                      >
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary"
                          aria-hidden
                        >
                          <Dumbbell className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                            {ex.name}
                          </p>
                          {ex.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {ex.description}
                            </p>
                          )}
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(ex)}
                          aria-label={`Edit ${ex.name}`}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={busyDeleteId === ex.id}
                          onClick={() => void handleDelete(ex.id)}
                          aria-label={`Delete ${ex.name}`}
                        >
                          {busyDeleteId === ex.id ? (
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                          ) : (
                            <Trash2 className="size-4" aria-hidden />
                          )}
                        </Button>
                      </div>
                    </article>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
