import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { STATUS_LABEL, statusClass } from '../lib/data.js';
import { rs, agoText } from '../lib/format.js';
import { api } from '../lib/api.js';
import usePolling from '../lib/usePolling.js';
import { useUI } from '../context/UIContext.jsx';
import { EmptyState, Loading } from '../components/Common.jsx';
import MapView from '../components/MapView.jsx';
import useTitle from '../lib/useTitle.js';

// The rider opens a secret link from the store and shares their phone's GPS while delivering.
export default function Rider() {
  useTitle('Rider — Mangao');
  const { token } = useParams();
  const { toast, toastError, confirm } = useUI();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [me, setMe] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [lastSent, setLastSent] = useState(0);
  const [, tick] = useState(0);
  const r = useRef({ watchId: null, pending: null, sending: false, lastAttempt: 0, flushTimer: null, heartbeat: null, wakeLock: null, last: null });

  const load = useCallback(async () => {
    try { setOrder((await api(`/rider/${encodeURIComponent(token)}`)).order); } catch (err) { setError(err.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  usePolling(() => tick((n) => n + 1), 5000, sharing);

  const stop = useCallback(() => {
    const s = r.current;
    if (s.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(s.watchId);
    s.watchId = null;
    clearTimeout(s.flushTimer); clearInterval(s.heartbeat);
    s.flushTimer = null; s.heartbeat = null; s.pending = null;
    s.wakeLock?.release?.().catch?.(() => {});
    s.wakeLock = null;
    setSharing(false);
  }, []);
  useEffect(() => stop, [stop]); // stop sharing when the page closes

  /** Send the newest position at most every 4 s; one arriving during the wait is sent after it. */
  const flush = useCallback(async () => {
    const s = r.current;
    if (!s.pending || s.sending || s.watchId === null) return;
    const wait = 4000 - (Date.now() - s.lastAttempt);
    if (wait > 0) { if (!s.flushTimer) s.flushTimer = setTimeout(() => { s.flushTimer = null; flush(); }, wait); return; }
    const p = s.pending;
    s.pending = null; s.sending = true; s.lastAttempt = Date.now();
    try {
      await api(`/rider/${encodeURIComponent(token)}/location`, { method: 'POST', body: p });
      setLastSent(Date.now()); setGpsError('');
    } catch (err) {
      setGpsError(err.message);
      if (err.status === 400) { s.sending = false; stop(); load(); return; }
    } finally { s.sending = false; }
    if (s.pending) flush();
  }, [token, stop, load]);

  const start = () => {
    if (!navigator.geolocation) { setGpsError("This browser can't share location. Try Chrome or Safari on your phone."); return; }
    const s = r.current;
    setGpsError('');
    s.lastAttempt = 0;
    s.watchId = navigator.geolocation.watchPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      s.pending = p; s.last = p;
      setMe({ ...p, at: new Date().toISOString() });
      flush();
    }, (err) => {
      if (err.code === 1) { setGpsError('Location permission was blocked. Allow location for this site in your browser settings, then try again.'); stop(); return; }
      setGpsError('Waiting for GPS… make sure location is turned on.');
    }, { enableHighAccuracy: true, maximumAge: 5000 });
    // re-send the last position every 15 s even when standing still
    s.heartbeat = setInterval(() => {
      if (s.last && !s.pending && Date.now() - s.lastAttempt > 14000) { s.pending = { ...s.last }; flush(); }
    }, 5000);
    navigator.wakeLock?.request('screen').then((lock) => { s.wakeLock = lock; }).catch(() => {});
    setSharing(true);
    toast('Sharing your live location', { icon: 'bi-broadcast', type: 'ok' });
  };

  const delivered = async () => {
    if (!(await confirm({ title: 'Mark as delivered?', text: 'Only do this after handing the order to the customer.', confirmLabel: 'Delivered' }))) return;
    try {
      const res = await api(`/rider/${encodeURIComponent(token)}/delivered`, { method: 'POST' });
      stop(); setOrder(res.order);
      toast('Order delivered. Thank you!', { icon: 'bi-check2-circle', type: 'ok' });
    } catch (err) { toastError(err); load(); }
  };

  if (error) return <section className="container-xl page-pad narrow"><EmptyState mood="sad" title="This rider link is not valid" text={error} /></section>;
  if (!order) return <Loading text="Loading delivery…" />;
  const o = order;
  const active = o.status === 'on_the_way';
  const statusText = !lastSent ? 'Finding your location…' : `Location sent ${agoText(lastSent)}${me?.accuracy ? ` · accurate to about ${Math.round(me.accuracy)} m` : ''}`;

  return (
    <section className="container-xl page-pad narrow" aria-labelledby="riderTitle">
      <div className="track-head">
        <div><p className="mb-1 text-body-secondary">Mangao rider</p><h1 id="riderTitle">Delivering order {o.id}</h1><p className="page-sub">{o.storeName} → {o.contact.name}</p></div>
        <span className={`status-tag ${statusClass(o.status)}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      {active ? (
        <section className={`panel rider-share ${sharing ? 'on' : ''}`}>
          <div>
            <h2 className="panel-title mb-1">{sharing ? 'Sharing your live location' : 'Share your live location'}</h2>
            <p className="mb-0 small">{sharing ? statusText : 'The customer will see you moving on their map. Keep this page open while you deliver.'}</p>
            {gpsError && <p className="text-danger small mb-0 mt-1">{gpsError}</p>}
          </div>
          <button type="button" className={`btn ${sharing ? 'btn-outline-dark' : 'btn-mango'} btn-lg`} onClick={sharing ? stop : start}>
            {sharing ? <><i className="bi bi-pause-fill" /> Stop sharing</> : <><i className="bi bi-broadcast" /> Start sharing</>}
          </button>
        </section>
      ) : (
        <section className="panel"><p className="mb-0">{o.status === 'delivered' ? 'This order has been delivered. Thank you!' : 'This order is not out for delivery, so location sharing is off.'}</p></section>
      )}
      <section className="panel map-panel">
        <MapView store={o.storeLocation} storeName={o.storeName} dest={o.destination} rider={me || o.rider} follow={sharing} label="Map with the store, the delivery area and your position" />
      </section>
      <section className="panel">
        <h2 className="panel-title">Delivery details</h2>
        <dl className="kv">
          <dt>Customer</dt><dd>{o.contact.name}</dd>
          <dt>Phone</dt><dd>{o.contact.phone ? <a href={`tel:${o.contact.phone}`}>{o.contact.phone}</a> : '—'}</dd>
          <dt>Address</dt><dd>{o.address}</dd>
          {o.riderNote && <><dt>Note</dt><dd>{o.riderNote}</dd></>}
          <dt>Collect</dt><dd>{o.payment === 'Cash' ? `${rs(o.total)} in cash` : 'Nothing (not cash)'}</dd>
        </dl>
        <ul className="dash-items mt-2">{o.items.map((i) => <li key={i.productId}><strong>{i.qty}×</strong> {i.name}</li>)}</ul>
        {active && <button type="button" className="btn btn-dark w-100 btn-lg mt-2" onClick={delivered}><i className="bi bi-check2-circle" /> Mark as delivered</button>}
      </section>
    </section>
  );
}
