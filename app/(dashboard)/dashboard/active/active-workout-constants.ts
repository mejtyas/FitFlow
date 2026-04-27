/** Default rest between sets: 2m 30s */
export const REST_DEFAULT_SECONDS = 150;

/** Debounce persistence of kg/reps — rapid Server Action calls trigger Next.js 16 flight errors */
export const SET_SAVE_DEBOUNCE_MS = 400;

export const ACTIVE_SESSION_LS_PREFIX = 'fitflow:activeSession:';

export const REST_PRESET_SECONDS = [60, 90, 120, 150, 180, 300] as const;
