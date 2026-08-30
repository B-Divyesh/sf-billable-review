import type { LicenseState } from './types';

const SLUG = 'billable-review';
const KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${KEY}:verdict`;
const CHECKOUT_KEY = `${KEY}:checkout`;
export const BUY_URL = `https://api.sociobot.in/api/v1/products/${SLUG}/checkout`;
export type CheckoutAvailability = 'available' | 'unavailable' | 'unknown';

export function getCheckoutAvailability(): CheckoutAvailability {
  const cached = sessionStorage.getItem(CHECKOUT_KEY);
  return cached === 'available' || cached === 'unavailable' ? cached : 'unknown';
}

/**
 * Probe the hosted checkout without creating an order. A confirmed 404 means
 * the factory product is not registered, so the app can remove the paid
 * boundary instead of sending a customer to a dead end.
 */
export async function checkCheckoutAvailability(force = false): Promise<CheckoutAvailability> {
  const cached = getCheckoutAvailability();
  if (!force && cached !== 'unknown') return cached;
  if (!navigator.onLine) return 'unknown';
  try {
    const response = await probeCheckout();
    if (!response) return 'unknown';
    const availability: CheckoutAvailability = response.status === 404 || response.status === 410
      ? 'unavailable'
      : response.ok || response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)
        ? 'available'
        : 'unknown';
    if (availability !== 'unknown') sessionStorage.setItem(CHECKOUT_KEY, availability);
    return availability;
  } catch {
    return 'unknown';
  }
}

function probeCheckout(): Promise<{ status: number; type: ResponseType; ok: boolean } | null> {
  if (!('Worker' in window)) return Promise.resolve(null);
  return new Promise(resolve => {
    const worker = new Worker('/checkout-probe.js');
    const timeout = window.setTimeout(() => { worker.terminate(); resolve(null); }, 8000);
    worker.addEventListener('message', event => {
      window.clearTimeout(timeout);
      worker.terminate();
      const result = event.data as { status?: unknown; type?: unknown; ok?: unknown };
      resolve(typeof result?.status === 'number' && typeof result.type === 'string' && typeof result.ok === 'boolean'
        ? { status: result.status, type: result.type as ResponseType, ok: result.ok }
        : null);
    }, { once: true });
    worker.addEventListener('error', () => { window.clearTimeout(timeout); worker.terminate(); resolve(null); }, { once: true });
    worker.postMessage(BUY_URL);
  });
}

export function captureLicense(): boolean {
  const url = new URL(location.href);
  const token = url.searchParams.get('license')?.trim();
  if (!token) return false;
  if (localStorage.getItem(KEY) !== token) localStorage.removeItem(VERDICT_KEY);
  localStorage.setItem(KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function getLicense(): LicenseState {
  const token = localStorage.getItem(KEY) || '';
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) || '{}');
    return { token, valid: Boolean(token && verdict.token === token && verdict.valid), checkedAt: verdict.token === token ? Number(verdict.checkedAt) || 0 : 0 };
  } catch { return { token, valid: false, checkedAt: 0 }; }
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const current = getLicense();
  if (!current.token) return current;
  if (!force && Date.now() - current.checkedAt < 86_400_000) return current;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(current.token)}`);
    if (!response.ok) throw new Error('Verification unavailable');
    const result = await response.json() as { valid: boolean };
    const state = { token: current.token, valid: Boolean(result.valid), checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(state));
    return state;
  } catch { return current; }
}

export function saveLicense(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}
