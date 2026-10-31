import { Link } from 'react-router-dom';
import { ORDER_FLOW, STATUS_LABEL, NEXT_ACTION, statusClass } from '../lib/data.js';
import { rs, fmtDate, agoText } from '../lib/format.js';
import { useUI } from '../context/UIContext.jsx';

/** One order as a store owner or admin sees it, with the buttons for its next step. */
export default function DashOrderCard({ order: o, showStore = false, onStatus, extra = null }) {
  const { toast } = useUI();
  const flow = ORDER_FLOW[o.mode];
  const actions = (NEXT_ACTION[o.status] || []).filter(([s]) => s === 'rejected' || flow.includes(s));
  const riderUrl = o.riderToken ? `${window.location.origin}/rider/${o.riderToken}` : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(riderUrl); toast('Rider link copied — send it to the rider', { icon: 'bi-link-45deg' }); } catch { window.prompt('Copy this rider link', riderUrl); }
  };
  return (
    <article className="order-card dash-order">
      <div className="order-top">
        <div>
          <p className="order-title">{o.id}{showStore && ` · ${o.storeName}`}</p>
          <span className="order-meta">{fmtDate(o.createdAt)} · {o.mode === 'pickup' ? 'Pickup' : 'Delivery'} · {o.when}</span>
        </div>
        <span className={`status-tag ${statusClass(o.status)}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      <ul className="dash-items">{o.items.map((i) => <li key={i.productId}><strong>{i.qty}×</strong> {i.name}</li>)}</ul>
      <p className="order-meta mb-1"><i className="bi bi-person" aria-hidden="true" /> {o.contact.name} · {[o.contact.phone, o.contact.email].filter(Boolean).join(' / ')}</p>
      {o.mode === 'delivery' && <p className="order-meta mb-1"><i className="bi bi-geo-alt" aria-hidden="true" /> {o.address}</p>}
      {o.riderNote && <p className="order-meta mb-1"><i className="bi bi-chat-left-text" aria-hidden="true" /> {o.riderNote}</p>}
      {o.notes && <p className="order-meta mb-1"><i className="bi bi-sticky" aria-hidden="true" /> {o.notes}</p>}
      {o.status === 'on_the_way' && o.riderToken && (
        <div className="rider-link-box">
          <span><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {o.rider ? `Rider sharing location · ${agoText(o.rider.at)}` : 'Rider location not shared yet'}</span>
          <span className="d-flex gap-1 flex-wrap">
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={copy}><i className="bi bi-link-45deg" aria-hidden="true" />Copy rider link</button>
            <Link className="btn btn-sm btn-outline-dark" to={`/rider/${o.riderToken}`} target="_blank" rel="noopener"><i className="bi bi-phone" aria-hidden="true" />Open rider page</Link>
          </span>
        </div>
      )}
      <div className="order-actions mt-2">
        <span className="order-total">{rs(o.total)} <small className="text-body-secondary fw-normal">{o.payment}</small></span>
        <div className="btns">
          {extra}
          {actions.map(([s, label]) => (
            <button key={s} type="button" className={`btn btn-sm ${s === 'rejected' ? 'btn-outline-danger' : 'btn-dark'}`} onClick={() => onStatus(o, s)}>{label}</button>
          ))}
        </div>
      </div>
    </article>
  );
}
