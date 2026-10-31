import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { rs } from '../lib/format.js';
import { isActive } from '../lib/data.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import Mangi from './Mangi.jsx';
import { CartDrawer } from './Basket.jsx';
import { ProductModal, ConfirmDialog, AddressModal, Toasts } from './Overlays.jsx';

function ModeToggle() {
  const { mode, setMode } = useCart();
  const { toast } = useUI();
  const change = (m) => {
    if (m === mode) return;
    setMode(m);
    toast(m === 'pickup' ? 'Switched to Pickup — no delivery fees or minimums' : 'Switched to Delivery', { icon: m === 'pickup' ? 'bi-bag' : 'bi-bicycle' });
  };
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Order mode">
      {[['delivery', 'bi-bicycle', 'Delivery'], ['pickup', 'bi-bag', 'Pickup']].map(([m, icon, label]) => (
        <button key={m} type="button" className="mode-btn" role="radio" aria-checked={mode === m} onClick={() => change(m)}>
          <i className={`bi ${icon}`} aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(location.pathname === '/browse' ? params.get('q') || '' : '');
  useEffect(() => { if (location.pathname !== '/browse') setQ(''); }, [location.pathname]);
  const go = (value) => navigate(`/browse?q=${encodeURIComponent(value)}`, { replace: location.pathname === '/browse' });
  return (
    <form className="header-search" role="search" onSubmit={(e) => { e.preventDefault(); go(q); }}>
      <label htmlFor="headerSearch" className="visually-hidden">Search products, restaurants and shops</label>
      <i className="bi bi-search" aria-hidden="true" />
      <input type="search" id="headerSearch" placeholder="Search pizza, milk, toothpaste…" autoComplete="off" value={q}
        onChange={(e) => { setQ(e.target.value); if (e.target.value.trim()) go(e.target.value); }} />
      {q && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQ(''); if (location.pathname === '/browse') go(''); }}><i className="bi bi-x-circle-fill" aria-hidden="true" /></button>}
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const item = (to, icon, label) => <li><Link className="dropdown-item" to={to} onClick={() => setOpen(false)}><i className={`bi ${icon} me-2`} aria-hidden="true" />{label}</Link></li>;
  return (
    <div className="account-dd d-none d-lg-block" ref={ref}>
      <button className="icon-btn avatar-btn" type="button" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)}>
        <span className="avatar">{user ? user.name.trim()[0].toUpperCase() : <i className="bi bi-person" aria-hidden="true" />}</span>
      </button>
      <ul className={`dropdown-menu dropdown-menu-end shadow-sm ${open ? 'show' : ''}`}>
        {user ? (
          <>
            <li><h6 className="dropdown-header">{user.name}</h6></li>
            {item('/account', 'bi-person', 'Profile')}
            {item('/orders', 'bi-receipt', 'Orders')}
            {item('/favourites', 'bi-heart', 'Favourites')}
            {user.role === 'partner' && item('/partner', 'bi-shop', 'My store')}
            {user.role === 'admin' && item('/admin', 'bi-speedometer2', 'Admin panel')}
            {item('/settings', 'bi-gear', 'Settings')}
            {item('/help', 'bi-life-preserver', 'Help & support')}
            <li><hr className="dropdown-divider" /></li>
            <li><button type="button" className="dropdown-item" onClick={async () => { setOpen(false); await logout(); navigate('/'); toast('You have logged out', { icon: 'bi-box-arrow-right' }); }}>
              <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />Log out</button></li>
          </>
        ) : (
          <>
            {item('/login', 'bi-box-arrow-in-right', 'Log in or sign up')}
            {item('/partner', 'bi-shop', 'Sell on Mangao')}
            {item('/settings', 'bi-gear', 'Settings')}
            {item('/help', 'bi-life-preserver', 'Help & support')}
          </>
        )}
      </ul>
    </div>
  );
}

function Header() {
  const cart = useCart();
  const { addresses } = useAuth();
  const { openCart, setAddressOpen } = useUI();
  const { orders } = useOrders();
  const [bump, setBump] = useState(false);
  const prevCount = useRef(cart.count);
  useEffect(() => {
    if (cart.count > prevCount.current) { setBump(true); setTimeout(() => setBump(false), 400); }
    prevCount.current = cart.count;
  }, [cart.count]);
  const addr = addresses.find((a) => a.id === cart.addressId) || addresses.find((a) => a.isDefault) || addresses[0];
  return (
    <header className="app-header">
      <div className="container-xl header-row">
        <Link to="/" className="brand" aria-label="Mangao home">
          <span className="brand-mark"><Mangi /></span>
          <span className="brand-text"><span className="brand-name">Mangao</span><span className="brand-tagline">Order it. Get it.</span></span>
        </Link>
        <ModeToggle />
        <button type="button" className="address-chip" onClick={() => setAddressOpen(true)}>
          <i className="bi bi-geo-alt-fill" aria-hidden="true" />
          <span className="address-chip-text">
            <span className="address-chip-label">{cart.mode === 'pickup' ? 'Pickup near' : 'Deliver to'}{addr ? ` · ${addr.label}` : ''}</span>
            <span className="address-chip-value">{addr ? addr.area : 'Lahore'}</span>
          </span>
          <i className="bi bi-chevron-down small" aria-hidden="true" />
        </button>
        <HeaderSearch />
        <nav className="header-nav" aria-label="Main">
          <NavLink to="/restaurants" className={({ isActive: a }) => `nav-link-item ${a ? 'active' : ''}`}>Restaurants</NavLink>
          <NavLink to="/shops" className={({ isActive: a }) => `nav-link-item ${a ? 'active' : ''}`}>Shops</NavLink>
          <NavLink to="/orders" className={({ isActive: a }) => `nav-link-item ${a ? 'active' : ''}`}>
            Orders{orders.some(isActive) && <span className="dot-badge" />}
          </NavLink>
        </nav>
        <div className="header-actions">
          <Link to="/favourites" className="icon-btn d-none d-md-inline-flex" aria-label="Favourites"><i className="bi bi-heart" aria-hidden="true" /></Link>
          <AccountMenu />
          <button type="button" className="cart-btn" onClick={openCart}>
            <i className="bi bi-basket2-fill" aria-hidden="true" />
            <span className="cart-btn-label">Basket</span>
            <span className={`cart-count ${bump ? 'bump' : ''}`} aria-live="polite">{cart.count}</span>
            <span className="visually-hidden">items in basket</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="container-xl footer-grid">
        <div>
          <Link to="/" className="brand brand-footer" aria-label="Mangao home"><span className="brand-mark"><Mangi /></span><span className="brand-name">Mangao</span></Link>
          <p className="footer-desc">Food, groceries and everyday essentials in one basket. Order it. Get it.</p>
        </div>
        <nav aria-label="Footer: browse">
          <h2 className="footer-h">Browse</h2>
          <ul>
            <li><Link to="/browse?cat=food">Food</Link></li>
            <li><Link to="/browse?cat=groceries">Groceries</Link></li>
            <li><Link to="/browse?cat=essentials">Everyday Essentials</Link></li>
            <li><Link to="/restaurants">Restaurants</Link></li>
            <li><Link to="/shops">Shops</Link></li>
          </ul>
        </nav>
        <nav aria-label="Footer: account">
          <h2 className="footer-h">Account</h2>
          <ul>
            <li><Link to="/orders">Orders</Link></li>
            <li><Link to="/favourites">Favourites</Link></li>
            <li><Link to="/account">Profile</Link></li>
            <li><Link to="/settings">Settings</Link></li>
            <li><Link to="/help">Help &amp; support</Link></li>
            <li><Link to="/partner">Partner with us</Link></li>
          </ul>
        </nav>
        <div className="footer-disclaimer">
          <h2 className="footer-h">About Mangao</h2>
          <p>Order food, groceries and essentials from places across Lahore. Stores marked “Demo listing” use well-known brand names as sample menus and are not affiliated with or endorsed by those brands.</p>
          <p className="mb-0"><Link to="/partner">Sell on Mangao: partner with us</Link></p>
        </div>
      </div>
      <div className="container-xl footer-base">© 2026 Mangao · MongoDB, Express, React, Node.js</div>
    </footer>
  );
}

function BottomNav() {
  const { user } = useAuth();
  const cart = useCart();
  const { openCart } = useUI();
  const location = useLocation();
  const hideBar = ['/checkout', '/track', '/partner', '/admin', '/login', '/rider'].some((p) => location.pathname.startsWith(p));
  const tab = (to, icon, label) => (
    <NavLink to={to} end={to === '/'} className={({ isActive: a }) => (a ? 'active' : '')}><i className={`bi ${icon}`} aria-hidden="true" /><span>{label}</span></NavLink>
  );
  useEffect(() => { document.body.classList.toggle('has-basket', cart.count > 0 && !hideBar); }, [cart.count, hideBar]);
  return (
    <>
      {cart.count > 0 && !hideBar && (
        <div className="basket-bar">
          <button type="button" className="basket-bar-btn" onClick={openCart}>
            <span className="bb-count">{cart.count}</span><span className="bb-label">View basket</span><span className="bb-total">{rs(cart.totals().total)}</span>
          </button>
        </div>
      )}
      <nav className="bottom-nav" aria-label="Mobile">
        {tab('/', 'bi-house-door', 'Home')}
        {tab('/browse', 'bi-search', 'Search')}
        {tab('/orders', 'bi-receipt', 'Orders')}
        {tab('/favourites', 'bi-heart', 'Saved')}
        {tab(user ? '/account' : '/login', 'bi-person', user ? 'Account' : 'Log in')}
      </nav>
    </>
  );
}

export default function Layout() {
  const location = useLocation();
  const { closeCart, closeProduct } = useUI();
  // close overlays and scroll to top when the page changes
  useEffect(() => { closeCart(); closeProduct(); window.scrollTo(0, 0); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1}><Outlet /></main>
      <Footer />
      <BottomNav />
      <CartDrawer />
      <ProductModal />
      <AddressModal />
      <ConfirmDialog />
      <Toasts />
    </>
  );
}
