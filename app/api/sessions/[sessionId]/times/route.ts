import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireApiUser } from '@/lib/api/require-api-user';
import { updateCompletedSessionTimesForUser } from '@/lib/workout-session/update-completed-session-times';
import { isValidUuid } from '@/lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  if (!isValidUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('startedAt' in body) ||
    !('endedAt' in body)
  ) {
    return NextResponse.json(
      { error: 'Expected startedAt and endedAt strings.' },
      { status: 400 }
    );
  }

  const startedAt = (body as { startedAt?: unknown }).startedAt;
  const endedAt = (body as { endedAt?: unknown }).endedAt;
  if (typeof startedAt !== 'string' || typeof endedAt !== 'string') {
    return NextResponse.json(
      { error: 'startedAt and endedAt must be strings.' },
      { status: 400 }
    );
  }

  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { supabase, user } = auth;

  const result = await updateCompletedSessionTimesForUser(
    supabase,
    user.id,
    sessionId,
    { startedAt, endedAt }
  );

  if ('error' in result) {
    const status =
      result.error === 'Session not found or access denied' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  revalidatePath('/history');
  revalidatePath(`/history/${sessionId}`);
  revalidatePath('/stats');

  return NextResponse.json({ ok: true });
}
