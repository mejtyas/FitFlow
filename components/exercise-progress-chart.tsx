'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExerciseProgressPoint } from '@/lib/exercise-progress-series';
import { Button } from '@/components/ui/button';

type Metric = 'estimatedOneRm' | 'maxKg' | 'volume';

const CHART_PRIMARY = 'var(--chart-1)';
const GRID_STROKE = 'var(--border)';
const AXIS_TICK = 'var(--muted-foreground)';

function formatVolume(v: number): string {
  if (v >= 1000) {return `${(v / 1000).toFixed(1)}k`;}
  return Math.round(v).toLocaleString();
}

function formatEstOneRm(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function ExerciseProgressChart({
  points,
}: {
  points: ExerciseProgressPoint[];
}) {
  const [metric, setMetric] = useState<Metric>('estimatedOneRm');

  const data = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        x: p.dateLabel,
      })),
    [points]
  );

  const yKey =
    metric === 'estimatedOneRm'
      ? 'estimatedOneRm'
      : metric === 'maxKg'
        ? 'maxKg'
        : 'volume';
  const yLabel =
    metric === 'estimatedOneRm'
      ? 'est. 1RM (Epley)'
      : metric === 'maxKg'
        ? 'kg'
        : 'volume (kg×reps)';

  /** Zoom Y-axis to visible data so small changes (e.g. 80→85 kg) read as real movement */
  const yDomain = useMemo((): [number, number] => {
    const vals = data
      .map((row) =>
        yKey === 'estimatedOneRm'
          ? row.estimatedOneRm
          : yKey === 'maxKg'
            ? row.maxKg
            : row.volume
      )
      .filter((v) => Number.isFinite(v));
    if (vals.length === 0) {return [0, 1];}
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (lo === hi) {
      const bump = Math.max(Math.abs(lo) * 0.03, metric === 'volume' ? 50 : 1.5);
      return [Math.max(0, lo - bump), hi + bump];
    }
    const span = hi - lo;
    const pad = Math.max(span * 0.2, metric === 'volume' ? span * 0.1 : 1);
    const boundedLo = metric === 'volume' ? Math.max(0, lo - pad) : Math.max(0, lo - pad);
    const paddedHi = hi + pad;
    if (boundedLo >= paddedHi) {return [0, paddedHi || 1];}
    return [boundedLo, paddedHi];
  }, [data, metric, yKey]);

  if (data.length === 0) {return null;}

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {yLabel}
        </p>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant={metric === 'estimatedOneRm' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-tight sm:px-3"
            onClick={() => setMetric('estimatedOneRm')}
          >
            Strength
          </Button>
          <Button
            type="button"
            variant={metric === 'maxKg' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-tight sm:px-3"
            onClick={() => setMetric('maxKg')}
          >
            Max weight
          </Button>
          <Button
            type="button"
            variant={metric === 'volume' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-tight sm:px-3"
            onClick={() => setMetric('volume')}
          >
            Volume
          </Button>
        </div>
      </div>
      <div className="h-[min(48vh,340px)] min-h-[260px] w-full min-w-0 sm:min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 8, left: 4, bottom: data.length > 6 ? 28 : 8 }}
          >
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fill: AXIS_TICK, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              interval={data.length > 12 ? 'preserveStartEnd' : 0}
              angle={data.length > 6 ? -35 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 48 : 28}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: AXIS_TICK, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={metric === 'volume' ? 44 : 40}
              tickFormatter={(v) =>
                metric === 'volume'
                  ? formatVolume(Number(v))
                  : metric === 'estimatedOneRm'
                    ? formatEstOneRm(Number(v))
                    : String(v)
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {return null;}
                const p = payload[0].payload as ExerciseProgressPoint & { x: string };
                const valStr =
                  metric === 'estimatedOneRm'
                    ? `${formatEstOneRm(p.estimatedOneRm)} kg est.`
                    : metric === 'maxKg'
                      ? `${p.maxKg} kg`
                      : `${Math.round(p.volume).toLocaleString()} kg×reps`;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-popover-foreground">{p.workoutName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.startedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="mt-1 font-mono font-bold tabular-nums text-foreground">
                      {metric === 'estimatedOneRm'
                        ? `Strength: ${valStr}`
                        : metric === 'maxKg'
                          ? valStr
                          : `Volume: ${valStr}`}
                    </p>
                    {metric === 'estimatedOneRm' &&
                    (p.strengthSetKg > 0 || p.strengthSetReps > 0) ? (
                      <p className="text-[10px] text-muted-foreground">
                        From set: {p.strengthSetKg} kg × {p.strengthSetReps} reps (Epley)
                      </p>
                    ) : null}
                    {metric === 'maxKg' && (p.bestSetKg > 0 || p.bestSetReps > 0) ? (
                      <p className="text-[10px] text-muted-foreground">
                        Heaviest set: {p.bestSetKg} kg × {p.bestSetReps} reps
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_PRIMARY, stroke: 'var(--background)', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
