import { supabase } from '@/integrations/supabase/client';

/**
 * Paystack inline checkout helper.
 *
 * The publishable key lives on the server, so it is fetched once through the
 * `paystack-config` function and cached for the session.
 */
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

let keyPromise: Promise<string> | null = null;

export const getPaystackPublicKey = async (): Promise<string> => {
  if (!keyPromise) {
    keyPromise = supabase.functions
      .invoke('paystack-config')
      .then(({ data }) => String((data as any)?.publicKey || ''))
      .catch(() => '');
  }
  return keyPromise;
};

export const loadPaystackScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.PaystackPop) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-paystack]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.PaystackPop));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.setAttribute('data-paystack', 'true');
    s.onload = () => resolve(!!window.PaystackPop);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export interface PaystackCheckoutOptions {
  email: string;
  /** Amount in major units (cedis). Paystack charges in GHS. */
  amountGhs: number;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: () => void;
  onClose: () => void;
}

/** Opens Paystack inline checkout. Returns false when it cannot be started. */
export const openPaystackCheckout = async (opts: PaystackCheckoutOptions): Promise<boolean> => {
  const [key, ready] = await Promise.all([getPaystackPublicKey(), loadPaystackScript()]);
  if (!key || !ready || !window.PaystackPop) return false;

  const handler = window.PaystackPop.setup({
    key,
    email: opts.email,
    amount: Math.round(opts.amountGhs * 100),
    currency: 'GHS',
    ref: opts.reference,
    metadata: opts.metadata || {},
    callback: () => opts.onSuccess(),
    onClose: () => opts.onClose(),
  });
  handler.openIframe();
  return true;
};
