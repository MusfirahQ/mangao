import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useTitle from '../lib/useTitle.js';

function Row({ id, name, desc, children }) {
  return (
    <div className="setting-row">
      <div><label htmlFor={id} className="setting-name">{name}</label><p className="setting-desc">{desc}</p></div>
      {children}
    </div>
  );
}
const Switch = ({ id, checked, onChange }) => (
  <div className="form-check form-switch"><input className="form-check-input" type="checkbox" role="switch" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} /></div>
);

export default function Settings() {
  useTitle('Settings — Mangao');
  const { settings, update, reset } = useSettings();
  const { user, clearLocal } = useAuth();
  const cart = useCart();
  const { toast, toastError, confirm } = useUI();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwErr, setPwErr] = useState({});
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');

  const changed = (label) => toast(`${label} updated`, { icon: 'bi-gear' });

  const changePassword = async (e) => {
    e.preventDefault();
    const x = {};
    if (!pw.current) x.current = 'Enter your current password.';
    if (pw.next.length < 8) x.next = 'New password must be at least 8 characters.';
    setPwErr(x);
    if (Object.keys(x).length) return;
    try {
      await api('/me/password', { method: 'POST', body: pw });
      setPw({ current: '', next: '' });
      toast('Password changed', { icon: 'bi-shield-lock', type: 'ok' });
    } catch (err) { setPwErr({ current: err.message }); }
  };

  const exportData = async () => {
    try {
      const data = await api('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mangao-my-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Your data was downloaded', { icon: 'bi-download' });
    } catch (err) { toastError(err); }
  };

  const clearDevice = async () => {
    if (!(await confirm({ title: 'Clear this device?', text: 'This empties your basket and resets display settings on this device. Your account and orders are not affected.', confirmLabel: 'Clear' }))) return;
    cart.clear();
    reset();
    toast('This device was cleared', { icon: 'bi-arrow-counterclockwise' });
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!delPw) { setDelErr('Enter your password to confirm.'); return; }
    if (!(await confirm({ title: 'Delete your account?', text: 'This permanently deletes your account, addresses, favourites, orders and messages. This cannot be undone.', confirmLabel: 'Delete account' }))) return;
    try {
      await api('/me', { method: 'DELETE', body: { password: delPw } });
      clearLocal();
      cart.clear();
      navigate('/');
      toast('Your account was deleted', { icon: 'bi-trash3' });
    } catch (err) { setDelErr(err.message); }
  };

  return (
    <section className="container-xl page-pad narrow" aria-labelledby="settingsTitle">
      <Link to={user ? '/account' : '/'} className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> {user ? 'Account' : 'Home'}</Link>
      <h1 id="settingsTitle" className="mt-2">Settings</h1>

      <section className="panel" aria-labelledby="setAppearance">
        <h2 className="panel-title" id="setAppearance">Appearance</h2>
        <Row id="setTheme" name="Theme" desc="Choose how Mangao looks on this device.">
          <select id="setTheme" className="form-select w-auto" value={settings.theme} onChange={(e) => { update('theme', e.target.value); changed('Theme'); }}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">Match device</option>
          </select>
        </Row>
        <Row id="setPhotos" name="Show product photos" desc="Turn off to use light illustrations and save mobile data.">
          <Switch id="setPhotos" checked={settings.photos} onChange={(v) => { update('photos', v); changed('Photos'); }} />
        </Row>
        <Row id="setMotion" name="Reduce motion" desc="Turns off animations and smooth scrolling.">
          <Switch id="setMotion" checked={settings.reduceMotion} onChange={(v) => { update('reduceMotion', v); changed('Motion'); }} />
        </Row>
      </section>

      <section className="panel" aria-labelledby="setOrdering">
        <h2 className="panel-title" id="setOrdering">Ordering</h2>
        <Row id="setDefaultMode" name="Default order mode" desc="Used each time you open Mangao.">
          <select id="setDefaultMode" className="form-select w-auto" value={settings.defaultMode} onChange={(e) => { update('defaultMode', e.target.value); changed('Default mode'); }}>
            <option value="delivery">Delivery</option><option value="pickup">Pickup</option>
          </select>
        </Row>
        <Row id="setTip" name="Default rider tip" desc="Pre-selected at checkout. You can change it each time.">
          <select id="setTip" className="form-select w-auto" value={settings.defaultTip} onChange={(e) => { update('defaultTip', Number(e.target.value)); cart.setTip(null); changed('Default tip'); }}>
            <option value="0">No tip</option><option value="50">Rs. 50</option><option value="100">Rs. 100</option><option value="150">Rs. 150</option>
          </select>
        </Row>
      </section>

      <section className="panel" aria-labelledby="setNotifs">
        <h2 className="panel-title" id="setNotifs">Notifications</h2>
        <Row id="setNotifOrder" name="Order progress alerts" desc="Show a message in the app when one of your orders moves to its next step.">
          <Switch id="setNotifOrder" checked={settings.notifOrder} onChange={(v) => { update('notifOrder', v); changed('Order alerts'); }} />
        </Row>
        <Row id="setNotifPromo" name="Offers and deals" desc="Show offer banners in the app.">
          <Switch id="setNotifPromo" checked={settings.notifPromo} onChange={(v) => { update('notifPromo', v); changed('Offers'); }} />
        </Row>
      </section>

      {user && (
        <section className="panel" aria-labelledby="setSecurity">
          <h2 className="panel-title" id="setSecurity">Password</h2>
          <form noValidate onSubmit={changePassword}>
            <div className="row g-2">
              <div className="col-sm-6">
                <label htmlFor="pwCurrent" className="form-label">Current password</label>
                <input id="pwCurrent" type="password" className={`form-control ${pwErr.current ? 'is-invalid' : ''}`} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                <div className="invalid-feedback">{pwErr.current}</div>
              </div>
              <div className="col-sm-6">
                <label htmlFor="pwNext" className="form-label">New password</label>
                <input id="pwNext" type="password" className={`form-control ${pwErr.next ? 'is-invalid' : ''}`} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <div className="invalid-feedback">{pwErr.next}</div>
              </div>
            </div>
            <button type="submit" className="btn btn-dark mt-3">Change password</button>
          </form>
        </section>
      )}

      <section className="panel" aria-labelledby="setData">
        <h2 className="panel-title" id="setData">Your data</h2>
        <p className="setting-desc">Your account, addresses, favourites and orders are stored in Mangao's MongoDB database. Your basket and display settings are kept on this device.</p>
        <div className="d-flex flex-wrap gap-2 mt-2">
          {user && <button type="button" className="btn btn-outline-dark" onClick={exportData}><i className="bi bi-download me-1" aria-hidden="true" />Download my data</button>}
          <button type="button" className="btn btn-outline-dark" onClick={clearDevice}><i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />Clear this device</button>
        </div>
        {user && user.role !== 'admin' && (
          <form className="mt-4" noValidate onSubmit={deleteAccount}>
            <h3 className="h6 text-danger">Delete my account</h3>
            <p className="setting-desc">This permanently deletes your account, addresses, favourites, orders and messages.</p>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              <div>
                <label htmlFor="delPassword" className="visually-hidden">Password</label>
                <input id="delPassword" type="password" className={`form-control ${delErr ? 'is-invalid' : ''}`} placeholder="Your password" autoComplete="current-password" value={delPw} onChange={(e) => { setDelPw(e.target.value); setDelErr(''); }} />
                <div className="invalid-feedback">{delErr}</div>
              </div>
              <button type="submit" className="btn btn-outline-danger">Delete account</button>
            </div>
          </form>
        )}
      </section>
      <p className="tiny-note text-center">Mangao v3.0 · MERN</p>
    </section>
  );
}
