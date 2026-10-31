import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../lib/data.js';
import { rs, fmtDate } from '../lib/format.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import Mangi from '../components/Mangi.jsx';
import StoreCard from '../components/StoreCard.jsx';
import { ProductCard } from '../components/ProductParts.jsx';
import { VendorLogo, Loading, EmptyState } from '../components/Common.jsx';
import useTitle from '../lib/useTitle.js';
import { reorderInto } from '../lib/reorder.js';

const sortV = (a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.featured) - Number(a.featured) || b.rating - a.rating;

export default function Home() {
  useTitle('Mangao — Order it. Get it.');
  const navigate = useNavigate();
  const { stores, products, status, reload, vendorById, productById } = useCatalog();
  const cart = useCart();
  const { addresses } = useAuth();
  const { orders } = useOrders();
  const { settings } = useSettings();
  const { toast, openCart } = useUI();
  const [q, setQ] = useState('');
  const [popCat, setPopCat] = useState('all');

  const addr = addresses.find((a) => a.id === cart.addressId) || addresses.find((a) => a.isDefault) || addresses[0];
  const past = orders.filter((o) => ['delivered', 'collected'].includes(o.status)).slice(0, 4);
  const popular = products.filter((p) => p.featured && p.available && (popCat === 'all' || p.category === popCat)).slice(0, 8);

  return (
    <section aria-labelledby="homeTitle">
      <div className="hero">
        <div className="container-xl hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker"><span className="mode-pill">{cart.mode === 'pickup' ? 'Pickup across Lahore' : `Delivering to ${addr?.area || 'Lahore'}`}</span></p>
            <h1 id="homeTitle" className="hero-title">Order it.<br />Get it.</h1>
            <p className="hero-sub">Meals, groceries and everyday essentials from places across Lahore — in one basket, with every rupee itemised.</p>
            <form className="hero-search" role="search" onSubmit={(e) => { e.preventDefault(); navigate(`/browse?q=${encodeURIComponent(q)}`); }}>
              <label htmlFor="heroSearch" className="visually-hidden">What do you need today?</label>
              <i className="bi bi-search" aria-hidden="true" />
              <input type="search" id="heroSearch" placeholder="What do you need today?" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit" className="btn btn-dark">Find it</button>
            </form>
            <div className="hero-quick" aria-label="Popular searches">
              <span className="text-dark-50">Try</span>
              {['pizza', 'biryani', 'milk', 'toothpaste'].map((w) => <Link key={w} className="quick-chip" to={`/browse?q=${w}`}>{w}</Link>)}
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-plate">
              <div className="hero-mangi"><Mangi mood="ride" /></div>
              <div className="float-card fc-1"><span>🍕</span>Pizza Hut<small>30–40 min</small></div>
              <div className="float-card fc-2"><span>🛒</span>Carrefour<small>30–45 min</small></div>
              <div className="float-card fc-3"><span>🧴</span>D.Watson<small>25–35 min</small></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-xl">
        {status === 'loading' && <Loading text="Loading restaurants and shops…" />}
        {status === 'error' && (
          <EmptyState mood="sad" title="Could not load the stores" text="Check your connection and try again.">
            <button type="button" className="btn btn-mango" onClick={reload}>Try again</button>
          </EmptyState>
        )}
        {status === 'ready' && (
          <>
            <section className="home-block" aria-labelledby="catTitle">
              <div className="block-head"><h2 id="catTitle">Shop by category</h2></div>
              <div className="category-tiles">
                {CATEGORIES.map((c) => (
                  <Link key={c.value} className="cat-tile" data-cat={c.value} to={`/browse?cat=${c.value}`}>
                    <span className="cat-emoji" aria-hidden="true">{c.emoji}</span>
                    <h3>{c.label}</h3><p>{c.blurb}</p>
                    <span className="cat-count">{products.filter((p) => p.category === c.value).length} items</span>
                  </Link>
                ))}
              </div>
            </section>

            {past.length > 0 && (
              <section className="home-block" aria-labelledby="orderAgainTitle">
                <div className="block-head"><h2 id="orderAgainTitle">Order again</h2><Link to="/orders" className="see-all">All orders</Link></div>
                <div className="h-scroll">
                  {past.map((o) => (
                    <article className="order-card mb-0" key={o.id}>
                      <div className="order-vendors">
                        <span className="logo-stack">{vendorById(o.storeId) && <VendorLogo vendor={vendorById(o.storeId)} />}</span>
                        <div><p className="order-title">{o.storeName}</p><span className="order-meta">{fmtDate(o.createdAt)}</span></div>
                      </div>
                      <p className="order-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                      <div className="order-actions">
                        <span className="order-total">{rs(o.total)}</span>
                        <button type="button" className="btn btn-sm btn-dark" onClick={() => reorderInto(o, { cart, productById, vendorById, toast, openCart })}>
                          <i className="bi bi-arrow-repeat" aria-hidden="true" />Reorder
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {settings.notifPromo && (
              <section className="promo-banner" aria-labelledby="promoTitle">
                <div className="promo-mangi" aria-hidden="true"><Mangi mood="wave" /></div>
                <div className="promo-copy">
                  <h2 id="promoTitle">Rs. 150 off your first basket</h2>
                  <p>Use code <strong>MANGO150</strong> at checkout. One use per account.</p>
                </div>
                <button type="button" className="btn btn-dark promo-copy-btn" onClick={async () => {
                  try { await navigator.clipboard.writeText('MANGO150'); toast('Code MANGO150 copied', { icon: 'bi-clipboard-check' }); } catch { toast('Your code is MANGO150', { icon: 'bi-ticket-perforated' }); }
                }}><i className="bi bi-clipboard me-1" aria-hidden="true" />Copy code</button>
              </section>
            )}

            <section className="home-block" aria-labelledby="nearRestTitle">
              <div className="block-head"><h2 id="nearRestTitle">Restaurants near you</h2><Link to="/restaurants" className="see-all">See all</Link></div>
              <div className="h-scroll">{stores.filter((v) => v.type === 'restaurant').sort(sortV).slice(0, 8).map((v) => <StoreCard key={v.id} vendor={v} />)}</div>
            </section>

            <section className="home-block" aria-labelledby="nearShopTitle">
              <div className="block-head"><h2 id="nearShopTitle">Shops and supermarkets</h2><Link to="/shops" className="see-all">See all</Link></div>
              <div className="h-scroll">{stores.filter((v) => v.type === 'shop').sort(sortV).slice(0, 8).map((v) => <StoreCard key={v.id} vendor={v} />)}</div>
            </section>

            <section className="home-block" aria-labelledby="popularTitle">
              <div className="block-head"><h2 id="popularTitle">Popular right now</h2><Link to="/browse" className="see-all">Browse everything</Link></div>
              <div className="chip-row" role="group" aria-label="Filter popular items by category">
                {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
                  <button key={c.value} type="button" className="chip" aria-pressed={popCat === c.value} onClick={() => setPopCat(c.value)}>{c.label}</button>
                ))}
              </div>
              <div className="product-grid">{popular.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          </>
        )}

        <section className="value-strip" aria-label="Why Mangao">
          <div className="value-item"><i className="bi bi-receipt-cutoff" aria-hidden="true" /><div><h3>Every rupee itemised</h3><p>Subtotal, delivery fee, tip and discounts shown separately before you pay.</p></div></div>
          <div className="value-item"><i className="bi bi-basket3" aria-hidden="true" /><div><h3>One basket, many places</h3><p>Add a burger from NY212 and milk from Carrefour to the same checkout.</p></div></div>
          <div className="value-item"><i className="bi bi-geo-alt" aria-hidden="true" /><div><h3>Live rider tracking</h3><p>Watch your rider move on a real map once your order is on the way.</p></div></div>
        </section>
      </div>
    </section>
  );
}
