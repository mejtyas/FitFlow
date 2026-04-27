'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateExerciseWarmupSettings } from '@/app/actions/exercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WarmupSettings } from '@/lib/warmup-settings';
import { Loader2 } from 'lucide-react';

export function ExerciseWarmupSettingsForm({
  exerciseId,
  initial,
}: {
  exerciseId: string;
  initial: WarmupSettings;
}) {
  const [w1Lo, setW1Lo] = useState(String(initial.w1_pct_low));
  const [w1Hi, setW1Hi] = useState(String(initial.w1_pct_high));
  const [w1Reps, setW1Reps] = useState(String(initial.w1_reps));
  const [w2Pct, setW2Pct] = useState(String(initial.w2_pct));
  const [w2Reps, setW2Reps] = useState(String(initial.w2_reps));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    const settings: WarmupSettings = {
      w1_pct_low: clampInt(parseInt(w1Lo, 10), 1, 100),
      w1_pct_high: clampInt(parseInt(w1Hi, 10), 1, 100),
      w1_reps: clampInt(parseInt(w1Reps, 10), 1, 99),
      w2_pct: clampInt(parseInt(w2Pct, 10), 1, 100),
      w2_reps: clampInt(parseInt(w2Reps, 10), 1, 99),
    };
    const low = Math.min(settings.w1_pct_low, settings.w1_pct_high);
    const high = Math.max(settings.w1_pct_low, settings.w1_pct_high);
    const normalized = { ...settings, w1_pct_low: low, w1_pct_high: high };

    startTransition(async () => {
      const res = await updateExerciseWarmupSettings(exerciseId, normalized);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wu-w1-lo" className="text-xs">
            First warm-up % (low)
          </Label>
          <Input
            id="wu-w1-lo"
            type="number"
            min={1}
            max={100}
            value={w1Lo}
            onChange={(e) => setW1Lo(e.target.value)}
            disabled={pending}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wu-w1-hi" className="text-xs">
            First warm-up % (high)
          </Label>
          <Input
            id="wu-w1-hi"
            type="number"
            min={1}
            max={100}
            value={w1Hi}
            onChange={(e) => setW1Hi(e.target.value)}
            disabled={pending}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wu-w1-reps" className="text-xs">
            First warm-up reps
          </Label>
          <Input
            id="wu-w1-reps"
            type="number"
            min={1}
            max={99}
            value={w1Reps}
            onChange={(e) => setW1Reps(e.target.value)}
            disabled={pending}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wu-w2-pct" className="text-xs">
            Second warm-up % of top
          </Label>
          <Input
            id="wu-w2-pct"
            type="number"
            min={1}
            max={100}
            value={w2Pct}
            onChange={(e) => setW2Pct(e.target.value)}
            disabled={pending}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wu-w2-reps" className="text-xs">
            Second warm-up reps
          </Label>
          <Input
            id="wu-w2-reps"
            type="number"
            min={1}
            max={99}
            value={w2Reps}
            onChange={(e) => setW2Reps(e.target.value)}
            disabled={pending}
            className="max-w-[200px] font-mono"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Working weight on the active workout is taken from the heaviest set in your last completed
        session for this exercise. The first warm-up uses the midpoint between low and high
        percentages; kg is rounded to 0.5.
      </p>
      <Button type="button" onClick={save} disabled={pending} className="font-semibold">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          'Save warm-up targets'
        )}
      </Button>
    </div>
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) {return min;}
  return Math.min(max, Math.max(min, Math.round(n)));
}
