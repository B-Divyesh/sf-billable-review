import type { LicenseState } from './types';

const SLUG = 'billable-review';
const KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${KEY}:verdict`;
export const BUY_URL = `https://api.sociobot.in/api/v1/products/${SLUG}/checkout`;

type VerificationOutcome = 'not_needed' | 'cached' | 'valid' | 'invalid' | 'rate_limited' | 'unavailable';

export interface LicenseCheck {
  state: LicenseState;
  outcome: VerificationOutcome;
  retryAfterSeconds?: number;
}

interface VerifyOptions {
  force?: boolean;
  onRateLimited?: (retryAfterSeconds: number) => void;
}

const MAX_AUTOMATIC_RETRY_SECONDS = 30;
const DEFAULT_RETRY_SECONDS = 3;

function retryAfterSeconds(value: string | null): number | null {
  if (!value) return null;
  const delta = Number(value);
  if (Number.isFinite(delta) && delta > 0) return Math.ceil(delta);
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return null;
  const seconds = Math.ceil((at - Date.now()) / 1000);
  return seconds > 0 ? seconds : null;
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

export async function verifyLicense(options: VerifyOptions = {}): Promise<LicenseCheck> {
  const current = getLicense();
  if (!current.token) return { state: current, outcome: 'not_needed' };
  if (!options.force && Date.now() - current.checkedAt < 86_400_000) return { state: current, outcome: 'cached' };

  const url = `https://api.sociobot.in/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(current.token)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Retry-After is not CORS-readable unless the gateway exposes it. Use a
        // short fallback so saturation still degrades safely in that case.
        const seconds = retryAfterSeconds(response.headers.get('retry-after')) ?? DEFAULT_RETRY_SECONDS;
        if (attempt === 0 && seconds && seconds <= MAX_AUTOMATIC_RETRY_SECONDS) {
          options.onRateLimited?.(seconds);
          await new Promise(resolve => window.setTimeout(resolve, seconds * 1000));
          continue;
        }
        return { state: current, outcome: 'rate_limited', retryAfterSeconds: seconds };
      }
      if (!response.ok) return { state: current, outcome: 'unavailable' };
      const result = await response.json() as { valid?: unknown };
      if (typeof result.valid !== 'boolean') return { state: current, outcome: 'unavailable' };
      const state = { token: current.token, valid: result.valid, checkedAt: Date.now() };
      localStorage.setItem(VERDICT_KEY, JSON.stringify(state));
      return { state, outcome: result.valid ? 'valid' : 'invalid' };
    } catch {
      return { state: current, outcome: 'unavailable' };
    }
  }
  return { state: current, outcome: 'unavailable' };
}

export function saveLicense(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}
