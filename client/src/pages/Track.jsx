import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ORDER_FLOW, STATUS_LABEL, STATUS_TEXT, isActive } from '../lib/data.js';
import { rs, fmtDate, fmtTime, agoText } from '../lib/format.js';
import { api } from '../lib/api.js';
import usePolling from '../lib/usePolling.js';
import { useOrders } from '../context/OrdersContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { EmptyState, Loading } from '../components/Common.jsx';
import Mangi from '../components/Mangi.jsx';
import MapView from '../components/MapView.jsx';
import { RateRow, useReorder } from '../components/OrderBits.jsx';
import useTitle from '../lib/useTitle.js';

function mapStatusText(o) {
  if (o.mode === 'pickup') return o.status === 'ready' ? 'Ready to collect' : '';
  if (o.status === 'on_the_way') return o.rider ? `Rider location · updated ${agoText(o.rider.at)}` : 'Waiting for the rider to share their location';
  if (o.status === 'delivered') return 'Delivered';
  return 'The rider appears here once your order is on its way';
}

export default function Track() {
  const { id } = useParams();
  const { orders, upsert } = useOrders();
  const { confirm, toast, toastError } = useUI();
  const reorder = useReorder();
  const [local, setOrder] = useState(null);
  // prefer the copy in the orders list (it is updated by rating, cancelling and polling)
  const order = orders.find((o) => o.id === id) || local;
  const [state, setState] = useState(order ? 'ready' : 'loading');
  const [, tick] = useState(0);
  useTitle(`Tracking ${id} — Mangao`);

  const refresh = useCallback(async () => {
    try {
      const res = await api(`/orders/${encodeURIComponent(id)}`);
      setOrder(res.order);
      upsert(res.order);
      setState('ready');
    } catch (err) {
      if (err.status === 404) setState('missing');
    }
  }, [id, upsert]);

  useEffect(() => { refresh(); }, [refresh]);
  // every 5 s while the order is still moving (the rider's position comes with it)
  usePolling(refresh, 5000, Boolean(order && isActive(order)));
  usePolling(() => tick((n) => n + 1), 10000, Boolean(order?.rider)); // keeps "updated x ago" fresh

  if (state === 'loading') return <Loading text="Loading your order…" />;
  if (state === 'missing' || !order) {
    return (
      <section className="container-xl page-pad narrow">
        <EmptyState mood="sad" title={`We couldn't find order ${id}`} text="Check the order number, or see all your orders."><Link to="/orders" className="btn btn-mango">See your orders</Link></EmptyState>
      </section>
    );
  }

  const o = order;
  const flow = ORDER_FLOW[o.mode];
  const stopped = ['cancelled', 'rejected'].includes(o.status);
  const done = ['delivered', 'collected'].includes(o.status);
  const idx = flow.indexOf(o.status);
  const eventTime = (s) => { const e = o.events.find((x) => x.status === s); return e ? fmtTime(e.at) : ''; };
  const lastNote = [...o.events].reverse().find((e) => e.note);
  const siblings = orders.filter((x) => x.checkoutId === o.checkoutId && x.id !== o.id);

  const cancel = async () => {
    if (!(await confirm({ title: 'Cancel this order?', text: `${o.storeName} hasn't accepted it yet, so you won't be charged.`, confirmLabel: 'Cancel order' }))) return;
    try {
      const res = await api(`/orders/${encodeURIComponent(o.id)}/cancel`, { method: 'POST' });
      setOrder(res.order); upsert(res.order);
      toast('Order cancelled', { icon: 'bi-x-circle' });
    } catch (err) { toastError(err); refresh(); }
  };

  return (
    <section className="container-xl page-pad narrow" aria-labelledby="trackTitle">
      <Link to="/orders" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> All orders</Link>
      <div className="track-head">
        <div><h1 id="trackTitle">Order {o.id}</h1><p className="page-sub">{fmtDate(o.createdAt)} · {o.storeName}</p></div>
        {isActive(o) && <span className="sim-badge live"><span className="live-dot" aria-hidden="true" />Live · updates automatically</span>}
      </div>
      <div className="track-hero" role="status" aria-live="polite">
        <div>
          <h2>{STATUS_LABEL[o.status]}</h2><p>{STATUS_TEXT[o.status]}</p>
          {lastNote && <p className="mt-1">Note: {lastNote.note}</p>}
          {isActive(o) && <p className="mt-2"><i className="bi bi-clock me-1" aria-hidden="true" />{o.mode === 'pickup' ? 'Usually ready in' : 'Usually arrives in'} about {o.mode === 'pickup' ? Math.max(10, (o.storeEta || 30) - 15) : o.storeEta || 40} min from when it's accepted</p>}
        </div>
        <div className="track-mangi" aria-hidden="true"><Mangi mood={stopped ? 'sad' : done ? 'wave' : 'ride'} /></div>
      </div>

      {!stopped && (
        <section className="panel" aria-label="Order progress">
          <ol className="stepper-track" style={{ gridTemplateColumns: `repeat(${flow.length},1fr)` }}>
            {flow.map((s, i) => {
              const cls = i < idx || o.status === flow[flow.length - 1] ? 'done' : i === idx ? 'current' : '';
              return (
                <li key={s} className={cls} aria-current={i === idx ? 'step' : undefined}>
                  <span className="dot" aria-hidden="true">{cls === 'done' ? <i className="bi bi-check-lg" /> : i + 1}</span>
                  {STATUS_LABEL[s]}<span className="t">{eventTime(s) || (i > idx ? 'Waiting' : '')}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!stopped && (
        <section className="panel map-panel" aria-labelledby="mapTitle">
          <div className="map-head"><h2 className="panel-title mb-0" id="mapTitle">{o.mode === 'pickup' ? 'Where to collect' : 'Live map'}</h2><span className="map-status">{mapStatusText(o)}</span></div>
          <MapView store={o.storeLocation} storeName={o.storeName} dest={o.mode === 'delivery' ? o.destination : null}
            rider={o.status === 'on_the_way' ? o.rider : null}
            label={`Map showing ${o.mode === 'pickup' ? 'the store' : 'the store, your delivery area and the rider'}`} />
          <p className="tiny-note mb-0">{o.mode === 'pickup' ? `${o.storeName}, ${o.storeArea || ''}` : 'The house pin marks your area, not your exact address. The rider pin moves live while your order is on the way.'}</p>
        </section>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {o.status === 'placed' && <button type="button" className="btn btn-sm btn-outline-danger" onClick={cancel}>Cancel order</button>}
        <Link to={`/help?order=${o.id}`} className="btn btn-sm btn-outline-dark"><i className="bi bi-life-preserver" aria-hidden="true" />Get help with this order</Link>
        {!isActive(o) && <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => reorder(o)}><i className="bi bi-arrow-repeat" aria-hidden="true" />Reorder</button>}
        {siblings.map((s) => <Link key={s.id} to={`/track/${s.id}`} className="btn btn-sm btn-outline-dark">Also in this checkout: {s.storeName}</Link>)}
      </div>

      {done && <section className="panel"><h2 className="panel-title">How was it?</h2><RateRow order={o} /></section>}

      <div className="track-grid">
        <section className="panel" aria-labelledby="tdTitle">
          <h2 className="panel-title" id="tdTitle">Details</h2>
          <dl className="kv">
            <dt>Mode</dt><dd>{o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</dd>
            {o.mode === 'delivery' ? <><dt>Address</dt><dd>{o.address}</dd></> : <><dt>Pick up from</dt><dd>{o.storeName}, {o.storeArea || ''}</dd></>}
            <dt>Name</dt><dd>{o.contact.name}</dd>
            <dt>Contact</dt><dd>{[o.contact.phone, o.contact.email].filter(Boolean).join(' / ') || '—'}</dd>
            <dt>When</dt><dd>{o.when}</dd>
            <dt>Payment</dt><dd>{o.payment}{o.payment === 'Cash' ? ` — pay ${rs(o.total)} ${o.mode === 'pickup' ? 'at pickup' : 'on delivery'}` : <span className="text-body-secondary fw-normal"> (test option, not charged)</span>}</dd>
            {o.riderNote && <><dt>{o.mode === 'pickup' ? 'Pickup note' : 'Rider note'}</dt><dd>{o.riderNote}</dd></>}
            {o.notes && <><dt>Order notes</dt><dd>{o.notes}</dd></>}
          </dl>
        </section>
        <section className="panel" aria-labelledby="tiTitle">
          <h2 className="panel-title" id="tiTitle">Items</h2>
          {o.items.map((i) => <div className="summary-line" key={i.productId}><span>{i.qty} × {i.name}</span><span>{rs(i.price * i.qty)}</span></div>)}
          <ul className="totals mt-2 border-top pt-2">
            <li><span>Subtotal</span><span>{rs(o.subtotal)}</span></li>
            <li><span>Delivery fee</span><span>{o.deliveryFee ? rs(o.deliveryFee) : o.mode === 'pickup' ? rs(0) : 'Free'}</span></li>
            {o.discount > 0 && <li className="discount"><span>Discount{o.promo ? ` (${o.promo})` : ''}</span><span>− {rs(o.discount)}</span></li>}
            {o.tip > 0 && <li><span>Rider tip</span><span>{rs(o.tip)}</span></li>}
            <li className="grand"><span>Total</span><span>{rs(o.total)}</span></li>
          </ul>
        </section>
      </div>
    </section>
  );
}
