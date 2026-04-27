/** Persist session set rows via `/api/session-sets/flush` — avoids Server Action POST + proxy middleware edge cases (see unexpected RSC payloads). */

export type SessionSetsFlushUpdate = {
  setId: string;
  kg: number | null;
  reps: number | null;
  completed?: boolean;
};

export async function postSessionSetsFlush(
  sessionId: string,
  updates: SessionSetsFlushUpdate[],
  options?: { keepalive?: boolean }
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch('/api/session-sets/flush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, updates }),
    ...(options?.keepalive ? { keepalive: true as const } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { error: json.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
