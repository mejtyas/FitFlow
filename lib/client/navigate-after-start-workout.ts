'use client';

import type { StartWorkoutResult } from '@/app/actions/workout-session';

type RouterLike = { push: (href: string) => void; refresh: () => void };

/**
 * Handles routing after `startWorkout`: active-session confirm, errors, success.
 * @returns true if navigation or early exit was handled (caller should stop).
 */
export function navigateAfterStartWorkout(
  router: RouterLike,
  result: StartWorkoutResult
): boolean {
  if ('error' in result && result.error) {
    if (
      result.error === 'active_session_exists' &&
      'existingSessionId' in result &&
      typeof result.existingSessionId === 'string'
    ) {
      const resume = window.confirm(
        'You already have an active workout. Open it instead of starting a new one?'
      );
      if (resume) {
        router.push(`/dashboard/active?session=${result.existingSessionId}`);
        router.refresh();
      }
      return true;
    }
    console.error(result.error);
    return true;
  }

  if ('sessionId' in result && result.sessionId) {
    router.push(`/dashboard/active?session=${result.sessionId}`);
    router.refresh();
    return true;
  }
  return false;
}
