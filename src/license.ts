import type { LicenseState } from './types';

const SLUG = 'billable-review';
const KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${KEY}:verdict`;
export const BUY_URL = `https://api.sociobot.in/api/v1/products/${SLUG}/checkout`;

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
