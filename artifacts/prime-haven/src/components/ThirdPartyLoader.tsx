import { useEffect, useCallback } from 'react';

// Loads the Korapay payment script on the production domain.
export default function ThirdPartyLoader() {
  const insertScript = useCallback((attrs: { src: string; async?: boolean }) => {
    const s = document.createElement('script');
    s.src = attrs.src;
    if (attrs.async) s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isProductionDomain =
      hostname === 'primehaven.tech' || hostname.endsWith('.primehaven.tech');

    if (!isProductionDomain) return;

    // Load critical payment script immediately (Korapay only)
    insertScript({ src: 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js', async: false });
  }, [insertScript]);

  return null;
}
