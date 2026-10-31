import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rs, plural } from '../lib/format.js';
import { feeFor } from '../lib/pricing.js';
import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { EmptyState, ImgTile, VendorLogo } from './Common.jsx';

/** Subtotal / delivery / discount / tip / total */
export function Totals({ withTip = false }) {
  const cart = useCart();
  const t = cart.totals(withTip);
  return (
    <ul className="totals">
      <li><span>Subtotal</span><span>{rs(t.subtotal)}</span></li>
      {cart.mode === 'pickup'
        ? <li><span>Delivery fee<span className="muted">Pickup selected</span></span><span>{rs(0)}</span></li>
        : <li><span>Delivery fee<span className="muted">Charged by each place</span></span><span>{t.deliveryFee === 0 ? 'Free' : rs(t.deliveryFee)}</span></li>}
      {t.discount > 0 && <li className="discount"><span>Discount ({cart.promo.code})</span><span>− {rs(t.discount)}</span></li>}
      {withTip && cart.mode === 'delivery' && <li><span>Rider tip</span><span>{rs(t.tip)}</span></li>}
      <li><span>Service fee</span><span>{rs(0)}</span></li>
      <li className="grand"><span>Total</span><span>{rs(t.total)}</span></li>
    </ul>
  );
}

/** Promo code box; the server checks the code */
export function PromoBox({ id = 'promo' }) {
  const cart = useCart();
  const { user } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  if (cart.promo) {
    return (
      <div className="promo-applied">
        <span><i className="bi bi-ticket-perforated me-1" aria-hidden="true" /><strong>{cart.promo.code}</strong> applied</span>
        <button type="button" onClick={() => cart.setPromo(null)}>Remove</button>
      </div>
    );
  }
  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return setMsg({ ok: false, text: 'Enter a promo code first.' });
    if (!cart.items.length) return setMsg({ ok: false, text: 'Add something to your basket before applying a code.' });
    if (!user) { navigate('/login', { state: { from: '/checkout', reason: 'Log in to use a promo code.' } }); return; }
    try {
      const res = await api('/orders/promo', { method: 'POST', body: { code: c } });
      cart.setPromo({ code: res.code, amount: res.amount });
      toast(`${res.code} applied — Rs. ${res.amount} off`, { icon: 'bi-ticket-perforated', type: 'ok' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };
  return (
    <>
      <label htmlFor={id} className="form-label small mb-1">Promo code</label>
      <div className="input-group input-group-sm">
        <input id={id} className="form-control text-uppercase" placeholder="MANGO150" value={code}
          onChange={(e) => { setCode(e.target.value); setMsg(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} />
        <button type="button" className="btn btn-outline-dark" onClick={apply}>Apply</button>
      </div>
      <div className={`promo-msg ${msg ? (msg.ok ? 'ok' : 'err') : ''}`} aria-live="polite">{msg?.text}</div>
    </>
  );
}

function CartLine({ line }) {
  const cart = useCart();
  const { toast } = useUI();
  const p = line.product;
  const remove = () => {
    cart.remove(p.id);
    toast(`${p.name} removed`, { icon: 'bi-trash3', action: { label: 'Undo', run: () => cart.setQty(p.id, line.qty) } });
  };
  return (
    <div className="cart-line">
      <ImgTile image={p.image} cat={p.category} />
      <div>
        <div className="cart-line-name">{p.name}</div>
        <div className="cart-line-unit">{rs(p.price)} each{!p.available && <> · <strong className="text-danger">Sold out</strong></>}</div>
        <button type="button" className="remove-link" onClick={remove} aria-label={`Remove ${p.name} from basket`}>Remove</button>
      </div>
      <div className="cart-line-right">
        <span className="cart-line-total">{rs(p.price * line.qty)}</span>
        <div className="stepper light" role="group" aria-label={`Quantity of ${p.name}`}>
          <button type="button" disabled={line.qty <= 1} aria-label={`Decrease quantity of ${p.name}`} onClick={() => cart.setQty(p.id, line.qty - 1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button>
          <span className="qty">{line.qty}</span>
          <button type="button" aria-label={`Increase quantity of ${p.name}`} onClick={() => cart.setQty(p.id, line.qty + 1)}><i className="bi bi-plus-lg" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}

/** Slide-in basket panel (opens from the header button) */
export function CartDrawer() {
  const cart = useCart();
  const { cartOpen, closeCart, confirm, toast } = useUI();
  const { addresses } = useAuth();
  const navigate = useNavigate();
  if (!cartOpen) return null;
  const addr = addresses.find((a) => a.id === cart.addressId) || addresses.find((a) => a.isDefault) || addresses[0];
  const blocked = cart.shortfalls.length > 0 || cart.problems.length > 0;
  const go = (to) => { closeCart(); navigate(to); };
  return (
    <>
      <div className="drawer-backdrop" onClick={closeCart} aria-hidden="true" />
      <div className="offcanvas offcanvas-end cart-panel show" role="dialog" aria-modal="true" aria-labelledby="cartTitle"
        onKeyDown={(e) => e.key === 'Escape' && closeCart()}>
        <div className="offcanvas-header">
          <div>
            <h2 className="offcanvas-title h5" id="cartTitle">Your basket</h2>
            <small className="text-body-secondary">{cart.mode === 'pickup' ? 'Pickup — collect from each place' : `Delivery to ${addr ? `${addr.label}, ${addr.area}` : 'your address'}`}</small>
          </div>
          <button type="button" className="btn-close" aria-label="Close basket" onClick={closeCart} autoFocus />
        </div>
        <div className="offcanvas-body">
          {!cart.groups.length ? (
            <EmptyState title="Your basket is empty" text="Find something tasty, or stock up on groceries — it all goes in one basket.">
              <button type="button" className="btn btn-mango" onClick={() => go('/browse')}>Start browsing</button>
            </EmptyState>
          ) : (
            <>
              {cart.groups.map((g) => {
                const fee = feeFor(g.vendor, g.subtotal);
                const short = cart.shortfalls.find((s) => s.vendor.id === g.vendor.id);
                const note = !g.vendor.isOpen ? 'Closed now' : cart.mode === 'pickup' ? 'Pickup' : fee === 0 ? 'Free delivery'
                  : `${rs(fee)} delivery${g.vendor.freeDeliveryOver ? ` · add ${rs(g.vendor.freeDeliveryOver - g.subtotal)} for free delivery` : ''}`;
                return (
                  <section className="cart-group" key={g.vendor.id} aria-label={`${g.vendor.name} items`}>
                    <div className="cart-group-head"><VendorLogo vendor={g.vendor} /><div><Link to={`/store/${g.vendor.id}`} onClick={closeCart}>{g.vendor.name}</Link><small>{note}</small></div></div>
                    {g.lines.map((l) => <CartLine key={l.productId} line={l} />)}
                    {short && <p className="min-warn"><i className="bi bi-exclamation-circle" aria-hidden="true" /><span>Add {rs(short.short)} more from {g.vendor.name} to reach its {rs(g.vendor.minOrder)} delivery minimum, or switch to Pickup.</span></p>}
                  </section>
                );
              })}
              {cart.problems.map((t) => <p className="min-warn" key={t}><i className="bi bi-exclamation-circle" aria-hidden="true" /><span>{t}</span></p>)}
              <button type="button" className="remove-link" onClick={async () => {
                if (await confirm({ title: 'Clear your basket?', text: `This removes all ${plural(cart.count, 'item')} from your basket.`, confirmLabel: 'Clear basket' })) { cart.clear(); toast('Basket cleared', { icon: 'bi-trash3' }); }
              }}>Clear basket</button>
            </>
          )}
        </div>
        {cart.groups.length > 0 && (
          <div className="cart-footer">
            <PromoBox id="cartPromo" />
            <div className="mt-3"><Totals /></div>
            <button type="button" className="btn btn-mango btn-lg w-100 mt-3" disabled={blocked} onClick={() => go('/checkout')}>Go to checkout</button>
            {blocked && <p className="tiny-note text-center">Fix the notes above to continue.</p>}
          </div>
        )}
      </div>
    </>
  );
}
