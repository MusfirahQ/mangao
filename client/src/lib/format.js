// Small formatting helpers
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const rs = (n) => `Rs. ${nf.format(Math.max(0, Math.round(Number(n) || 0)))}`;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDate = (ts) => dateFmt.format(new Date(ts));
export const fmtTime = (ts) => timeFmt.format(new Date(ts));
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function agoText(ts) {
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return fmtTime(ts);
}

export function initials(name) {
  if (/^[A-Z0-9]{2,5}$/.test(name)) return name;
  const parts = String(name).split(/[\s.\-&]+/).filter(Boolean);
  return ((parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?')[0]) || '?').toUpperCase();
}

export function isLight(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export const PHONE_RE = /^(?:\+92|0)3\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normPhone = (v) => String(v || '').replace(/[\s-]/g, '');

export const ratingText = (v) => (v.ratings ? Number(v.rating).toFixed(1) : 'New');
export const ratingCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n));
export const etaText = (v, mode) => (mode === 'pickup' ? `Ready in ~${Math.max(10, v.eta[0] - 10)} min` : `${v.eta[0]}–${v.eta[1]} min`);

export function whenOptions() {
  const opts = ['As soon as possible'];
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  const end = new Date(); end.setHours(23, 30, 0, 0);
  while (d <= end && opts.length < 12) { opts.push(`Today, ${fmtTime(d)}`); d.setMinutes(d.getMinutes() + 30); }
  return opts;
}
