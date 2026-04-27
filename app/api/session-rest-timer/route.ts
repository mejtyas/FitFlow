import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  applyRestTimerOpForUser,
  type RestTimerClientState,
  type RestTimerOp,
} from '@/lib/workout-session/session-rest-timer';
import { isValidUuid } from '@/lib/validation';

type Body = {
  sessionId: string;
  op: RestTimerOp;
};

type ApiResult = {
  error?: string;
  state?: RestTimerClientState;
};

function isRestTimerOp(value: unknown): value is RestTimerOp {
  if (!value || typeof value !== 'object') {return false;}
  const v = value as { kind?: unknown; durationMs?: unknown };
  if (typeof v.kind !== 'string') {return false;}
  if (v.kind === 'start') {
    return typeof v.durationMs === 'number' && Number.isFinite(v.durationMs);
  }
  return (
    v.kind === 'stop' ||
    v.kind === 'pause' ||
    v.kind === 'resume' ||
    v.kind === 'restart' ||
    v.kind === 'pull'
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' } satisfies ApiResult, {
      status: 400,
    });
  }

  const sessionId =
    typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!isValidUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid session' } satisfies ApiResult, {
      status: 400,
    });
  }
  if (!isRestTimerOp(body.op)) {
    return NextResponse.json({ error: 'Invalid operation' } satisfies ApiResult, {
      status: 400,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResult, {
      status: 401,
    });
  }

  const result = await applyRestTimerOpForUser(
    supabase,
    user.id,
    sessionId,
    body.op
  );
  // #region agent log
  await fetch(
    'http://127.0.0.1:7650/ingest/24022f7c-931a-4b22-85c4-6daa3a2a0c08',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '73a2e7',
      },
      body: JSON.stringify({
        sessionId: '73a2e7',
        location: 'session-rest-timer/route.ts:POST',
        message: 'applyRestTimerOpForUser',
        data: {
          opKind: body.op.kind,
          hasError: 'error' in result,
          err:
            'error' in result ? (result as { error: string }).error : null,
          stateTarget:
            'state' in result
              ? (result as { state: RestTimerClientState }).state.targetMs
              : null,
        },
        timestamp: Date.now(),
        hypothesisId: 'B',
        runId: 'pre-fix',
      }),
    }
  ).catch(() => {});
  // #endregion
  if ('error' in result) {
    return NextResponse.json({ error: result.error } satisfies ApiResult, {
      status: 400,
    });
  }

  if (body.op.kind !== 'pull') {
    revalidatePath('/dashboard/active');
  }

  return NextResponse.json({ state: result.state } satisfies ApiResult);
}
