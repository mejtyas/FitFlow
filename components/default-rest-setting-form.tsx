'use client';

import { REST_PRESET_SECONDS } from '@/app/(dashboard)/dashboard/active/active-workout-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getDefaultRestSeconds,
  saveDefaultRestSeconds,
} from '@/lib/rest-preferences';
import { useState } from 'react';

function formatRestLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
}

export function DefaultRestSettingForm() {
  const [seconds, setSeconds] = useState(() => getDefaultRestSeconds());
  const [customDraft, setCustomDraft] = useState(() =>
    String(getDefaultRestSeconds())
  );
  const [saved, setSaved] = useState(false);

  const commitCustom = () => {
    const n = Number.parseInt(customDraft, 10);
    if (!Number.isFinite(n)) {
      return;
    }
    const clamped = Math.min(600, Math.max(15, n));
    setSeconds(clamped);
    setCustomDraft(String(clamped));
    saveDefaultRestSeconds(clamped);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const selectPreset = (sec: number) => {
    setSeconds(sec);
    setCustomDraft(String(sec));
    saveDefaultRestSeconds(sec);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium leading-relaxed text-muted-foreground">
        Default rest between sets during active workouts. You can still override
        rest per exercise on the workout screen.
      </p>
      <div className="flex flex-wrap gap-2">
        {REST_PRESET_SECONDS.map((sec) => (
          <Button
            key={sec}
            type="button"
            variant={seconds === sec ? 'default' : 'outline'}
            size="sm"
            className="cursor-pointer font-mono"
            onClick={() => selectPreset(sec)}
          >
            {formatRestLabel(sec)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label
            htmlFor="default-rest-seconds"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Custom (seconds)
          </Label>
          <Input
            id="default-rest-seconds"
            type="number"
            min={15}
            max={600}
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitCustom();
              }
            }}
            className="w-28 font-mono"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="cursor-pointer"
          onClick={commitCustom}
        >
          Save
        </Button>
        {saved ? (
          <span className="font-mono text-xs text-primary">Saved</span>
        ) : null}
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        Current default: {formatRestLabel(seconds)}
      </p>
    </div>
  );
}
