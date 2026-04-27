import { createClient } from '@/lib/supabase/server';
import { WorkoutForm } from '../workout-form';

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {return null;}

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New workout</h1>
      <WorkoutForm exercises={exercises ?? []} />
    </div>
  );
}
