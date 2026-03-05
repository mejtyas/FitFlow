import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, workout_id, workouts(name)")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (!sessions?.length) {
    const empty = [
      {
        date: "",
        workout_name: "",
        duration_minutes: "",
        exercise_name: "",
        set_index: "",
        kg: "",
        reps: "",
      },
    ];
    if (format === "csv") {
      const csv = Papa.unparse(empty);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="fitflow-history.csv"',
        },
      });
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(empty);
    XLSX.utils.book_append_sheet(wb, ws, "History");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="fitflow-history.xlsx"',
      },
    });
  }

  const rows: {
    date: string;
    workout_name: string;
    duration_minutes: string;
    exercise_name: string;
    set_index: number;
    kg: number | null;
    reps: number | null;
  }[] = [];

  for (const session of sessions) {
    const w = session.workouts as { name: string } | { name: string }[] | null;
    const workoutName = (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Freestyle";
    const started = new Date(session.started_at).getTime();
    const ended = session.ended_at ? new Date(session.ended_at).getTime() : started;
    const durationMin = ((ended - started) / 60000).toFixed(1);
    const dateStr = new Date(session.started_at).toLocaleDateString();

    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("id, exercises(name), session_sets(set_index, kg, reps)")
      .eq("workout_session_id", session.id)
      .order("order_index");

    for (const se of sessionExercises ?? []) {
      const ex = se.exercises as { name: string } | { name: string }[] | null;
      const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? "?";
      const sets = (se.session_sets as { set_index: number; kg: number | null; reps: number | null }[]) ?? [];
      for (const set of sets) {
        rows.push({
          date: dateStr,
          workout_name: workoutName,
          duration_minutes: durationMin,
          exercise_name: name,
          set_index: set.set_index + 1,
          kg: set.kg,
          reps: set.reps,
        });
      }
    }
  }

  if (format === "csv") {
    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fitflow-history.csv"',
      },
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "History");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="fitflow-history.xlsx"',
    },
  });
}
