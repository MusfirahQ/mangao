import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rs, plural, ratingText, ratingCount, etaText } from '../lib/format.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { ImgTile, VendorLogo, EmptyState, Loading } from '../components/Common.jsx';
import { FavButton, MenuItem } from '../components/ProductParts.jsx';
import useTitle from '../lib/useTitle.js';
import NotFound from './NotFound.jsx';

function SideBasket({ v }) {
  const cart = useCart();
  const { openCart } = useUI();
  const group = cart.groups.find((g) => g.vendor.id === v.id);
  const others = cart.count - (group ? group.lines.reduce((s, l) => s + l.qty, 0) : 0);
  if (!group) {
    return (
      <div className="side-basket">
        <h2>Your basket</h2>
        <p className="text-body-secondary small mb-0">Items you add from {v.name} appear here.{others > 0 && ` You also have ${plural(others, 'item')} from other places.`}</p>
        {others > 0 && <button type="button" className="btn btn-outline-dark w-100 mt-3" onClick={openCart}>View full basket</button>}
      </div>
    );
  }
  const short = cart.shortfalls.find((s) => s.vendor.id === v.id);
  return (
    <div className="side-basket">
      <h2>From {v.name}</h2>
      {group.lines.map((l) => <div className="summary-line" key={l.productId}><span>{l.qty} × {l.product.name}</span><span>{rs(l.product.price * l.qty)}</span></div>)}
      <div className="summary-line fw-bold border-top mt-2 pt-2"><span>Subtotal here</span><span>{rs(group.subtotal)}</span></div>
      {short && <p className="min-warn"><i className="bi bi-exclamation-circle" aria-hidden="true" /><span>Add {rs(short.short)} more for delivery.</span></p>}
      {others > 0 && <p className="tiny-note">Plus {plural(others, 'item')} from other places.</p>}
      <button type="button" className="btn btn-mango w-100 mt-3" onClick={openCart}>Review basket · {rs(cart.totals().total)}</button>
    </div>
  );
}

export default function StorePage() {
  const { id } = useParams();
  const { products, status, vendorById } = useCatalog();
  const { mode } = useCart();
  const [q, setQ] = useState('');
  const v = vendorById(id);
  useTitle(v ? `${v.name} — Mangao` : 'Store — Mangao');
  if (status === 'loading') return <Loading />;
  if (!v) return <NotFound />;

  const needle = q.trim().toLowerCase();
  const items = products.filter((p) => p.vendorId === v.id && (!needle || `${p.name} ${p.description} ${p.section}`.toLowerCase().includes(needle)));
  const sections = [...new Set(items.map((p) => p.section))];
  const fee = mode === 'pickup' ? 'No delivery fee' : v.deliveryFee === 0 ? 'Free delivery' : `${rs(v.deliveryFee)} delivery`;

  return (
    <section aria-labelledby="vendorName">
      <div className="vendor-hero">
        <ImgTile image={v.cover} cat={v.type === 'shop' ? 'shop' : 'food'} className="vendor-cover" />
        <div className="container-xl vendor-head">
          <div className="vendor-head-card">
            <VendorLogo vendor={v} />
            <div>
              <p className="mb-1"><Link to={v.type === 'shop' ? '/shops' : '/restaurants'} className="back-link small"><i className="bi bi-arrow-left" aria-hidden="true" /> {v.type === 'shop' ? 'Shops' : 'Restaurants'}</Link></p>
              <h1 id="vendorName">{v.name}</h1>
              <p className="page-sub">{(v.tags || []).join(', ')} · {v.area}, Lahore</p>
              <div className="vendor-pills">
                {!v.isOpen && <span className="v-pill closed-pill"><i className="bi bi-moon" aria-hidden="true" />Closed now</span>}
                <span className="v-pill"><i className="bi bi-star-fill" aria-hidden="true" />{ratingText(v)} <span className="text-body-secondary fw-normal">({v.ratings ? `${ratingCount(v.ratings)} ratings` : 'no ratings yet'})</span></span>
                <span className="v-pill"><i className="bi bi-clock" aria-hidden="true" />{etaText(v, mode)}</span>
                <span className="v-pill"><i className="bi bi-bicycle" aria-hidden="true" />{fee}</span>
                {mode === 'delivery' && v.minOrder > 0 && <span className="v-pill"><i className="bi bi-basket" aria-hidden="true" />Min. {rs(v.minOrder)}</span>}
                {mode === 'delivery' && v.freeDeliveryOver > 0 && <span className="v-pill"><i className="bi bi-gift" aria-hidden="true" />Free delivery over {rs(v.freeDeliveryOver)}</span>}
              </div>
              {v.isDemo && <p className="demo-tag mt-3 mb-0"><i className="bi bi-info-circle" aria-hidden="true" />Demo listing: {v.name} is used as a sample menu and is not affiliated with Mangao. Orders are handled by the Mangao team.</p>}
            </div>
            <FavButton kind="vendors" id={v.id} name={v.name} />
          </div>
        </div>
      </div>
      <div className="container-xl vendor-layout">
        <div className="vendor-main">
          <div className="vendor-tools">
            <div className="chip-row sticky-sections" role="navigation" aria-label="Menu sections">
              {sections.map((s, i) => (
                <button key={s} type="button" className="chip" onClick={() => document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{s}</button>
              ))}
            </div>
            <div className="inline-search">
              <label htmlFor="vendorSearch" className="visually-hidden">Search this menu</label>
              <i className="bi bi-search" aria-hidden="true" />
              <input type="search" id="vendorSearch" className="form-control" placeholder="Search this menu" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {!items.length ? (needle
            ? <EmptyState mood="sad" title={`No items match “${q}”`} text={`Try a different word, or browse the full ${v.name} menu.`}><button type="button" className="btn btn-mango" onClick={() => setQ('')}>Show full menu</button></EmptyState>
            : <EmptyState title="The menu is coming soon" text={`${v.name} hasn't added items yet.`} />)
            : sections.map((s, i) => (
              <section className="menu-section" id={`sec-${i}`} aria-labelledby={`sech-${i}`} key={s}>
                <h2 id={`sech-${i}`}>{s}</h2>
                <div className="menu-list">{items.filter((p) => p.section === s).map((p) => <MenuItem key={p.id} product={p} />)}</div>
              </section>
            ))}
        </div>
        <aside className="vendor-side" aria-label="Basket summary"><SideBasket v={v} /></aside>
      </div>
    </section>
  );
}
