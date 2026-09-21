import { CORE_SERVICES } from './coreServices';

/**
 * Single source of truth for the hiring tracks used by the applicant screening
 * funnel. Derived from the homepage services list so the two can never drift.
 * Mirrored server-side in supabase/functions/_shared/applicants.ts (TRACKS).
 */
export const TALENT_TRACKS = CORE_SERVICES.map((s) => s.title);

export type TalentTrack = string;

/** Tracks that do not include a practical exercise in the assessment. */
export const TRACKS_WITHOUT_PRACTICAL = ['Social Media Management'];

export const trackHasPractical = (track: string | null | undefined) =>
  !!track && !TRACKS_WITHOUT_PRACTICAL.includes(track);

/** Discord routing key per track. Channel IDs live in the post-job-contract function. */
export const trackToDiscordCategory = (track: string): string =>
  CORE_SERVICES.find((s) => s.title === track)?.slug ?? 'general';
