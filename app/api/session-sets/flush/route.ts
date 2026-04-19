import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flushSessionSetsForActiveWorkout } from "@/lib/workout-session/persist-session-sets";
import { revalidatePath } from "next/cache";
import { clampKg, clampReps, isValidUuid } from "@/lib/validation";

type Body = {
  sessionId: string;
  updates: { setId: string; kg: number | null; reps: number | null }[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const updates = Array.isArray(body.updates) ? body.updates : [];

  if (!sessionId || updates.length === 0) {
    return NextResponse.json({ error: "Missing sessionId or updates" }, { status: 400 });
  }

  if (!isValidUuid(sessionId)) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const normalized = updates
    .filter(
      (u): u is Body["updates"][number] =>
        typeof u?.setId === "string" &&
        u.setId.length > 0 &&
        !u.setId.startsWith("temp-")
    )
    .map((u) => ({
      setId: u.setId,
      kg: clampKg(u.kg ?? null) ?? null,
      reps: clampReps(u.reps ?? null) ?? null,
    }));

  if (normalized.length === 0) {
    return NextResponse.json({ ok: true, applied: 0 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await flushSessionSetsForActiveWorkout(
    supabase,
    user.id,
    sessionId,
    normalized
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  revalidatePath("/dashboard/active");

  return NextResponse.json({ ok: true, applied: normalized.length });
}
