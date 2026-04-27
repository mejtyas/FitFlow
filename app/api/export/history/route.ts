import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-api-user';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

type HistoryXlsxRow = {
  date: string;
  workout_name: string;
  duration_minutes: string;
  exercise_name: string;
  exercise_logged_order: string | number;
  exercise_first_logged_at: string;
  set_index: string | number;
  kg: string | number | null;
  reps: string | number | null;
};

async function historyRowsToXlsxBlob(rows: HistoryXlsxRow[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('History');
  sheet.columns = [
    { header: 'date', key: 'date', width: 14 },
    { header: 'workout_name', key: 'workout_name', width: 28 },
    { header: 'duration_minutes', key: 'duration_minutes', width: 18 },
    { header: 'exercise_name', key: 'exercise_name', width: 28 },
    {
      header: 'exercise_logged_order',
      key: 'exercise_logged_order',
      width: 22,
    },
    {
      header: 'exercise_first_logged_at',
      key: 'exercise_first_logged_at',
      width: 26,
    },
    { header: 'set_index', key: 'set_index', width: 12 },
    { header: 'kg', key: 'kg', width: 10 },
    { header: 'reps', key: 'reps', width: 10 },
  ];
  rows.map((row) => sheet.addRow(row));
  const buf = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buf);
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { supabase, user } = auth;

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select(
      `
      id,
      started_at,
      ended_at,
      workout_id,
      workouts(name),
      session_exercises(
        order_index,
        logged_order,
        first_logged_at,
        exercises(name),
        session_sets(set_index, kg, reps)
      )
    `
    )
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  if (!sessions?.length) {
    const empty = [
      {
        date: '',
        workout_name: '',
        duration_minutes: '',
        exercise_name: '',
        exercise_logged_order: '',
        exercise_first_logged_at: '',
        set_index: '',
        kg: '',
        reps: '',
      },
    ];
    if (format === 'csv') {
      const csv = Papa.unparse(empty);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fitflow-history.csv"',
        },
      });
    }
    const body = await historyRowsToXlsxBlob(empty);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="fitflow-history.xlsx"',
      },
    });
  }

  const rows: {
    date: string;
    workout_name: string;
    duration_minutes: string;
    exercise_name: string;
    exercise_logged_order: number | null;
    exercise_first_logged_at: string | null;
    set_index: number;
    kg: number | null;
    reps: number | null;
  }[] = sessions.flatMap((session) => {
    const w = session.workouts as { name: string } | { name: string }[] | null;
    const workoutName = (Array.isArray(w) ? w[0]?.name : w?.name) ?? 'Unnamed Session';
    const started = new Date(session.started_at).getTime();
    const ended = session.ended_at ? new Date(session.ended_at).getTime() : started;
    const durationMin = ((ended - started) / 60000).toFixed(1);
    const dateStr = new Date(session.started_at).toLocaleDateString();

    const rawSes = session.session_exercises as
      | {
          order_index: number;
          logged_order: number | null;
          first_logged_at: string | null;
          exercises: { name: string } | { name: string }[] | null;
          session_sets: {
            set_index: number;
            kg: number | null;
            reps: number | null;
          }[];
        }[]
      | null;

    const sessionExercises = [...(rawSes ?? [])].sort(
      (a, b) => a.order_index - b.order_index
    );

    return sessionExercises.flatMap((se) => {
      const ex = se.exercises as { name: string } | { name: string }[] | null;
      const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? '?';
      const sets = (se.session_sets as { set_index: number; kg: number | null; reps: number | null }[]) ?? [];
      return sets.map((set) => ({
        date: dateStr,
        workout_name: workoutName,
        duration_minutes: durationMin,
        exercise_name: name,
        exercise_logged_order: se.logged_order,
        exercise_first_logged_at: se.first_logged_at,
        set_index: set.set_index + 1,
        kg: set.kg,
        reps: set.reps,
      }));
    });
  });

  if (format === 'csv') {
    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fitflow-history.csv"',
      },
    });
  }

  const body = await historyRowsToXlsxBlob(
    rows.map((r) => ({
      ...r,
      exercise_logged_order:
        r.exercise_logged_order === null || r.exercise_logged_order === undefined
          ? ''
          : r.exercise_logged_order,
      exercise_first_logged_at: r.exercise_first_logged_at ?? '',
      kg: r.kg ?? '',
      reps: r.reps ?? '',
    }))
  );
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fitflow-history.xlsx"',
    },
  });
}
