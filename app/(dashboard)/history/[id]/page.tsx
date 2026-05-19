import { notFound } from 'next/navigation';
import Link from 'next/link';
import { defineRouteIdPage } from '@/lib/supabase/define-route-id-page';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EditSessionTimesForm } from './edit-session-times-form';
import { isLoggedSetReps } from '@/lib/validation';

function formatShortDurationMs(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) {return `${s}s`;}
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatSessionClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default defineRouteIdPage(async ({ id, supabase, user }) => {
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, started_at, ended_at, workout_id, workouts(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!session || !session.ended_at) {notFound();}

  const { data: sessionExercises } = await supabase
    .from('session_exercises')
    .select(
      'id, order_index, logged_order, first_logged_at, exercise_id, exercises(name), session_sets(set_index, kg, reps)'
    )
    .eq('workout_session_id', id)
    .order('order_index');

  const { data: restPeriods } = await supabase
    .from('session_rest_periods')
    .select('id, started_at, ended_at, planned_target_ms')
    .eq('workout_session_id', id)
    .order('started_at');

  const w = session.workouts as { name: string } | { name: string }[] | null;
  const workoutName = (Array.isArray(w) ? w[0]?.name : w?.name) ?? 'Unnamed Session';
  const durationMs =
    new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
  const totalSeconds = Math.floor(durationMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">← History</Link>
          </Button>
          <h1 className="mt-2 text-xl font-semibold">{workoutName}</h1>
          <p className="text-muted-foreground">
            {new Date(session.started_at).toLocaleString()} · {durationStr}
          </p>
        </div>
      </div>

      <EditSessionTimesForm
        key={`${session.started_at}-${session.ended_at}`}
        sessionId={session.id}
        startedAtIso={session.started_at}
        endedAtIso={session.ended_at}
      />

      {(restPeriods?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rest (timer)</CardTitle>
            <p className="text-muted-foreground text-xs font-normal">
              Start and end of each rest countdown you ran during this session (pause does not split
              segments).
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(restPeriods ?? []).map((rp) => {
                const planned = rp.planned_target_ms;
                const endIso = rp.ended_at;
                const actualMs =
                  endIso !== null && endIso !== undefined
                    ? new Date(endIso).getTime() - new Date(rp.started_at).getTime()
                    : null;
                return (
                  <li key={rp.id} className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <span className="tabular-nums">
                      {formatSessionClock(rp.started_at)}
                      {' – '}
                      {endIso !== null && endIso !== undefined ? formatSessionClock(endIso) : '—'}
                    </span>
                    <span className="text-muted-foreground">
                      {actualMs !== null && actualMs !== undefined
                        ? `Actual ${formatShortDurationMs(actualMs)}`
                        : 'Incomplete'}
                      {` · Planned ${formatShortDurationMs(planned)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {(sessionExercises ?? []).map((se) => {
          const sets = (
            (se.session_sets as {
              set_index: number;
              kg: number | null;
              reps: number | null;
            }[]) ?? []
          )
            .filter((s) => isLoggedSetReps(s.reps))
            .sort((a, b) => a.set_index - b.set_index);
          const ex = se.exercises as { name: string } | { name: string }[] | null;
          const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? '?';
          const logOrder = se.logged_order as number | null | undefined;
          const firstLoggedAt = se.first_logged_at as string | null | undefined;
          return (
            <Card key={se.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{name}</CardTitle>
                {logOrder !== null && logOrder !== undefined && (
                  <p className="text-muted-foreground text-xs font-normal">
                    First logged as exercise #{logOrder + 1} in this session
                    {firstLoggedAt
                      ? ` · ${new Date(firstLoggedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                      : null}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {sets.map((set, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">Set {i + 1}:</span>
                      <span>
                        {set.kg !== null && set.kg !== undefined ? `${set.kg} kg` : '—'} ×{' '}
                        {set.reps !== null && set.reps !== undefined ? set.reps : '—'} reps
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
