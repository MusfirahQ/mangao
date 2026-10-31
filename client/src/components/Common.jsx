import { useState } from 'react';
import { IMAGES } from '../lib/data.js';
import { initials, isLight } from '../lib/format.js';
import { useSettings } from '../context/SettingsContext.jsx';
import Mangi from './Mangi.jsx';

/** Photo with an emoji illustration behind it (shown if the photo is off or fails to load). */
export function ImgTile({ image, cat, alt = '', className = '', as: Tag = 'div', ...rest }) {
  const { settings } = useSettings();
  const im = IMAGES[image] || { photo: null, emoji: '🛍️' };
  const [state, setState] = useState('loading');
  const showPhoto = settings.photos && im.photo && state !== 'failed';
  return (
    <Tag className={`img-tile ${className}`} data-cat={cat} {...rest}>
      <span className="tile-emoji" aria-hidden="true">{im.emoji}</span>
      {showPhoto && (
        <img className={`tile-img ${state === 'loaded' ? 'loaded' : ''}`} src={im.photo} alt={alt} loading="lazy" decoding="async"
          onLoad={() => setState('loaded')} onError={() => setState('failed')} />
      )}
    </Tag>
  );
}

/** Coloured square with the store's initials */
export function VendorLogo({ vendor, style }) {
  const txt = initials(vendor.name);
  const color = /^#[0-9a-fA-F]{6}$/.test(vendor.color) ? vendor.color : '#202124';
  return (
    <span className="vendor-logo" aria-hidden="true"
      style={{ background: color, color: isLight(color) ? '#202124' : '#fff', ...(txt.length > 3 ? { fontSize: '.78rem' } : {}), ...style }}>
      {txt}
    </span>
  );
}

export function EmptyState({ mood = 'happy', title, text, children }) {
  return (
    <div className="empty-state">
      <div className="empty-mangi"><Mangi mood={mood} /></div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function Loading({ text = 'Loading…' }) {
  return (
    <div className="empty-state">
      <div className="spinner-border text-warning" role="status"><span className="visually-hidden">{text}</span></div>
      <p className="mt-3">{text}</p>
    </div>
  );
}

export function StatusTag({ status, label }) {
  const cls = ['delivered', 'collected', 'active', 'resolved'].includes(status) ? 'done' : ['cancelled', 'rejected', 'suspended'].includes(status) ? 'stopped' : '';
  return <span className={`status-tag ${cls}`}>{label}</span>;
}

/** Button that disables itself and shows a spinner while `onClick` (async) runs */
export function BusyButton({ onClick, busyText = 'Please wait…', children, type = 'button', ...rest }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    if (!onClick) return;
    setBusy(true);
    try { await onClick(e); } finally { setBusy(false); }
  };
  return (
    <button type={type} disabled={busy || rest.disabled} onClick={type === 'submit' ? undefined : handle} {...rest}>
      {busy ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> {busyText}</> : children}
    </button>
  );
}

/** Shows a list of field errors at the top of a form */
export function ErrorSummary({ errors, title = 'Please fix these:' }) {
  if (!errors || !errors.length) return null;
  return (
    <div className="form-error-summary" role="alert">
      <strong>{title}</strong>
      <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}
