import type { SupabaseClient } from "@supabase/supabase-js";
import { clampKg, clampReps } from "@/lib/validation";

export type SessionSetKgRepsUpdate = {
  kg?: number | null;
  reps?: number | null;
};

export type SessionSetKgRepsFlush = {
  setId: string;
  kg: number | null;
  reps: number | null;
};

function buildPayload(updates: SessionSetKgRepsUpdate): {
  kg?: number | null;
  reps?: number | null;
} {
  const payload: { kg?: number | null; reps?: number | null } = {};
  if (updates.kg !== undefined) payload.kg = clampKg(updates.kg) ?? null;
  if (updates.reps !== undefined) payload.reps = clampReps(updates.reps) ?? null;
  return payload;
}

/** Confirms the workout session exists, belongs to user, and is still active (ended_at null). */
export async function assertActiveSessionOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  workoutSessionId: string
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", workoutSessionId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Unauthorized" };
  return {};
}

export async function verifySetBelongsToSession(
  supabase: SupabaseClient,
  setId: string,
  workoutSessionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("session_sets")
    .select("id, session_exercises!inner(workout_session_id)")
    .eq("id", setId)
    .maybeSingle();

  if (error || !data) return false;

  const inner = data.session_exercises as
    | { workout_session_id: string }
    | { workout_session_id: string }[]
    | null;

  const sid = Array.isArray(inner)
    ? inner[0]?.workout_session_id
    : inner?.workout_session_id;

  return sid === workoutSessionId;
}

/** Confirms session_exercise row is under the given (active) workout session. */
export async function verifySessionExerciseBelongsToSession(
  supabase: SupabaseClient,
  sessionExerciseId: string,
  workoutSessionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("id", sessionExerciseId)
    .eq("workout_session_id", workoutSessionId)
    .maybeSingle();

  return !error && !!data;
}

async function updateSessionSetKgRepsScoped(
  supabase: SupabaseClient,
  workoutSessionId: string,
  setId: string,
  updates: SessionSetKgRepsUpdate
): Promise<{ error?: string }> {
  const payload = buildPayload(updates);
  if (Object.keys(payload).length === 0) return {};

  const ok = await verifySetBelongsToSession(
    supabase,
    setId,
    workoutSessionId
  );
  if (!ok) return { error: "Set not found" };

  const { error } = await supabase
    .from("session_sets")
    .update(payload)
    .eq("id", setId);

  if (error) return { error: error.message };
  return {};
}

/** Single set update with user + active session ownership checks (for server actions). */
export async function updateSessionSetKgRepsForUser(
  supabase: SupabaseClient,
  userId: string,
  workoutSessionId: string,
  setId: string,
  updates: SessionSetKgRepsUpdate
): Promise<{ error?: string }> {
  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    userId,
    workoutSessionId
  );
  if (gate.error) return gate;

  return updateSessionSetKgRepsScoped(
    supabase,
    workoutSessionId,
    setId,
    updates
  );
}

/** Batch persist for keepalive flush; verifies session once then updates each set under that session. */
export async function flushSessionSetsForActiveWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutSessionId: string,
  updates: SessionSetKgRepsFlush[]
): Promise<{ error?: string }> {
  if (updates.length === 0) return {};

  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    userId,
    workoutSessionId
  );
  if (gate.error) return gate;

  const settled = await Promise.allSettled(
    updates.map((u) =>
      updateSessionSetKgRepsScoped(supabase, workoutSessionId, u.setId, {
        kg: u.kg,
        reps: u.reps,
      })
    )
  );

  const failures: string[] = [];
  for (const s of settled) {
    if (s.status === "rejected") {
      failures.push(
        s.reason instanceof Error ? s.reason.message : String(s.reason)
      );
      continue;
    }
    const err = s.value.error;
    if (err) failures.push(err);
  }

  if (failures.length > 0) {
    return {
      error: failures.length === 1
        ? failures[0]
        : `${failures.length} updates failed: ${failures.slice(0, 3).join("; ")}`,
    };
  }
  return {};
}
