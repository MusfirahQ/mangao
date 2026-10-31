import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AREAS, CATEGORIES, IMAGES, isActive } from '../lib/data.js';
import { rs, PHONE_RE, normPhone } from '../lib/format.js';
import { api } from '../lib/api.js';
import usePolling from '../lib/usePolling.js';
import useStatusChange from '../lib/useStatusChange.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { EmptyState, Loading } from '../components/Common.jsx';
import DashOrderCard from '../components/DashOrderCard.jsx';
import useTitle from '../lib/useTitle.js';

function ApplyForm() {
  const { setUser } = useAuth();
  const { toast } = useUI();
  const [f, setF] = useState({ name: '', type: 'restaurant', kind: '', area: '', address: '', phone: '' });
  const [errs, setErrs] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const x = [];
    if (f.name.trim().length < 2) x.push('Enter your restaurant or shop name.');
    if (f.kind.trim().length < 2) x.push('Enter what you sell, e.g. Burgers or Supermarket.');
    if (!f.area) x.push('Choose your area.');
    if (f.address.trim().length < 8) x.push('Enter the full address of your restaurant or shop.');
    if (!PHONE_RE.test(normPhone(f.phone))) x.push('Enter a contact number like 0300 1234567.');
    setErrs(x);
    if (x.length) return;
    setBusy(true);
    try {
      const res = await api('/partner/apply', { method: 'POST', body: f });
      setUser(res.user);
      toast('Application sent! Add your menu while you wait for approval.', { icon: 'bi-shop', type: 'ok', ms: 5000 });
    } catch (err) { setErrs([err.message]); } finally { setBusy(false); }
  };
  return (
    <div className="auth-card wide">
      <h1 id="partnerTitle" className="h3">Sell on Mangao</h1>
      <p className="page-sub mb-3">Tell us about your restaurant or shop. Once our team approves it, customers can order from you and you'll manage orders from your dashboard.</p>
      <form noValidate onSubmit={submit}>
        {errs.length > 0 && <div className="form-error-summary" role="alert"><strong>Please fix:</strong><ul>{errs.map((t) => <li key={t}>{t}</li>)}</ul></div>}
        <div className="row g-3">
          <div className="col-sm-8"><label htmlFor="paName" className="form-label">Restaurant or shop name</label><input id="paName" className="form-control" maxLength={60} value={f.name} onChange={set('name')} /></div>
          <div className="col-sm-4"><label htmlFor="paType" className="form-label">Type</label><select id="paType" className="form-select" value={f.type} onChange={set('type')}><option value="restaurant">Restaurant</option><option value="shop">Shop</option></select></div>
          <div className="col-sm-6"><label htmlFor="paKind" className="form-label">What do you sell?</label><input id="paKind" className="form-control" maxLength={40} placeholder="e.g. Burgers, Supermarket" value={f.kind} onChange={set('kind')} /></div>
          <div className="col-sm-6"><label htmlFor="paArea" className="form-label">Area</label><select id="paArea" className="form-select" value={f.area} onChange={set('area')}><option value="">Choose an area</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="col-12"><label htmlFor="paAddress" className="form-label">Full address</label><input id="paAddress" className="form-control" maxLength={200} value={f.address} onChange={set('address')} /></div>
          <div className="col-sm-6"><label htmlFor="paPhone" className="form-label">Contact number</label><input id="paPhone" type="tel" className="form-control" placeholder="03XX XXXXXXX" value={f.phone} onChange={set('phone')} /></div>
        </div>
        <button type="submit" className="btn btn-mango btn-lg mt-3" disabled={busy}>{busy ? 'Sending…' : 'Submit for approval'}</button>
      </form>
    </div>
  );
}

const IMAGE_KEYS = Object.keys(IMAGES).filter((k) => !['supermarket', 'supermarket2', 'aisle', 'pharmacy', 'bakery'].includes(k));

function MenuPanel({ data, refresh }) {
  const { toast, toastError, confirm } = useUI();
  const blank = { name: '', section: '', price: '', category: 'food', description: '', image: IMAGE_KEYS[0] };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr('Enter the item name.');
    if (!Number.isInteger(Number(f.price)) || Number(f.price) < 1) return setErr('Enter a price in rupees (whole number).');
    setErr('');
    try {
      await api('/partner/products', { method: 'POST', body: { ...f, price: Number(f.price) } });
      setF({ ...blank, section: f.section, category: f.category });
      toast(`${f.name} added to your menu`, { icon: 'bi-plus-circle' });
      refresh();
    } catch (e2) { setErr(e2.message); }
  };
  const patch = async (p, body, msg) => {
    try { await api(`/partner/products/${encodeURIComponent(p.id)}`, { method: 'PATCH', body }); toast(msg); refresh(); } catch (e) { toastError(e); refresh(); }
  };
  const remove = async (p) => {
    if (!(await confirm({ title: `Delete ${p.name}?`, text: 'It will be removed from your menu.', confirmLabel: 'Delete' }))) return;
    try { await api(`/partner/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' }); toast(`${p.name} deleted`, { icon: 'bi-trash3' }); refresh(); } catch (e) { toastError(e); }
  };
  return (
    <>
      <form className="panel" noValidate onSubmit={add}>
        <h2 className="panel-title">Add a menu item</h2>
        {err && <div className="form-error-summary" role="alert">{err}</div>}
        <div className="row g-2">
          <div className="col-md-4"><label htmlFor="prName" className="form-label">Item name</label><input id="prName" className="form-control" maxLength={80} value={f.name} onChange={set('name')} /></div>
          <div className="col-md-3"><label htmlFor="prSection" className="form-label">Menu section</label><input id="prSection" className="form-control" maxLength={40} placeholder="e.g. Burgers" list="sectionList" value={f.section} onChange={set('section')} />
            <datalist id="sectionList">{[...new Set(data.products.map((p) => p.section))].map((s) => <option key={s} value={s} />)}</datalist></div>
          <div className="col-md-2"><label htmlFor="prPrice" className="form-label">Price (Rs.)</label><input id="prPrice" type="number" min="1" step="1" className="form-control" value={f.price} onChange={set('price')} /></div>
          <div className="col-md-3"><label htmlFor="prCategory" className="form-label">Category</label><select id="prCategory" className="form-select" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div className="col-md-8"><label htmlFor="prDesc" className="form-label">Short description <span className="opt">optional</span></label><input id="prDesc" className="form-control" maxLength={200} value={f.description} onChange={set('description')} /></div>
          <div className="col-md-4"><label htmlFor="prImage" className="form-label">Picture</label><select id="prImage" className="form-select" value={f.image} onChange={set('image')}>{IMAGE_KEYS.map((k) => <option key={k} value={k}>{IMAGES[k].emoji} {k}</option>)}</select></div>
        </div>
        <button type="submit" className="btn btn-dark mt-3">Add item</button>
      </form>
      {data.products.length ? (
        <div className="table-responsive panel p-0">
          <table className="table align-middle mb-0 dash-table">
            <thead><tr><th>Item</th><th>Section</th><th>Price (Rs.)</th><th>Available</th><th /></tr></thead>
            <tbody>{data.products.map((p) => (
              <tr key={p.id}>
                <td><span className="me-2" aria-hidden="true">{IMAGES[p.image]?.emoji || '🛍️'}</span>{p.name}</td>
                <td>{p.section}</td>
                <td><input type="number" min="1" step="1" className="form-control form-control-sm price-input" defaultValue={p.price} aria-label={`Price of ${p.name}`}
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== p.price) patch(p, { price: v }, `${p.name}: price is now ${rs(v)}`); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></td>
                <td><div className="form-check form-switch m-0"><input className="form-check-input" type="checkbox" role="switch" checked={p.available} aria-label={`${p.name} available`}
                  onChange={(e) => patch(p, { available: e.target.checked }, `${p.name} is ${e.target.checked ? 'available' : 'sold out'}`)} /></div></td>
                <td className="text-end"><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}><i className="bi bi-trash3" aria-hidden="true" /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No menu items yet" text="Add your first item above." />}
    </>
  );
}

function SettingsPanel({ store, refresh }) {
  const { toast, toastError } = useUI();
  const [f, setF] = useState({ etaMin: store.eta[0], etaMax: store.eta[1], deliveryFee: store.deliveryFee, minOrder: store.minOrder });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { await api('/partner/store', { method: 'PATCH', body: f }); toast('Store settings saved', { icon: 'bi-check2-circle', type: 'ok' }); refresh(); } catch (e2) { toastError(e2); }
  };
  return (
    <form className="panel" noValidate onSubmit={save}>
      <h2 className="panel-title">Delivery settings</h2>
      <div className="row g-3">
        <div className="col-sm-3"><label htmlFor="ssEtaMin" className="form-label">Fastest time (min)</label><input id="ssEtaMin" type="number" min="5" className="form-control" value={f.etaMin} onChange={set('etaMin')} /></div>
        <div className="col-sm-3"><label htmlFor="ssEtaMax" className="form-label">Slowest time (min)</label><input id="ssEtaMax" type="number" min="5" className="form-control" value={f.etaMax} onChange={set('etaMax')} /></div>
        <div className="col-sm-3"><label htmlFor="ssFee" className="form-label">Delivery fee (Rs.)</label><input id="ssFee" type="number" min="0" className="form-control" value={f.deliveryFee} onChange={set('deliveryFee')} /></div>
        <div className="col-sm-3"><label htmlFor="ssMin" className="form-label">Minimum order (Rs.)</label><input id="ssMin" type="number" min="0" className="form-control" value={f.minOrder} onChange={set('minOrder')} /></div>
      </div>
      <button type="submit" className="btn btn-dark mt-3">Save settings</button>
    </form>
  );
}

function Dashboard() {
  const { reload: reloadCatalog } = useCatalog();
  const { toast, toastError } = useUI();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('orders');
  const seen = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api('/partner/store');
      // tell the owner about new orders that arrived since the last refresh
      const placed = res.orders.filter((o) => o.status === 'placed').map((o) => o.id);
      if (seen.current) {
        const fresh = placed.filter((id) => !seen.current.has(id));
        if (fresh.length) toast(`${fresh.length} new order${fresh.length > 1 ? 's' : ''}!`, { icon: 'bi-bell-fill', type: 'ok', ms: 6000 });
      }
      seen.current = new Set(res.orders.map((o) => o.id));
      setData(res);
      setError('');
    } catch (err) { setError(err.message); }
  }, [toast]);
  const refresh = useCallback(async () => { await load(); reloadCatalog(); }, [load, reloadCatalog]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 15000);
  const onStatus = useStatusChange(load);

  if (!data) return error ? <EmptyState mood="sad" title="Could not load your store" text={error}><button type="button" className="btn btn-mango" onClick={load}>Try again</button></EmptyState> : <Loading text="Loading your store…" />;

  const s = data.store;
  const active = data.orders.filter(isActive);
  const past = data.orders.filter((o) => !isActive(o));
  const today = new Date().toDateString();
  const todayDone = past.filter((o) => ['delivered', 'collected'].includes(o.status) && new Date(o.createdAt).toDateString() === today);
  const toggleOpen = async (open) => {
    try { await api('/partner/store', { method: 'PATCH', body: { isOpen: open } }); toast(open ? 'Your store is open for orders' : 'Your store is closed', { icon: open ? 'bi-door-open' : 'bi-door-closed' }); refresh(); } catch (e) { toastError(e); }
  };
  const tabs = [['orders', 'Orders', active.length], ['menu', 'Menu', data.products.length], ['history', 'History'], ['settings', 'Store settings']];

  return (
    <>
      <div className="page-head">
        <div><h1 id="partnerTitle">{s.name}</h1><p className="page-sub">Store dashboard · new orders appear automatically</p></div>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch m-0"><input className="form-check-input" type="checkbox" role="switch" id="storeOpen" checked={s.isOpen} onChange={(e) => toggleOpen(e.target.checked)} /><label className="form-check-label fw-semibold" htmlFor="storeOpen">{s.isOpen ? 'Open for orders' : 'Closed'}</label></div>
          {s.status === 'active' && <Link className="btn btn-sm btn-outline-dark" to={`/store/${s.id}`}>View store page</Link>}
        </div>
      </div>
      {s.status === 'pending' && <p className="min-warn"><i className="bi bi-hourglass-split" aria-hidden="true" /><span>Your store is waiting for approval by the Mangao team. Add your menu now so you are ready when it goes live.</span></p>}
      {s.status === 'suspended' && <p className="min-warn"><i className="bi bi-exclamation-octagon" aria-hidden="true" /><span>Your store is suspended and hidden from customers. Contact support.</span></p>}
      <div className="stat-row">
        <div className="stat"><strong>{active.length}</strong><span>Active orders</span></div>
        <div className="stat"><strong>{todayDone.length}</strong><span>Completed today</span></div>
        <div className="stat"><strong>{rs(todayDone.reduce((t, o) => t + o.subtotal, 0))}</strong><span>Sales today</span></div>
      </div>
      <div className="seg-tabs" role="tablist" aria-label="Dashboard sections">
        {tabs.map(([k, l, n]) => <button key={k} type="button" role="tab" className="seg-tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}{n !== undefined && <span className="seg-count">{n}</span>}</button>)}
      </div>
      <div role="tabpanel">
        {tab === 'orders' && (active.length ? <div className="dash-grid">{active.map((o) => <DashOrderCard key={o.id} order={o} onStatus={onStatus} />)}</div>
          : <EmptyState title="No active orders" text="New orders will show up here automatically. Keep this page open." />)}
        {tab === 'history' && (past.length ? <div className="dash-grid">{past.slice(0, 50).map((o) => <DashOrderCard key={o.id} order={o} onStatus={onStatus} />)}</div>
          : <EmptyState title="No past orders yet" text="Completed and cancelled orders appear here." />)}
        {tab === 'menu' && <MenuPanel data={data} refresh={refresh} />}
        {tab === 'settings' && <SettingsPanel store={s} refresh={refresh} />}
      </div>
    </>
  );
}

export default function Partner() {
  useTitle('My store — Mangao');
  const { user } = useAuth();
  return (
    <section className="container-xl page-pad" aria-labelledby="partnerTitle">
      {!user ? (
        <div className="auth-card wide">
          <h1 id="partnerTitle" className="h3">Sell on Mangao</h1>
          <p className="page-sub">Reach customers across Lahore. Create an account or log in, then fill in a short form about your restaurant or shop.</p>
          <Link to="/login" state={{ from: '/partner', reason: 'Log in or create an account to sell on Mangao.' }} className="btn btn-mango btn-lg">Log in or sign up</Link>
        </div>
      ) : user.role === 'admin' ? (
        <EmptyState title="You are an admin" text="Admins manage every store from the admin panel."><Link className="btn btn-mango" to="/admin">Open admin panel</Link></EmptyState>
      ) : user.role === 'partner' ? <Dashboard /> : <ApplyForm />}
    </section>
  );
}
