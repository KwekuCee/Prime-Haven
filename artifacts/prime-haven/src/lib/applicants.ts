import { supabase } from '@/integrations/supabase/client';
import type { TalentTrack } from '@/lib/talentTracks';

export { TALENT_TRACKS, trackHasPractical, TRACKS_WITHOUT_PRACTICAL } from '@/lib/talentTracks';
export type { TalentTrack } from '@/lib/talentTracks';


export const APPLICANT_STATUSES = [
  'submitted',
  'invited',
  'in_review',
  'passed',
  'failed',
  'paid',
  'active',
] as const;
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export const APPLICANT_STATUS_LABELS: Record<string, string> = {
  submitted: 'New application',
  invited: 'Invited',
  in_review: 'Taking assessment',
  passed: 'Passed — awaiting fee',
  failed: 'Did not pass',
  paid: 'Fee paid — verifying email',
  active: 'Active professional',
};

/** Uploads an applicant file through a one-time signed URL. Returns the stored path. */
export const uploadApplicantFile = async (
  kind: 'cv' | 'portfolio' | 'practical',
  file: File,
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('applicant-upload-url', {
    body: { kind, fileName: file.name },
  });
  if (error) throw new Error('Upload could not be started. Please try again.');
  const payload = data as { success?: boolean; path?: string; token?: string; message?: string };
  if (!payload?.success || !payload.path || !payload.token) {
    throw new Error(payload?.message || 'That file could not be accepted.');
  }

  const { error: uploadError } = await supabase.storage
    .from('applicant-files')
    .uploadToSignedUrl(payload.path, payload.token, file);
  if (uploadError) throw new Error('The file upload failed. Please try again.');

  return payload.path;
};

/** Signed download link for an applicant file (admins only). */
export const getApplicantFileUrl = async (path: string): Promise<string | null> => {
  const { data } = await supabase.storage.from('applicant-files').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
};

export interface PortalState {
  applicant: {
    fullName: string;
    email: string;
    track: TalentTrack;
    status: ApplicantStatus;
    score: number | null;
    passed: boolean | null;
    videoWatched: boolean;
  };
  assessment: {
    id: string;
    score: number | null;
    passed: boolean | null;
    submitted_at: string | null;
    total_questions: number | null;
    correct_count: number | null;
  } | null;
  videoUrl: string;
  discordInvite: string;
}

export const fetchPortalState = async (token: string, action: 'state' | 'video_watched' = 'state') => {
  const { data, error } = await supabase.functions.invoke('applicant-portal', { body: { token, action } });
  if (error) {
    // Edge functions return a non-2xx body for gated stages; surface it.
    const ctx = (error as { context?: { json?: () => Promise<any> } }).context;
    if (ctx?.json) {
      try {
        const body = await ctx.json();
        return body as { success: false; error: string; message?: string };
      } catch {
        /* ignore */
      }
    }
    return { success: false as const, error: 'network_error', message: 'Could not load your portal.' };
  }
  return data as ({ success: true } & PortalState) | { success: false; error: string; message?: string };
};

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  question_type: string;
}

export interface PracticalTask {
  id: string;
  title: string;
  brief: string;
  submissionType: string;
}

/** Reports a copy attempt during the assessment. The server decides the outcome. */
export const reportCopyEvent = async (token: string) => {
  const { data, error } = await supabase.functions.invoke('applicant-integrity', { body: { token } });
  if (error) return { success: false as const, rejected: false, warning: false, message: '' };
  return data as { success: boolean; flags: number; rejected: boolean; warning: boolean; message?: string };
};

/** Admin: permanently delete an applicant, their attempts and their files. */
export const deleteApplicant = async (applicantId: string) => {
  const { data, error } = await supabase.functions.invoke('delete-applicant', { body: { applicantId } });
  if (error) return { success: false as const, message: 'Could not delete this applicant.' };
  return data as { success: boolean; error?: string; filesRemoved?: number };
};
