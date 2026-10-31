import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AREAS } from '../lib/data.js';
import { rs, plural, whenOptions, PHONE_RE, EMAIL_RE, normPhone } from '../lib/format.js';
import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { EmptyState } from '../components/Common.jsx';
import { Totals, PromoBox } from '../components/Basket.jsx';
import { addrIcon } from '../components/Overlays.jsx';
import useTitle from '../lib/useTitle.js';

/** Field with a label, error text and aria wiring */
function Field({ id, label, req, opt, error, help, children }) {
  return (
    <>
      <label htmlFor={id} className="form-label">{label} {req && <span className="req">required</span>}{opt && <span className="opt">optional</span>}</label>
      {children}
      {help && <div className="form-text" id={`${id}Help`}>{help}</div>}
      <div className="invalid-feedback" id={`${id}Err`} style={error ? { display: 'block' } : undefined}>{error}</div>
    </>
  );
}

export default function Checkout() {
  useTitle('Checkout — Mangao');
  const cart = useCart();
  const { user, addresses, reloadAddresses } = useAuth();
  const { toast } = useUI();
  const { reload: reloadCatalog } = useCatalog();
  const { setOrders } = useOrders();
  const navigate = useNavigate();
  const pickup = cart.mode === 'pickup';
  const addr = addresses.find((a) => a.id === cart.addressId) || addresses.find((a) => a.isDefault) || addresses[0];

  const [f, setF] = useState(() => ({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    address: addr?.line || '', area: addr?.area || '', riderNote: '', pickupNote: '',
    saveAddress: true, when: 'As soon as possible', payment: 'Cash', notes: '',
  }));
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [whens] = useState(whenOptions);
  const topRef = useRef(null);
  const set = (k) => (e) => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setF((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };

  useEffect(() => { if (summary) topRef.current?.focus(); }, [summary]);

  if (!cart.count) {
    return (
      <section className="container-xl page-pad" aria-labelledby="checkoutTitle">
        <Link to="/" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> Keep shopping</Link>
        <h1 id="checkoutTitle" className="mt-2">Checkout</h1>
        <EmptyState title="Nothing to check out yet" text="Your basket is empty. Add a few things and come back here to place your order.">
          <Link to="/browse" className="btn btn-mango">Browse products</Link>
        </EmptyState>
      </section>
    );
  }

  const blocked = [
    ...cart.shortfalls.map((s) => `Add ${rs(s.short)} more from ${s.vendor.name} to reach its delivery minimum, or switch to Pickup.`),
    ...cart.problems,
  ];

  const validate = () => {
    const e = {};
    if (!pickup) {
      if (!f.address.trim()) e.address = 'Enter your delivery address.';
      else if (f.address.trim().length < 8) e.address = 'Add a bit more detail, such as house number and street.';
      if (!f.area) e.area = 'Choose your area.';
    }
    if (!f.name.trim()) e.name = 'Enter your name.';
    else if (f.name.trim().length < 2) e.name = 'Your name should be at least 2 characters.';
    const phone = normPhone(f.phone.trim());
    if (!phone && !f.email.trim()) e.phone = 'Add a mobile number or an email so you can be reached about the order.';
    if (phone && !PHONE_RE.test(phone)) e.phone = 'Enter a Pakistani mobile number like 0300 1234567.';
    if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter an email like name@example.com.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!user) { navigate('/login', { state: { from: '/checkout', reason: 'Log in to place your order. Your basket is saved.' } }); return; }
    const e = validate();
    setErrors(e);
    const msgs = [...Object.values(e), ...blocked];
    if (msgs.length) { setSummary({ title: `Please fix ${plural(msgs.length, 'thing')}:`, items: msgs }); return; }
    setSummary(null);
    setBusy(true);
    try {
      const res = await api('/orders', {
        method: 'POST',
        body: {
          mode: cart.mode,
          items: cart.items.map((l) => ({ productId: l.productId, qty: l.qty })),
          contact: { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() },
          address: pickup ? '' : f.address.trim(), area: pickup ? '' : f.area,
          riderNote: f.riderNote.trim(), pickupNote: f.pickupNote.trim(),
          saveAddress: !pickup && f.saveAddress, payment: f.payment, when: f.when, notes: f.notes.trim(),
          tip: cart.tip, promo: cart.promo ? cart.promo.code : '',
        },
      });
      setOrders((list) => [...res.orders, ...list]);
      cart.clear();
      cart.setTip(null);
      reloadAddresses().catch(() => {});
      if (res.orders.length > 1) {
        navigate('/orders');
        toast(`${res.orders.length} orders placed — one for each place`, { icon: 'bi-bag-check-fill', type: 'ok', ms: 4500 });
      } else {
        navigate(`/track/${res.orders[0].id}`);
        toast(`Order ${res.orders[0].id} placed`, { icon: 'bi-bag-check-fill', type: 'ok' });
      }
    } catch (err) {
      setSummary({ title: "Your order wasn't placed.", items: [err.message] });
      if (err.status === 400) reloadCatalog();
    } finally {
      setBusy(false);
    }
  };

  const inv = (k) => (errors[k] ? 'is-invalid' : '');

  return (
    <section className="container-xl page-pad" aria-labelledby="checkoutTitle">
      <Link to="/" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> Keep shopping</Link>
      <h1 id="checkoutTitle" className="mt-2">Checkout</h1>
      {!user && <p className="demo-note"><i className="bi bi-info-circle" aria-hidden="true" /> You'll be asked to log in when you place the order. Your basket stays saved.</p>}
      <div className="checkout-grid">
        <form id="checkoutForm" noValidate onSubmit={submit}>
          {summary && (
            <div className="form-error-summary" role="alert" tabIndex={-1} ref={topRef}>
              <strong>{summary.title}</strong>
              <ul>{summary.items.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}

          <fieldset className="panel">
            <legend className="panel-title"><span className="step-no" aria-hidden="true">1</span>How do you want it?</legend>
            <div className="mode-cards" role="radiogroup" aria-label="Order mode">
              <label className="mode-card"><input type="radio" name="coMode" value="delivery" checked={!pickup} onChange={() => cart.setMode('delivery')} /><span><i className="bi bi-bicycle" aria-hidden="true" /><strong>Delivery</strong><small>To your door</small></span></label>
              <label className="mode-card"><input type="radio" name="coMode" value="pickup" checked={pickup} onChange={() => cart.setMode('pickup')} /><span><i className="bi bi-bag" aria-hidden="true" /><strong>Pickup</strong><small>Collect it yourself, no delivery fee</small></span></label>
            </div>
            {!pickup ? (
              <div className="mt-3">
                <div className="mb-3">
                  <Field id="coAddress" label="Delivery address" req error={errors.address} help="Pick a saved address or type a new one.">
                    <textarea id="coAddress" className={`form-control ${inv('address')}`} rows={2} maxLength={200} placeholder="House no., street, block"
                      aria-invalid={Boolean(errors.address)} aria-describedby="coAddressHelp coAddressErr" value={f.address} onChange={set('address')} />
                  </Field>
                  {addresses.length > 0 && (
                    <div className="saved-addr-row" aria-label="Saved addresses">
                      {addresses.map((a) => (
                        <button key={a.id} type="button" className="chip" onClick={() => { setF((x) => ({ ...x, address: a.line, area: a.area })); setErrors((x) => ({ ...x, address: undefined, area: undefined })); cart.setAddressId(a.id); }}>
                          <i className={`bi ${addrIcon(a.label)}`} aria-hidden="true" />{a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="form-check mt-2">
                    <input className="form-check-input" type="checkbox" id="coSaveAddr" checked={f.saveAddress} onChange={set('saveAddress')} />
                    <label className="form-check-label small" htmlFor="coSaveAddr">Save this address to my account</label>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <Field id="coArea" label="Area" req error={errors.area}>
                      <select id="coArea" className={`form-select ${inv('area')}`} aria-invalid={Boolean(errors.area)} aria-describedby="coAreaErr" value={f.area} onChange={set('area')}>
                        <option value="">Choose an area</option>
                        {AREAS.map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="col-sm-6">
                    <Field id="coRiderNote" label="Note for rider" opt>
                      <input id="coRiderNote" className="form-control" maxLength={80} placeholder="e.g. Ring the bell twice" value={f.riderNote} onChange={set('riderNote')} />
                    </Field>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="pickup-info">
                  <strong>Pickup points</strong>
                  <ul className="mb-0 mt-1 ps-3">{cart.groups.map((g) => <li key={g.vendor.id}>{g.vendor.name}, {g.vendor.area} — ready in about {Math.max(10, g.vendor.eta[0] - 10)} min</li>)}</ul>
                </div>
                <label htmlFor="coPickupNote" className="form-label mt-2">Pickup note <span className="opt">optional</span></label>
                <input id="coPickupNote" className="form-control" maxLength={80} placeholder="e.g. I'll arrive in a white car" value={f.pickupNote} onChange={set('pickupNote')} />
              </div>
            )}
          </fieldset>

          <fieldset className="panel">
            <legend className="panel-title"><span className="step-no" aria-hidden="true">2</span>Your details</legend>
            <div className="row g-3">
              <div className="col-12">
                <Field id="coName" label="Full name" req error={errors.name}>
                  <input id="coName" className={`form-control ${inv('name')}`} autoComplete="name" maxLength={60} aria-invalid={Boolean(errors.name)} aria-describedby="coNameErr" value={f.name} onChange={set('name')} />
                </Field>
              </div>
              <div className="col-sm-6">
                <Field id="coPhone" label="Mobile number" error={errors.phone}>
                  <input id="coPhone" className={`form-control ${inv('phone')}`} type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" aria-invalid={Boolean(errors.phone)} aria-describedby="coPhoneErr coContactHelp" value={f.phone} onChange={set('phone')} />
                </Field>
              </div>
              <div className="col-sm-6">
                <Field id="coEmail" label="Email" error={errors.email}>
                  <input id="coEmail" className={`form-control ${inv('email')}`} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} aria-describedby="coEmailErr coContactHelp" value={f.email} onChange={set('email')} />
                </Field>
              </div>
              <div className="col-12"><div className="form-text mt-0" id="coContactHelp">Give at least one way to reach you — a mobile number or an email.</div></div>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend className="panel-title"><span className="step-no" aria-hidden="true">3</span>When and how to pay</legend>
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="coWhen" className="form-label">When</label>
                <select id="coWhen" className="form-select" value={f.when} onChange={set('when')}>{whens.map((o) => <option key={o}>{o}</option>)}</select>
              </div>
              <div className="col-sm-6">
                <span className="form-label d-block" id="payLabel">Payment method</span>
                <div className="pay-options" role="radiogroup" aria-labelledby="payLabel">
                  {[['Cash', 'bi-cash-stack', 'Cash'], ['Card (demo)', 'bi-credit-card', 'Card'], ['Wallet (demo)', 'bi-phone', 'Wallet']].map(([val, icon, label]) => (
                    <label className="pay-opt" key={val}><input type="radio" name="coPay" value={val} checked={f.payment === val} onChange={set('payment')} /><span><i className={`bi ${icon}`} aria-hidden="true" />{label}</span></label>
                  ))}
                </div>
              </div>
              <div className="col-12"><p className="demo-note"><i className="bi bi-info-circle" aria-hidden="true" /> Pay in cash when your order arrives or when you collect it. Card and wallet are test options for now: no card details are asked for and nothing is charged.</p></div>
              {!pickup && (
                <div className="col-12">
                  <span className="form-label d-block" id="tipLabel">Tip your rider <span className="opt">optional, 100% goes to the rider</span></span>
                  <div className="tip-row" role="radiogroup" aria-labelledby="tipLabel">
                    {[0, 50, 100, 150].map((t) => (
                      <label className="tip-opt" key={t}><input type="radio" name="coTip" value={t} checked={cart.tip === t} onChange={() => cart.setTip(t)} /><span>{t ? rs(t) : 'No tip'}</span></label>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-12">
                <label htmlFor="coNotes" className="form-label">Order notes <span className="opt">optional</span></label>
                <textarea id="coNotes" className="form-control" rows={2} maxLength={200} placeholder="e.g. No onions in the burger" aria-describedby="coNotesCount" value={f.notes} onChange={set('notes')} />
                <div className="form-text text-end" id="coNotesCount">{f.notes.length} / 200</div>
              </div>
            </div>
          </fieldset>
        </form>

        <aside className="panel summary-panel" aria-labelledby="summaryTitle">
          <h2 id="summaryTitle" className="panel-title">Order summary</h2>
          {cart.groups.map((g) => (
            <div key={g.vendor.id}>
              <p className="summary-vendor mb-1">{g.vendor.name}</p>
              {g.lines.map((l) => <div className="summary-line" key={l.productId}><span>{l.qty} × {l.product.name}</span><span>{rs(l.product.price * l.qty)}</span></div>)}
            </div>
          ))}
          <div className="mt-2"><Totals withTip /></div>
          {cart.groups.length > 1 && <p className="tiny-note">Each place prepares its part separately, so you'll get {cart.groups.length} order numbers to track.</p>}
          {blocked.map((t) => <p className="min-warn" key={t}><i className="bi bi-exclamation-circle" aria-hidden="true" /><span>{t}</span></p>)}
          <div className="promo-form mt-3"><PromoBox id="coPromo" /></div>
          <button type="submit" form="checkoutForm" className="btn btn-mango btn-lg w-100 mt-3" disabled={busy}>
            {busy ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Placing order…</> : `Place order · ${rs(cart.totals(true).total)}`}
          </button>
          <p className="tiny-note">Your order is sent straight to the store. You can follow it live on the tracking page.</p>
        </aside>
      </div>
    </section>
  );
}
