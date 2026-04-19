import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateCompletedSessionTimesForUser } from "@/lib/workout-session/update-completed-session-times";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("startedAt" in body) ||
    !("endedAt" in body)
  ) {
    return NextResponse.json(
      { error: "Expected startedAt and endedAt strings." },
      { status: 400 }
    );
  }

  const startedAt = (body as { startedAt?: unknown }).startedAt;
  const endedAt = (body as { endedAt?: unknown }).endedAt;
  if (typeof startedAt !== "string" || typeof endedAt !== "string") {
    return NextResponse.json(
      { error: "startedAt and endedAt must be strings." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateCompletedSessionTimesForUser(
    supabase,
    user.id,
    sessionId,
    { startedAt, endedAt }
  );

  if ("error" in result) {
    const status =
      result.error === "Session not found or access denied" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  revalidatePath("/history");
  revalidatePath(`/history/${sessionId}`);
  revalidatePath("/stats");

  return NextResponse.json({ ok: true });
}
