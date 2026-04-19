"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditSessionTimesForm({
  sessionId,
  startedAtIso,
  endedAtIso,
}: {
  sessionId: string;
  startedAtIso: string;
  endedAtIso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startedLocal, setStartedLocal] = useState(() =>
    isoToDatetimeLocal(startedAtIso)
  );
  const [endedLocal, setEndedLocal] = useState(() =>
    isoToDatetimeLocal(endedAtIso)
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const startedAt = new Date(startedLocal).toISOString();
    const endedAt = new Date(endedLocal).toISOString();
    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      setError("End time must be after start time.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/times`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt, endedAt }),
      });
      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setError("Could not save times.");
        return;
      }
      if (!res.ok || data.error) {
        setError(data.error ?? "Could not save times.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Edit session times</CardTitle>
        <CardDescription>
          Correct start and end if you forgot to finish the workout or left it
          running.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-started">Start</Label>
              <Input
                id="session-started"
                type="datetime-local"
                value={startedLocal}
                onChange={(e) => setStartedLocal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-ended">End</Label>
              <Input
                id="session-ended"
                type="datetime-local"
                value={endedLocal}
                onChange={(e) => setEndedLocal(e.target.value)}
                required
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save times"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
