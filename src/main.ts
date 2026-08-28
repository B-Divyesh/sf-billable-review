import './styles.css';
import { importCsv, roundMinutes, csvEscape } from './csv';
import { getEntries, putEntries, replaceEntries } from './db';
import { BUY_URL, captureLicense, getLicense, saveLicense, verifyLicense } from './license';
import type { EntryStatus, LicenseState, Settings, TimeEntry } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const FREE_LIMIT = 150;
const settings: Settings = { rounding: 0, staleDays: 30, ...JSON.parse(localStorage.getItem('br:settings') || '{}') };
let entries: TimeEntry[] = [];
let selected = new Set<string>();
let filter = 'open';
let query = '';
let license: LicenseState = getLicense();
let lastFocused: HTMLElement | null = null;

const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const hours = (minutes: number) => `${(minutes / 60).toFixed(2)} h`;
const labelStatus: Record<EntryStatus, string> = { review: 'Needs review', approved: 'Approved', invoiced: 'Invoiced', written_off: 'Written off' };
const isStale = (entry: TimeEntry) => (Date.now() - new Date(`${entry.date}T00:00:00`).valueOf()) / 86_400_000 > settings.staleDays;
const isUncategorized = (entry: TimeEntry) => !entry.client.trim() || !entry.project.trim();

function shell(content: string, legal = false): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Billable Review home"><img src="/icon.svg" width="36" height="36" alt=""><span>Billable Review</span></a>
      <nav aria-label="Primary"><a href="/privacy">Privacy</a><button class="link-button" data-action="license">${license.valid ? 'Lifetime unlocked' : 'Get lifetime'}</button></nav>
    </header>
    <main id="main" class="${legal ? 'legal-page' : ''}">${content}</main>
    <footer><p>Private by design. Your time rows stay in this browser.</p><p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · Generated artwork disclosed in the <a href="#art-note" data-action="art-note">art note</a>.</p></footer>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div id="offline-note" class="offline-note" role="status" hidden>You’re offline. Review and exports still work.</div>
    <div id="modal-root"></div>`;
}

function legalPage(path: string): void {
  const privacy = path === '/privacy';
  const content = privacy ? `
    <p class="eyebrow">PLAIN-LANGUAGE POLICY · 28 AUGUST 2026</p><h1>Privacy lives on your device.</h1>
    <p class="lede">Billable Review processes selected CSV and backup files entirely in your browser. We do not receive, sell, profile, or analyse your time entries.</p>
    <h2>What is stored</h2><p>Your imported original rows, review decisions, invoice references, and write-off notes are stored in IndexedDB on this device. Your settings and optional license token are stored in localStorage. You can export a backup or erase everything from the app.</p>
    <h2>What leaves the device</h2><p>No time-entry data leaves your device. If you buy or verify a license, your browser contacts the Sociobot billing API with the license token. Sociobot/Dodo is the merchant of record and handles checkout information under its own policies. This site uses no analytics, advertising, third-party fonts, or tracking scripts.</p>
    <h2>Offline and retention</h2><p>The app shell may be cached so the product works offline. Data remains until you erase it or clear this site’s browser storage. Because there is no account or server copy, we cannot recover erased local data.</p>
    <h2>Questions</h2><p>Contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>` : `
    <p class="eyebrow">TERMS · 28 AUGUST 2026</p><h1>Terms, without the fog.</h1>
    <p class="lede">Billable Review helps you prepare invoice line items. You remain responsible for checking exported amounts, tax treatment, contracts, invoices, and accounting records.</p>
    <h2>Using the product</h2><p>You may use the free version within its stated entry limit. A US$19 one-time purchase unlocks unlimited imports on devices where a valid license is restored. The purchase is a product license, not a subscription and not accounting advice.</p>
    <h2>Purchases and refunds</h2><p>Sociobot/Dodo is the merchant of record. Checkout, receipts, taxes, and refunds are handled there. A refunded, expired, or revoked license may stop unlocking paid features; your local data and exports remain accessible.</p>
    <h2>Your data and availability</h2><p>The product is provided “as is.” Local storage can be cleared by browsers or device management, so keep periodic JSON backups. We do not promise uninterrupted availability and are not liable for lost profits or indirect damages to the extent permitted by law.</p>
    <h2>Fair use</h2><p>Do not misuse the service, attempt to bypass license verification, or use it unlawfully. These terms are governed by applicable law. Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>`;
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Billable Review`;
  app.innerHTML = shell(content, true);
  bindGlobal();
}

function emptyView(): string {
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow">THE GAP BETWEEN TIMER AND INVOICE</p><h1>Find the hours that never made it across.</h1>
      <p class="lede">Bring a CSV from Toggl, Clockify, Harvest, or another timer. Review exceptions, record invoice references, and export clean line items—entirely on your device.</p>
      <label class="button primary file-button">Choose a time CSV<input type="file" data-import accept=".csv,text/csv" hidden></label>
      <p class="microcopy">Nothing is uploaded. Date and duration columns are required.</p>
    </div>
    <figure class="hero-art"><picture><source type="image/avif" srcset="/assets/hero-ledger-960.avif 960w"><source type="image/webp" srcset="/assets/hero-ledger-960.webp 960w, /assets/hero-ledger-1536.webp 1536w"><img src="/assets/hero-ledger-960.webp" width="960" height="640" alt="Paper time slips crossing a midnight bridge from a clock-shaped island into a red ledger" fetchpriority="high" decoding="async"></picture><figcaption>Every slip deserves a destination.</figcaption></figure>
  </section>
  <section class="how"><p class="eyebrow">ONE QUIET REVIEW</p><h2>From raw rows to a defensible close.</h2><ol><li><span>01</span><strong>Import</strong><p>Original CSV fields are preserved alongside normalized time.</p></li><li><span>02</span><strong>Resolve</strong><p>Stale and uncategorized work rises to the top. Rounding stays visible.</p></li><li><span>03</span><strong>Export</strong><p>Download approved lines and keep the invoice reference locally.</p></li></ol></section>
  <section class="price-strip"><div><p class="eyebrow">USEFUL FREE, FINITE ON PURPOSE</p><h2>Close up to ${FREE_LIMIT} rows free.</h2><p>US$19 once unlocks unlimited imports. No subscription. Local export and accessibility are always free.</p></div><a class="button secondary" href="${BUY_URL}">Buy lifetime — $19</a></section>`;
}

function filteredEntries(): TimeEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(entry => {
    const matchesFilter = filter === 'all' ||
      (filter === 'open' && ['review', 'approved'].includes(entry.status)) ||
      (filter === 'stale' && ['review', 'approved'].includes(entry.status) && isStale(entry)) ||
      (filter === 'uncategorized' && ['review', 'approved'].includes(entry.status) && isUncategorized(entry)) ||
      (filter === 'reconciled' && ['invoiced', 'written_off'].includes(entry.status));
    const matchesQuery = !needle || [entry.client, entry.project, entry.description, entry.invoiceRef].join(' ').toLowerCase().includes(needle);
    return matchesFilter && matchesQuery;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function groupRows(groupEntries: TimeEntry[]): string {
  return groupEntries.map(entry => {
    const flags = [isStale(entry) && entry.status === 'review' ? '<span class="flag warning">◷ Stale</span>' : '', isUncategorized(entry) ? '<span class="flag warning">! Needs category</span>' : '', `<span class="flag status-${entry.status}">${labelStatus[entry.status]}</span>`].join('');
    const rounding = entry.roundedMinutes !== entry.minutes ? `<span class="round-note">was ${hours(entry.minutes)}</span>` : '';
    return `<li class="entry-row ${selected.has(entry.id) ? 'selected' : ''}" data-id="${esc(entry.id)}">
      <label class="check"><input type="checkbox" data-select="${esc(entry.id)}" ${selected.has(entry.id) ? 'checked' : ''}><span class="sr-only">Select ${esc(entry.description || entry.project || 'time entry')}</span></label>
      <div class="entry-main"><div class="entry-title">${esc(entry.description || 'Untitled time entry')}</div><div class="entry-meta"><time datetime="${esc(entry.date)}">${esc(new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</time><span>${esc(entry.client || 'No client')} · ${esc(entry.project || 'No project')}</span>${entry.invoiceRef ? `<span>Invoice ${esc(entry.invoiceRef)}</span>` : ''}</div><div class="flags">${flags}</div></div>
      <div class="entry-hours"><strong>${hours(entry.roundedMinutes)}</strong>${rounding}</div>
      <button class="icon-button" data-edit="${esc(entry.id)}" aria-label="Review ${esc(entry.description || 'time entry')}">Review</button>
    </li>`;
  }).join('');
}

function boardView(): string {
  const visible = filteredEntries();
  const open = entries.filter(entry => ['review', 'approved'].includes(entry.status));
  const reconciled = entries.filter(entry => ['invoiced', 'written_off'].includes(entry.status));
  const totalMinutes = open.reduce((sum, entry) => sum + entry.roundedMinutes, 0);
  const percent = entries.length ? Math.round(reconciled.length / entries.length * 100) : 0;
  const groups = new Map<string, TimeEntry[]>();
  visible.forEach(entry => {
    const key = `${entry.client || 'No client'}|||${entry.project || 'No project'}`;
    groups.set(key, [...(groups.get(key) || []), entry]);
  });
  const groupMarkup = [...groups].map(([key, list]) => {
    const [client, project] = key.split('|||');
    return `<section class="entry-group"><header><div><p>${esc(client)}</p><h2>${esc(project)}</h2></div><div class="group-total"><strong>${hours(list.reduce((sum, entry) => sum + entry.roundedMinutes, 0))}</strong><label class="select-group"><input type="checkbox" data-select-group="${esc(key)}" ${list.every(entry => selected.has(entry.id)) ? 'checked' : ''}> Select group</label></div></header><ul>${groupRows(list)}</ul></section>`;
  }).join('');
  return `<div class="board-heading"><div><p class="eyebrow">LOCAL REVIEW LEDGER</p><h1>What still needs a destination?</h1><p>Imported rows stay intact. Decisions autosave on this device.</p></div><label class="button secondary file-button">Import another CSV<input type="file" data-import accept=".csv,text/csv" hidden></label></div>
  <section class="ledger-layout" aria-label="Review board">
    <aside class="summary-rail"><div class="summary-mark"><span>${percent}%</span><small>reconciled</small></div>
      <dl><div><dt>Open time</dt><dd>${hours(totalMinutes)}</dd></div><div><dt>Needs review</dt><dd>${open.length}</dd></div><div><dt>Stale</dt><dd>${open.filter(isStale).length}</dd></div><div><dt>Uncategorized</dt><dd>${open.filter(isUncategorized).length}</dd></div></dl>
      <button class="text-action" data-action="settings">Rounding: ${settings.rounding ? `${settings.rounding} min up` : 'Exact'}</button><button class="text-action" data-action="backup">Export JSON backup</button><label class="text-action file-button">Restore JSON backup<input type="file" data-restore accept="application/json,.json" hidden></label><button class="text-action danger-text" data-action="erase">Erase local data</button>
    </aside>
    <div class="ledger"><div class="toolbar"><div class="filters" role="group" aria-label="Filter entries">${['open', 'stale', 'uncategorized', 'reconciled', 'all'].map(name => `<button data-filter="${name}" aria-pressed="${filter === name}">${name[0].toUpperCase() + name.slice(1)}</button>`).join('')}</div><label class="search"><span class="sr-only">Search entries</span><input type="search" data-search placeholder="Search client, project, note…" value="${esc(query)}"></label></div>
    ${selected.size ? `<div class="bulk-bar"><strong>${selected.size} selected</strong><button class="button primary small" data-action="resolve">Resolve selected</button><button class="button ghost small" data-action="clear-selection">Clear</button></div>` : ''}
    <div class="results-note" aria-live="polite">Showing ${visible.length} of ${entries.length} rows</div>
    ${groupMarkup || `<div class="no-results"><p class="stamp">CLEAR</p><h2>No rows match this view.</h2><p>Try another filter or search. Your original entries are still saved.</p></div>`}
    <div class="export-bar"><div><strong>Approved line items</strong><span>${entries.filter(entry => ['approved', 'invoiced'].includes(entry.status)).length} ready to export</span></div><button class="button primary" data-action="export">Export approved CSV</button></div></div>
  </section>`;
}

function render(): void {
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy' || path === '/terms') { legalPage(path); return; }
  document.title = 'Billable Review — reconcile time before invoicing';
  app.innerHTML = shell(entries.length ? boardView() : emptyView());
  bindGlobal();
  bindView();
  updateNetwork();
}

function showToast(message: string): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message; toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 4500);
}

async function handleCsv(file: File): Promise<void> {
  try {
    const parsed = importCsv(await file.text(), file.name);
    let incoming = parsed.entries;
    if (!license.valid && entries.length + incoming.length > FREE_LIMIT) {
      const room = Math.max(0, FREE_LIMIT - entries.length);
      incoming = incoming.slice(0, room);
      if (!room) { openLicense(`The free ledger holds ${FREE_LIMIT} rows. Your existing data is safe; unlock lifetime to import more.`); return; }
      parsed.warnings.push(`The free ledger imported the first ${room} rows. Unlock lifetime for the rest.`);
    }
    entries = [...entries, ...incoming];
    await putEntries(incoming);
    render();
    showToast(`${incoming.length} rows imported${parsed.warnings.length ? `. ${parsed.warnings.join(' ')}` : '.'}`);
  } catch (error) { showToast(error instanceof Error ? error.message : 'That file could not be imported.'); }
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv(): void {
  const ready = entries.filter(entry => ['approved', 'invoiced'].includes(entry.status));
  if (!ready.length) { showToast('Approve at least one row before exporting line items.'); return; }
  const headers = ['Date', 'Client', 'Project', 'Description', 'Original hours', 'Rounded hours', 'Status', 'Invoice reference'];
  const rows = ready.map(entry => [entry.date, entry.client, entry.project, entry.description, (entry.minutes / 60).toFixed(2), (entry.roundedMinutes / 60).toFixed(2), labelStatus[entry.status], entry.invoiceRef]);
  download(`billable-review-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
  showToast(`${ready.length} approved line items exported.`);
}

function openModal(title: string, body: string, wide = false): HTMLDialogElement {
  lastFocused = document.activeElement as HTMLElement;
  const root = document.querySelector('#modal-root')!;
  root.innerHTML = `<dialog class="modal ${wide ? 'wide' : ''}" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="close-button" data-close aria-label="Close dialog">×</button></div>${body}</dialog>`;
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  dialog.addEventListener('close', () => { root.innerHTML = ''; lastFocused?.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.showModal();
  (dialog.querySelector('input, button, select, a') as HTMLElement | null)?.focus();
  return dialog;
}

function openResolve(ids: string[]): void {
  const targets = entries.filter(entry => ids.includes(entry.id));
  if (!targets.length) return;
  const one = targets.length === 1 ? targets[0] : null;
  const dialog = openModal(`Resolve ${targets.length === 1 ? 'this row' : `${targets.length} rows`}`, `<form id="resolve-form">
    <p class="modal-intro">Choose a clear outcome. Nothing is sent to an accounting system.</p>
    ${one ? `<fieldset><legend>Category</legend><label>Client<input name="client" value="${esc(one.client)}"></label><label>Project<input name="project" value="${esc(one.project)}"></label></fieldset>` : ''}
    <fieldset><legend>Outcome</legend><div class="choice-grid"><label><input type="radio" name="status" value="approved" checked><span><strong>Approve</strong><small>Ready for line-item export</small></span></label><label><input type="radio" name="status" value="invoiced"><span><strong>Link invoice</strong><small>Reconciled with a reference</small></span></label><label><input type="radio" name="status" value="written_off"><span><strong>Write off</strong><small>Reconciled with a reason</small></span></label></div></fieldset>
    <label id="reference-label">Invoice reference or write-off reason <span>(required when linking or writing off)</span><input name="reference" autocomplete="off"></label>
    <label>Rounding<select name="rounding"><option value="0">Exact time</option><option value="6">Up to 6 minutes</option><option value="15">Up to 15 minutes</option><option value="30">Up to 30 minutes</option></select></label>
    <div class="modal-actions"><button type="button" class="button ghost" data-close>Cancel</button><button class="button primary" type="submit">Save outcome</button></div><p class="form-error" role="alert" hidden></p>
  </form>`);
  const form = dialog.querySelector<HTMLFormElement>('#resolve-form')!;
  (form.elements.namedItem('rounding') as HTMLSelectElement).value = String(settings.rounding);
  form.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form); const status = data.get('status') as EntryStatus; const reference = String(data.get('reference') || '').trim();
    if ((status === 'invoiced' || status === 'written_off') && !reference) {
      const error = form.querySelector<HTMLElement>('.form-error')!; error.textContent = status === 'invoiced' ? 'Add the invoice reference before saving.' : 'Add a reason for writing off this time.'; error.hidden = false; (form.elements.namedItem('reference') as HTMLInputElement).focus(); return;
    }
    const increment = Number(data.get('rounding'));
    targets.forEach(entry => {
      entry.status = status; entry.roundedMinutes = roundMinutes(entry.minutes, increment);
      entry.invoiceRef = status === 'invoiced' ? reference : '';
      entry.resolutionNote = status === 'written_off' ? reference : '';
      if (one) { entry.client = String(data.get('client') || '').trim(); entry.project = String(data.get('project') || '').trim(); }
    });
    await putEntries(targets); selected.clear(); dialog.close(); render(); showToast(`${targets.length} ${targets.length === 1 ? 'row' : 'rows'} saved as ${labelStatus[status].toLowerCase()}.`);
  });
}

function openSettings(): void {
  const dialog = openModal('Review settings', `<form id="settings-form"><p class="modal-intro">Defaults affect future review decisions. Original durations always remain preserved.</p><label>Default rounding<select name="rounding"><option value="0">Exact time</option><option value="6">Round up to 6 minutes</option><option value="15">Round up to 15 minutes</option><option value="30">Round up to 30 minutes</option></select></label><label>Flag entries stale after<input type="number" name="staleDays" min="1" max="365" value="${settings.staleDays}"><span>days</span></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancel</button><button class="button primary">Save settings</button></div></form>`);
  const form = dialog.querySelector<HTMLFormElement>('form')!; (form.elements.namedItem('rounding') as HTMLSelectElement).value = String(settings.rounding);
  form.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); settings.rounding = Number(data.get('rounding')) as Settings['rounding']; settings.staleDays = Math.max(1, Number(data.get('staleDays')) || 30); localStorage.setItem('br:settings', JSON.stringify(settings)); dialog.close(); render(); showToast('Review settings saved.'); });
}

function openLicense(notice = ''): void {
  const dialog = openModal(license.valid ? 'Lifetime is unlocked' : 'Unlock the full ledger', `<div class="license-panel">${notice ? `<p class="notice">${esc(notice)}</p>` : ''}<p class="price"><span>$19</span> once</p><p>Review unlimited CSV rows and keep growing your local close history. No subscription, account, or cloud upload.</p><ul><li>Unlimited time-entry imports</li><li>All exception, reconciliation, backup, and export tools</li><li>Works offline after first load</li></ul>${license.valid ? '<p class="success-note">✓ This browser has a verified lifetime license.</p>' : `<a class="button primary full" href="${BUY_URL}">Buy lifetime — $19</a><p class="merchant">Secure checkout by Sociobot/Dodo, the merchant of record. Refunds are handled there.</p><form id="license-form"><label>Have a license? Paste it here<input name="token" autocomplete="off" required></label><button class="button secondary" type="submit">Verify and restore</button><p class="form-error" role="alert" hidden></p></form>`}<p class="legal-links"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p></div>`);
  const form = dialog.querySelector<HTMLFormElement>('#license-form');
  form?.addEventListener('submit', async event => { event.preventDefault(); const token = String(new FormData(form).get('token') || '').trim(); if (!token) return; saveLicense(token); const button = form.querySelector('button')!; button.textContent = 'Verifying…'; button.disabled = true; license = await verifyLicense(true); if (license.valid) { dialog.close(); render(); showToast('Lifetime license restored.'); } else { const error = form.querySelector<HTMLElement>('.form-error')!; error.textContent = navigator.onLine ? 'That license could not be verified. Check the token and try again.' : 'You’re offline. Reconnect once to verify this license.'; error.hidden = false; button.textContent = 'Verify and restore'; button.disabled = false; } });
}

function artNote(): void { openModal('About the artwork', '<div class="art-note"><img src="/assets/hero-ledger-960.webp" width="480" height="320" alt="Paper time slips crossing from a clock island into a ledger"><p>The “midnight paper crossing” was generated for Billable Review with the Param Factory image model on 28 August 2026. It contains no stock art, people, logos, or representations of product capability.</p></div>', true); }

function bindGlobal(): void {
  document.querySelectorAll('[data-action="license"]').forEach(button => button.addEventListener('click', () => openLicense()));
  document.querySelectorAll('[data-action="art-note"]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); artNote(); }));
}

function bindView(): void {
  document.querySelectorAll<HTMLInputElement>('[data-import]').forEach(input => input.addEventListener('change', () => { if (input.files?.[0]) void handleCsv(input.files[0]); }));
  document.querySelectorAll<HTMLInputElement>('[data-select]').forEach(input => input.addEventListener('change', () => { input.checked ? selected.add(input.dataset.select!) : selected.delete(input.dataset.select!); render(); }));
  document.querySelectorAll<HTMLInputElement>('[data-select-group]').forEach(input => input.addEventListener('change', () => { const [client, project] = input.dataset.selectGroup!.split('|||'); entries.filter(entry => (entry.client || 'No client') === client && (entry.project || 'No project') === project).forEach(entry => input.checked ? selected.add(entry.id) : selected.delete(entry.id)); render(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter!; selected.clear(); render(); }));
  document.querySelector<HTMLInputElement>('[data-search]')?.addEventListener('input', event => { query = (event.target as HTMLInputElement).value; const position = query.length; render(); const next = document.querySelector<HTMLInputElement>('[data-search]'); next?.focus(); next?.setSelectionRange(position, position); });
  document.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(button => button.addEventListener('click', () => openResolve([button.dataset.edit!] as string[])));
  document.querySelector('[data-action="resolve"]')?.addEventListener('click', () => openResolve([...selected]));
  document.querySelector('[data-action="clear-selection"]')?.addEventListener('click', () => { selected.clear(); render(); });
  document.querySelector('[data-action="export"]')?.addEventListener('click', exportCsv);
  document.querySelector('[data-action="settings"]')?.addEventListener('click', openSettings);
  document.querySelector('[data-action="backup"]')?.addEventListener('click', () => download(`billable-review-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries, settings }, null, 2), 'application/json'));
  document.querySelector<HTMLInputElement>('[data-restore]')?.addEventListener('change', async event => { try { const data = JSON.parse(await (event.target as HTMLInputElement).files![0].text()); if (data.version !== 1 || !Array.isArray(data.entries)) throw new Error(); entries = data.entries; await replaceEntries(entries); render(); showToast(`${entries.length} rows restored from backup.`); } catch { showToast('That is not a valid Billable Review backup.'); } });
  document.querySelector('[data-action="erase"]')?.addEventListener('click', async () => { if (!confirm(`Erase all ${entries.length} locally saved rows? Export a backup first if you may need them.`)) return; entries = []; selected.clear(); await replaceEntries([]); render(); showToast('All local review data was erased.'); });
}

function updateNetwork(): void { const note = document.querySelector<HTMLElement>('#offline-note'); if (note) note.hidden = navigator.onLine; }
window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork);

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) { showToast('An update is ready. Reload to use it.'); worker.postMessage({ type: 'SKIP_WAITING' }); } });
  });
}

async function init(): Promise<void> {
  captureLicense();
  entries = await getEntries().catch(() => []);
  render();
  void registerServiceWorker();
  if (license.token) { const verified = await verifyLicense(); if (verified.valid !== license.valid) { license = verified; render(); if (!license.valid) showToast('Your license is no longer active. Local data and exports are still available.'); } else license = verified; }
}

void init();
