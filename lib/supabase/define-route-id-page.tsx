import type { ReactNode } from 'react';
import { loadOptionalUserWithRouteId } from '@/lib/supabase/load-optional-user-with-route-id';

type RouteIdPageProps = {
  params: Promise<{ id: string }>;
};

type RouteIdCtx = NonNullable<Awaited<ReturnType<typeof loadOptionalUserWithRouteId>>>;

/** Shared auth + `params.id` wiring for server pages that return `null` when logged out. */
export function defineRouteIdPage(
  render: (ctx: RouteIdCtx) => Promise<ReactNode>
): (props: RouteIdPageProps) => Promise<ReactNode | null> {
  return async function RouteIdPage({ params }: RouteIdPageProps) {
    const ctx = await loadOptionalUserWithRouteId(params);
    if (!ctx) {
      return null;
    }
    return render(ctx);
  };
}
