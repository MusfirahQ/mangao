import { Link } from 'react-router-dom';
import { ORDER_FLOW, STATUS_LABEL, isActive, statusClass } from '../lib/data.js';
import { rs, fmtDate } from '../lib/format.js';
import { api } from '../lib/api.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { reorderInto } from '../lib/reorder.js';
import { VendorLogo } from './Common.jsx';

export const itemsSummary = (o) => o.items.map((i) => `${i.qty}× ${i.name}`).join(', ');

export function RateRow({ order }) {
  const { upsert } = useOrders();
  const { toast, toastError } = useUI();
  const rate = async (n) => {
    try {
      const res = await api(`/orders/${encodeURIComponent(order.id)}/rate`, { method: 'POST', body: { stars: n } });
      upsert(res.order);
      toast(`Thanks! You rated ${order.storeName} ${n} out of 5`, { icon: 'bi-star-fill' });
    } catch (err) { toastError(err); }
  };
  return (
    <div className="rate-row" role="group" aria-label="Rate this order">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= (order.rating || 0) ? 'on' : ''} aria-label={`Rate ${n} out of 5`} aria-pressed={n <= (order.rating || 0)} onClick={() => rate(n)}>
          <i className="bi bi-star-fill" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function useReorder() {
  const cart = useCart();
  const { productById, vendorById } = useCatalog();
  const { toast, openCart } = useUI();
  return (o) => reorderInto(o, { cart, productById, vendorById, toast, openCart });
}

export function OrderCard({ order: o }) {
  const { vendorById } = useCatalog();
  const reorder = useReorder();
  const v = vendorById(o.storeId);
  const active = isActive(o);
  const flow = ORDER_FLOW[o.mode];
  return (
    <article className="order-card">
      <div className="order-top">
        <div className="order-vendors">
          <span className="logo-stack">{v && <VendorLogo vendor={v} />}</span>
          <div><p className="order-title">{o.storeName}</p><span className="order-meta">{o.id} · {fmtDate(o.createdAt)} · {o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</span></div>
        </div>
        <span className={`status-tag ${statusClass(o.status)}`}>{STATUS_LABEL[o.status] || o.status}</span>
      </div>
      <p className="order-items">{itemsSummary(o)}</p>
      {active && <div className="mini-progress" aria-hidden="true"><span style={{ width: `${((flow.indexOf(o.status) + 1) / flow.length) * 100}%` }} /></div>}
      <div className="order-actions mt-3">
        <span className="order-total">{rs(o.total)}</span>
        <div className="btns">
          {['delivered', 'collected'].includes(o.status) && <RateRow order={o} />}
          <Link to={`/track/${o.id}`} className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline-dark'}`}>{active ? <><i className="bi bi-geo" aria-hidden="true" />Track</> : 'Details'}</Link>
          {!active && <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => reorder(o)}><i className="bi bi-arrow-repeat" aria-hidden="true" />Reorder</button>}
          <Link to={`/help?order=${o.id}`} className="btn btn-sm btn-outline-dark">Get help</Link>
        </div>
      </div>
    </article>
  );
}
