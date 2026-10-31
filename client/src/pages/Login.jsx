import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EMAIL_RE, PHONE_RE, normPhone } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import Mangi from '../components/Mangi.jsx';
import useTitle from '../lib/useTitle.js';

const homeFor = (u) => (u.role === 'admin' ? '/admin' : u.role === 'partner' ? '/partner' : '/');

export default function Login() {
  useTitle('Log in — Mangao');
  const { login, register } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [tab, setTab] = useState('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [errs, setErrs] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  const submit = async (e) => {
    e.preventDefault();
    const x = {};
    if (tab === 'register' && f.name.trim().length < 2) x.name = 'Enter your name (at least 2 characters).';
    if (!EMAIL_RE.test(f.email.trim())) x.email = 'Enter an email like name@example.com.';
    if (tab === 'register' && f.phone.trim() && !PHONE_RE.test(normPhone(f.phone.trim()))) x.phone = 'Enter a Pakistani mobile number like 0300 1234567.';
    if (!f.password) x.password = 'Enter your password.';
    else if (tab === 'register' && f.password.length < 8) x.password = 'Use at least 8 characters.';
    setErrs(x);
    if (Object.keys(x).length) return;
    setBusy(true); setServerErr('');
    try {
      const user = tab === 'login'
        ? await login(f.email.trim(), f.password)
        : await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password });
      toast(tab === 'login' ? `Welcome back, ${user.name.split(' ')[0]}` : `Welcome to Mangao, ${user.name.split(' ')[0]}!`, { icon: 'bi-emoji-smile', type: 'ok' });
      navigate(from && from !== '/login' ? from : homeFor(user), { replace: true });
    } catch (err) { setServerErr(err.message); } finally { setBusy(false); }
  };

  const input = (k, label, props = {}, extra = null) => (
    <div className="mb-3">
      <label htmlFor={`au-${k}`} className="form-label">{label}</label>
      <input id={`au-${k}`} className={`form-control ${errs[k] ? 'is-invalid' : ''}`} value={f[k]} onChange={set(k)} aria-invalid={Boolean(errs[k])} {...props} />
      {extra}
      <div className="invalid-feedback">{errs[k]}</div>
    </div>
  );

  return (
    <section className="container-xl page-pad auth-wrap" aria-labelledby="authTitle">
      <div className="auth-card">
        <div className="auth-mangi" aria-hidden="true"><Mangi mood="wave" /></div>
        <h1 id="authTitle" className="h3 text-center">Welcome to Mangao</h1>
        <p className="page-sub text-center mb-3">{location.state?.reason || 'Log in or create an account to order.'}</p>
        <div className="seg-tabs w-100" role="tablist" aria-label="Log in or sign up">
          <button type="button" role="tab" className="seg-tab flex-fill justify-content-center" aria-selected={tab === 'login'} onClick={() => { setTab('login'); setErrs({}); setServerErr(''); }}>Log in</button>
          <button type="button" role="tab" className="seg-tab flex-fill justify-content-center" aria-selected={tab === 'register'} onClick={() => { setTab('register'); setErrs({}); setServerErr(''); }}>Create account</button>
        </div>
        <form role="tabpanel" noValidate onSubmit={submit}>
          {serverErr && <div className="form-error-summary" role="alert">{serverErr}</div>}
          {tab === 'register' && input('name', 'Full name', { autoComplete: 'name', maxLength: 60 })}
          {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {tab === 'register' && input('phone', <>Mobile number <span className="opt">optional</span></>, { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '03XX XXXXXXX' })}
          {input('password', 'Password', { type: 'password', autoComplete: tab === 'login' ? 'current-password' : 'new-password' },
            tab === 'register' ? <div className="form-text">At least 8 characters.</div> : null)}
          <button type="submit" className="btn btn-mango btn-lg w-100" disabled={busy}>
            {busy ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Please wait…</> : tab === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
        <p className="tiny-note text-center mt-3">Own a restaurant or shop? Create an account, then go to <Link to="/partner">Partner with us</Link>.</p>
      </div>
    </section>
  );
}
