import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/data.js';
import { rs } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ImgTile } from './Common.jsx';

const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

/** Add button, or − qty + stepper once the item is in the basket */
export function AddControl({ product }) {
  const cart = useCart();
  const { vendorById } = useCatalog();
  const { toast, openCart } = useUI();
  const v = vendorById(product.vendorId);
  if (!product.available) return <button type="button" className="add-btn" disabled>Sold out</button>;
  if (v && !v.isOpen) return <button type="button" className="add-btn" disabled>Closed</button>;
  const qty = cart.qtyOf(product.id);
  if (!qty) {
    return (
      <button type="button" className="add-btn" aria-label={`Add ${product.name} to basket`}
        onClick={() => { cart.add(product.id); toast(`${product.name} added to basket`, { icon: 'bi-basket2-fill', action: { label: 'View basket', run: openCart } }); }}>
        <i className="bi bi-plus-lg" aria-hidden="true" /><span className="lbl">Add</span>
      </button>
    );
  }
  return (
    <div className="stepper" role="group" aria-label={`Quantity of ${product.name}`}>
      {qty === 1
        ? <button type="button" aria-label={`Remove ${product.name} from basket`} onClick={() => cart.remove(product.id)}><i className="bi bi-trash3" aria-hidden="true" /></button>
        : <button type="button" aria-label={`Decrease quantity of ${product.name}`} onClick={() => cart.setQty(product.id, qty - 1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button>}
      <span className="qty" aria-live="polite">{qty}</span>
      <button type="button" aria-label={`Increase quantity of ${product.name}`} onClick={() => cart.setQty(product.id, qty + 1)}><i className="bi bi-plus-lg" aria-hidden="true" /></button>
    </div>
  );
}

/** Heart button that saves a product or store to favourites (stored in MongoDB) */
export function FavButton({ kind, id, name, className = 'fav-btn' }) {
  const { user, favourites, setFavourites } = useAuth();
  const { toast, toastError } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const on = favourites[kind].includes(id);
  const toggle = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login', { state: { from: location.pathname, reason: 'Log in to save favourites.' } }); return; }
    try {
      const res = await api('/me/favourites', { method: 'POST', body: { kind, id } });
      setFavourites((f) => ({ ...f, [kind]: res.on ? [...f[kind], id] : f[kind].filter((x) => x !== id) }));
      toast(res.on ? `Saved ${name} to favourites` : `Removed ${name} from favourites`, { icon: res.on ? 'bi-heart-fill' : 'bi-heart' });
    } catch (err) { toastError(err); }
  };
  return (
    <button type="button" className={className} aria-pressed={on} onClick={toggle}
      aria-label={`${on ? 'Remove' : 'Save'} ${name} ${on ? 'from' : 'to'} favourites`}>
      <i className="bi bi-heart" aria-hidden="true" />
    </button>
  );
}

export function ProductCard({ product }) {
  const { vendorById } = useCatalog();
  const { openProduct } = useUI();
  const v = vendorById(product.vendorId);
  if (!v) return null;
  return (
    <article className="product-card">
      {(product.featured || product.isNew) && (
        <div className="badge-row">
          {product.featured && <span className="p-badge">Popular</span>}
          {product.isNew && <span className="p-badge new">New</span>}
        </div>
      )}
      <FavButton kind="products" id={product.id} name={product.name} />
      <ImgTile as="button" type="button" image={product.image} cat={product.category} alt={product.name}
        aria-label={`View details for ${product.name}`} onClick={() => openProduct(product.id)} />
      {!product.available && <div className="sold-out" aria-hidden="true"><span>Sold out</span></div>}
      <div className="p-body">
        <Link className="p-vendor" to={`/store/${v.id}`}>{v.name} <span className="p-cat">{categoryLabel(product.category)}</span></Link>
        <h3 className="p-name"><button type="button" onClick={() => openProduct(product.id)}>{product.name}</button></h3>
        <p className="p-desc">{product.description}</p>
        <div className="p-foot">
          <span className="p-price">{rs(product.price)}</span>
          <div className="p-action"><AddControl product={product} /></div>
        </div>
      </div>
    </article>
  );
}

export function MenuItem({ product }) {
  const { openProduct } = useUI();
  return (
    <article className="menu-item">
      <div className="d-flex flex-column">
        <h3 className="p-name">
          <button type="button" onClick={() => openProduct(product.id)}>{product.name}</button>
          {product.isNew && <> <span className="p-badge new">New</span></>}
        </h3>
        <p className="p-desc">{product.description}</p>
        <div className="p-foot justify-content-start gap-2">
          <span className="p-price">{rs(product.price)}</span>
          {!product.available && <span className="p-cat">Sold out</span>}
          <FavButton kind="products" id={product.id} name={product.name} className="fav-mini" />
        </div>
      </div>
      <ImgTile as="button" type="button" image={product.image} cat={product.category} alt={product.name}
        aria-label={`View details for ${product.name}`} onClick={() => openProduct(product.id)} />
      <div className="menu-actions p-action"><AddControl product={product} /></div>
    </article>
  );
}

export { categoryLabel };
