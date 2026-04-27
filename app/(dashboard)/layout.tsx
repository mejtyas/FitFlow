import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard-nav';
import { signOut } from '@/app/actions/auth';
import { LogOut, User, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {redirect('/login');}

  const { data: activeSession } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Ensure we don't show the banner if no session was actually found
  const hasActiveSession = !!activeSession;

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              F
            </span>
            FitFlow
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <DashboardNav variant="desktop" />
        </div>
        <div className="mt-auto border-t p-4">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 hover:bg-muted/80 transition-colors">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{user.email?.split('@')[0]}</p>
              <p className="truncate text-[10px] text-muted-foreground uppercase tracking-widest">Athlete</p>
            </div>
          </Link>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-lg md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              F
            </span>
            FitFlow
          </Link>
          <div className="flex items-center gap-2">
            <form action={signOut}>
              <button
                type="submit"
                className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10 pb-24 md:pb-10">
          <div className="mx-auto max-w-4xl">
            {hasActiveSession && (
              <Link 
                href="/dashboard/active" 
                className="flex items-center justify-between bg-primary p-3 rounded-2xl mb-6 text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform animate-in slide-in-from-top-2"
              >
                <div className="flex items-center gap-3 ml-2">
                  <div className="size-2 rounded-full bg-white animate-pulse" />
                  <span className="text-sm font-black uppercase tracking-widest">Workout Active</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-sm bg-white/20 px-4 py-1.5 rounded-xl">
                  Resume <Activity className="size-4 ml-1" />
                </div>
              </Link>
            )}
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <DashboardNav variant="mobile" />
    </div>
  );
}
