import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AREAS } from '../lib/data.js';
import { rs, PHONE_RE, normPhone } from '../lib/format.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { addrIcon } from '../components/Overlays.jsx';
import useTitle from '../lib/useTitle.js';

function AddressPanel() {
  const { addresses, reloadAddresses } = useAuth();
  const { toast, toastError, confirm } = useUI();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ label: 'Home', area: '', line: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const x = {};
    if (!f.area) x.area = 'Choose an area.';
    if (f.line.trim().length < 6) x.line = 'Enter a street address with house number and street.';
    setErr(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api('/me/addresses', { method: 'POST', body: f });
      await reloadAddresses();
      setF({ label: 'Home', area: '', line: '' });
      setOpen(false);
      toast('Address saved', { icon: 'bi-geo-alt-fill' });
    } catch (e2) { toastError(e2); } finally { setBusy(false); }
  };
  const makeDefault = async (a) => {
    try { await api(`/me/addresses/${a.id}/default`, { method: 'POST' }); await reloadAddresses(); toast(`${a.label} is now your default address`); } catch (e) { toastError(e); }
  };
  const remove = async (a) => {
    if (!(await confirm({ title: `Delete ${a.label} address?`, text: `${a.line}, ${a.area}`, confirmLabel: 'Delete' }))) return;
    try { await api(`/me/addresses/${a.id}`, { method: 'DELETE' }); await reloadAddresses(); toast('Address deleted', { icon: 'bi-trash3' }); } catch (e) { toastError(e); }
  };

  return (
    <section className="panel" aria-labelledby="addrTitle">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="panel-title mb-0" id="addrTitle">Saved addresses</h2>
        <button type="button" className="btn btn-sm btn-outline-dark" aria-expanded={open} aria-controls="addressForm" onClick={() => setOpen(!open)}><i className="bi bi-plus-lg" aria-hidden="true" /> Add address</button>
      </div>
      {open && (
        <form id="addressForm" className="address-form" noValidate onSubmit={save}>
          <div className="row g-2">
            <div className="col-sm-4">
              <label htmlFor="adLabel" className="form-label">Label</label>
              <select id="adLabel" className="form-select" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })}>{['Home', 'Work', 'University', 'Other'].map((l) => <option key={l}>{l}</option>)}</select>
            </div>
            <div className="col-sm-8">
              <label htmlFor="adArea" className="form-label">Area <span className="req">required</span></label>
              <select id="adArea" className={`form-select ${err.area ? 'is-invalid' : ''}`} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>
                <option value="">Choose an area</option>{AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
              <div className="invalid-feedback">{err.area}</div>
            </div>
            <div className="col-12">
              <label htmlFor="adLine" className="form-label">Street address <span className="req">required</span></label>
              <input id="adLine" className={`form-control ${err.line ? 'is-invalid' : ''}`} maxLength={120} placeholder="House no., street, block" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} />
              <div className="invalid-feedback">{err.line}</div>
            </div>
          </div>
          <div className="mt-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" className="btn btn-link btn-sm text-body" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="address-list">
        {addresses.length ? addresses.map((a) => (
          <li key={a.id}>
            <i className={`bi ${addrIcon(a.label)}`} aria-hidden="true" />
            <div className="addr-text"><div className="addr-label">{a.label}{a.isDefault && <span className="default-tag">Default</span>}</div><div className="addr-line">{a.line}, {a.area}, Lahore</div></div>
            <div className="d-flex gap-1 flex-wrap justify-content-end">
              {!a.isDefault && <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => makeDefault(a)}>Make default</button>}
              <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Delete ${a.label} address`} onClick={() => remove(a)}><i className="bi bi-trash3" aria-hidden="true" /></button>
            </div>
          </li>
        )) : <li className="text-body-secondary">No saved addresses. Add one to check out faster.</li>}
      </ul>
    </section>
  );
}

export default function Account() {
  useTitle('Account — Mangao');
  const { user, setUser, favourites, logout } = useAuth();
  const { orders } = useOrders();
  const { toast, toastError } = useUI();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [err, setErr] = useState({});
  const [saved, setSaved] = useState('');
  const savedTotal = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.discount || 0 : 0), 0);

  const saveProfile = async (e) => {
    e.preventDefault();
    const x = {};
    if (name.trim().length < 2) x.name = 'Your name should be at least 2 characters.';
    if (phone.trim() && !PHONE_RE.test(normPhone(phone.trim()))) x.phone = 'Enter a Pakistani mobile number like 0300 1234567.';
    setErr(x);
    if (Object.keys(x).length) return;
    try {
      const res = await api('/me', { method: 'PATCH', body: { name: name.trim(), phone: phone.trim() } });
      setUser(res.user);
      setSaved('Saved');
      setTimeout(() => setSaved(''), 2500);
    } catch (e2) { toastError(e2); }
  };

  const link = (to, icon, label) => <Link to={to}><i className={`bi ${icon}`} aria-hidden="true" />{label}<i className="bi bi-chevron-right" aria-hidden="true" /></Link>;

  return (
    <section className="container-xl page-pad narrow" aria-labelledby="accountTitle">
      <div className="profile-card">
        <span className="avatar avatar-xl">{user.name.trim()[0].toUpperCase()}</span>
        <div>
          <h1 id="accountTitle" className="mb-0">{user.name}</h1>
          <p className="page-sub mb-0">{[user.email, user.phone].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="stat-row">
        <div className="stat"><strong>{orders.length}</strong><span>Orders</span></div>
        <div className="stat"><strong>{favourites.products.length + favourites.vendors.length}</strong><span>Favourites</span></div>
        <div className="stat"><strong>{rs(savedTotal)}</strong><span>Saved with codes</span></div>
      </div>

      <div className="account-links">
        {link('/orders', 'bi-receipt', 'Orders')}
        {link('/favourites', 'bi-heart', 'Favourites')}
        {link('/settings', 'bi-gear', 'Settings')}
        {link('/help', 'bi-life-preserver', 'Help & support')}
        {user.role === 'admin' && link('/admin', 'bi-speedometer2', 'Admin panel')}
        {user.role === 'partner' && link('/partner', 'bi-shop', 'My store dashboard')}
        {user.role === 'customer' && link('/partner', 'bi-shop', 'Sell on Mangao')}
        <button type="button" className="account-logout" onClick={async () => { await logout(); navigate('/'); toast('You have logged out', { icon: 'bi-box-arrow-right' }); }}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" />Log out<i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <form className="panel" noValidate aria-labelledby="profileFormTitle" onSubmit={saveProfile}>
        <h2 className="panel-title" id="profileFormTitle">Personal details</h2>
        <div className="row g-3">
          <div className="col-12">
            <label htmlFor="pfName" className="form-label">Full name <span className="req">required</span></label>
            <input id="pfName" className={`form-control ${err.name ? 'is-invalid' : ''}`} maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="invalid-feedback">{err.name}</div>
          </div>
          <div className="col-sm-6">
            <label htmlFor="pfPhone" className="form-label">Mobile number</label>
            <input id="pfPhone" className={`form-control ${err.phone ? 'is-invalid' : ''}`} type="tel" placeholder="03XX XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="invalid-feedback">{err.phone}</div>
          </div>
          <div className="col-sm-6">
            <label htmlFor="pfEmail" className="form-label">Email</label>
            <input id="pfEmail" className="form-control" type="email" readOnly value={user.email} aria-describedby="pfEmailHelp" />
            <div className="form-text" id="pfEmailHelp">Your login email can't be changed.</div>
          </div>
        </div>
        <button type="submit" className="btn btn-dark mt-3">Save details</button>
        <span className="save-status" aria-live="polite">{saved}</span>
      </form>

      <AddressPanel />
    </section>
  );
}
