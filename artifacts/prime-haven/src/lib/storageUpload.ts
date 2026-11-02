import { supabase } from '@/integrations/supabase/client';

export interface StorageUploadOptions {
  bucket: string;
  file: File | Blob;
  fileName?: string;
  userId?: string;
  pathPrefix?: string;
}

export interface StorageUploadResult {
  path: string;
  url: string;
  bucket: string;
}

/**
 * Uploads a file to Supabase Storage seamlessly.
 * Uses signed upload URLs generated server-side via the service role key to bypass client RLS issues.
 * Gracefully falls back to direct Supabase client upload or base64 backend upload if needed.
 */
export async function uploadToStorage({
  bucket,
  file,
  fileName,
  userId,
  pathPrefix,
}: StorageUploadOptions): Promise<StorageUploadResult> {
  const name = fileName || (file instanceof File ? file.name : 'upload.bin');
  const prefix = pathPrefix || userId || 'public';
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = crypto.randomUUID();
  const path = `${cleanPrefix}/${uniqueId}_${safeName}`;

  // 1. Try server-side signed upload URL (bypasses RLS restrictions securely)
  try {
    const signRes = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path }),
    });

    if (signRes.ok) {
      const data = await signRes.json();
      if (data.signedUploadUrl) {
        // Upload file via PUT to the signed upload URL
        const putRes = await fetch(data.signedUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (putRes.ok) {
          return {
            path,
            url: data.publicUrl || `https://iuoyngmfpxqgjutmvauj.supabase.co/storage/v1/object/public/${bucket}/${path}`,
            bucket,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Signed upload URL attempt failed, trying direct upload:', err);
  }

  // 2. Direct Supabase Storage client fallback
  try {
    const { error: directErr } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: true,
    });

    if (!directErr) {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
      return {
        path,
        url: pubData.publicUrl,
        bucket,
      };
    }
  } catch (directErr) {
    console.warn('Direct upload attempt failed:', directErr);
  }

  // 3. Fallback to server-side base64 upload
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fbRes = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket,
      path,
      base64Data,
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!fbRes.ok) {
    const errText = await fbRes.text().catch(() => '');
    throw new Error(`Failed to upload file (${fbRes.status}): ${errText || 'Upload rejected'}`);
  }

  const fbData = await fbRes.json();
  return {
    path,
    url: fbData.publicUrl || `https://iuoyngmfpxqgjutmvauj.supabase.co/storage/v1/object/public/${bucket}/${path}`,
    bucket,
  };
}
