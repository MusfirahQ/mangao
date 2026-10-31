import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rs } from '../lib/format.js';
import { useUI } from '../context/UIContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ImgTile } from './Common.jsx';
import { categoryLabel } from './ProductParts.jsx';

function Modal({ onClose, labelledBy, size = '', children, className = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-dialog modal-dialog-centered ${size}`}>
        <div className={`modal-content ${className}`}>{children}</div>
      </div>
    </div>
  );
}

export function ProductModal() {
  const { productId, closeProduct, toast } = useUI();
  const { productById, vendorById } = useCatalog();
  const cart = useCart();
  const p = productId ? productById(productId) : null;
  const inCart = p ? cart.qtyOf(p.id) : 0;
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(inCart || 1); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const v = vendorById(p.vendorId);
  const canAdd = p.available && v && v.isOpen;
  const add = () => {
    if (inCart) { cart.setQty(p.id, qty); toast(`${p.name}: quantity updated to ${qty}`); }
    else { cart.add(p.id, qty); toast(`${p.name} added to basket`, { icon: 'bi-basket2-fill' }); }
    closeProduct();
  };
  return (
    <Modal onClose={closeProduct} labelledBy="pmTitle" className="product-modal">
      <button type="button" className="btn-close-float" aria-label="Close" onClick={closeProduct}><i className="bi bi-x-lg" aria-hidden="true" /></button>
      <ImgTile image={p.image} cat={p.category} alt={p.name} />
      <div className="pm-body">
        <Link className="p-vendor" to={`/store/${v.id}`} onClick={closeProduct}>{v.name} <span className="p-cat">{categoryLabel(p.category)}</span></Link>
        <h2 className="h4 mt-1 mb-1" id="pmTitle">{p.name}</h2>
        <p className="text-body-secondary mb-2">{p.description}</p>
        <p className="p-price fs-5 mb-0">{rs(p.price)}</p>
        {canAdd ? (
          <div className="pm-foot">
            <div className="stepper light" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button>
              <span className="qty" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(99, qty + 1))}><i className="bi bi-plus-lg" aria-hidden="true" /></button>
            </div>
            <button type="button" className="btn btn-mango" onClick={add}>{inCart ? 'Update basket' : 'Add to basket'} · {rs(p.price * qty)}</button>
          </div>
        ) : (
          <p className="min-warn mt-3"><i className="bi bi-x-circle" aria-hidden="true" /><span>{p.available ? `${v.name} is closed right now.` : 'This item is sold out right now.'}</span></p>
        )}
      </div>
    </Modal>
  );
}

export function ConfirmDialog() {
  const { confirmState, closeConfirm } = useUI();
  if (!confirmState) return null;
  return (
    <Modal onClose={() => closeConfirm(false)} labelledBy="cmTitle" size="modal-sm">
      <div className="modal-body">
        <h2 className="h5" id="cmTitle">{confirmState.title}</h2>
        <p className="mb-0">{confirmState.text}</p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-link text-body" onClick={() => closeConfirm(false)}>Cancel</button>
        <button type="button" className="btn btn-dark" onClick={() => closeConfirm(true)} autoFocus>{confirmState.confirmLabel || 'Confirm'}</button>
      </div>
    </Modal>
  );
}

const addrIcon = (label) => ({ Home: 'bi-house', Work: 'bi-briefcase', University: 'bi-mortarboard' }[label] || 'bi-geo-alt');

export function AddressModal() {
  const { addressOpen, setAddressOpen, toast } = useUI();
  const { user, addresses } = useAuth();
  const cart = useCart();
  if (!addressOpen) return null;
  const selected = addresses.find((a) => a.id === cart.addressId) || addresses.find((a) => a.isDefault) || addresses[0];
  const close = () => setAddressOpen(false);
  return (
    <Modal onClose={close} labelledBy="amTitle">
      <div className="modal-header">
        <h2 className="modal-title h5" id="amTitle">Where should we deliver?</h2>
        <button type="button" className="btn-close" aria-label="Close" onClick={close} />
      </div>
      <div className="modal-body">
        {!user ? <p className="text-body-secondary mb-0">Log in to save delivery addresses.</p>
          : !addresses.length ? <p className="text-body-secondary mb-0">You have no saved addresses yet.</p>
            : <div role="radiogroup" aria-label="Saved addresses">{addresses.map((a) => (
              <label className="addr-opt" key={a.id}>
                <input type="radio" name="addrPick" checked={selected?.id === a.id}
                  onChange={() => { cart.setAddressId(a.id); close(); toast(`Delivering to ${a.label}, ${a.area}`, { icon: 'bi-geo-alt-fill' }); }} />
                <span><i className={`bi ${addrIcon(a.label)}`} aria-hidden="true" /><span><strong>{a.label}</strong><small>{a.line}, {a.area}</small></span></span>
              </label>))}</div>}
        <Link to={user ? '/account' : '/login'} className="btn btn-outline-dark w-100 mt-3" onClick={close}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />{user ? 'Add or manage addresses' : 'Log in'}
        </Link>
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts, dismiss, announcement } = useUI();
  return (
    <>
      <div className="toast-container position-fixed">
        {toasts.map((t) => (
          <div key={t.id} className={`m-toast ${t.type}`} role="status">
            <i className={`bi ${t.icon}`} aria-hidden="true" /><span>{t.text}</span>
            {t.action && <button type="button" className="t-action" onClick={() => { t.action.run(); dismiss(t.id); }}>{t.action.label}</button>}
            <button type="button" className="t-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}><i className="bi bi-x-lg" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
    </>
  );
}

export { addrIcon };
