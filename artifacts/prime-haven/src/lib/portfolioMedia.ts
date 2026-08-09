import { supabase } from '@/integrations/supabase/client';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

export const isImagePath = (path?: string | null) => !!path && IMAGE_EXT.test(path);

/**
 * Resolves storage paths of a designer's approved submissions into
 * temporary signed URLs (server-side, so public visitors can view them too).
 */
export const fetchPortfolioMedia = async (designerId: string): Promise<Record<string, string>> => {
  if (!designerId) return {};
  try {
    const { data, error } = await supabase.functions.invoke('portfolio-media', {
      body: { designer_id: designerId },
    });
    if (error) throw error;
    return (data as { media?: Record<string, string> })?.media ?? {};
  } catch (err) {
    console.error('Failed to resolve portfolio media:', err);
    return {};
  }
};

/** Picks the first previewable image URL for a submission. */
export const previewUrl = (
  files: string[] | null | undefined,
  media: Record<string, string>,
): string | null => {
  for (const path of files ?? []) {
    if (!path) continue;
    if (/^https?:\/\//i.test(path)) return isImagePath(path) ? path : null;
    if (isImagePath(path) && media[path]) return media[path];
  }
  return null;
};
