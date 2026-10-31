import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FAQ, SUPPORT_TYPES } from '../lib/data.js';
import { fmtDate } from '../lib/format.js';
import { api } from '../lib/api.js';
import usePolling from '../lib/usePolling.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import Mangi from '../components/Mangi.jsx';
import useTitle from '../lib/useTitle.js';

const STARTERS = ['Where is my order?', 'I want to change my order', 'An item is missing', 'Promo code question'];

function ReportForm({ tickets, setTickets }) {
  const [params] = useSearchParams();
  const { orders } = useOrders();
  const { toast } = useUI();
  const [f, setF] = useState({ type: '', orderId: params.get('order') || '', description: '' });
  const [errs, setErrs] = useState({});
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const caseRef = useRef(null);
  useEffect(() => { if (last) caseRef.current?.focus(); }, [last]);

  const submit = async (e) => {
    e.preventDefault();
    const x = {};
    if (!f.type) x.type = 'Choose what the issue is about.';
    const d = f.description.trim();
    if (!d) x.description = 'Describe the problem so it can be looked into.';
    else if (d.length < 15) x.description = `Add a little more detail — at least 15 characters (you have ${d.length}).`;
    setErrs(x);
    if (Object.keys(x).length) return;
    setBusy(true); setServerErr('');
    try {
      const res = await api('/support/tickets', { method: 'POST', body: { ...f, description: d } });
      setTickets([res.ticket, ...tickets]);
      setLast(res.ticket);
      setF({ type: '', orderId: '', description: '' });
      toast(`Report ${res.ticket.id} sent`, { icon: 'bi-clipboard-check', type: 'ok' });
    } catch (err) { setServerErr(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <form noValidate onSubmit={submit}>
        {(Object.keys(errs).length > 0 || serverErr) && (
          <div className="form-error-summary" role="alert">
            <strong>To submit, please fix:</strong>
            <ul>{[...Object.values(errs), serverErr].filter(Boolean).map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="spType" className="form-label">What's it about? <span className="req">required</span></label>
          <select id="spType" className={`form-select ${errs.type ? 'is-invalid' : ''}`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="">Choose an issue type</option>{SUPPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="invalid-feedback">{errs.type}</div>
        </div>
        <div className="mb-3">
          <label htmlFor="spOrder" className="form-label">Related order <span className="opt">optional</span></label>
          <select id="spOrder" className="form-select" value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value })}>
            <option value="">Not about a specific order</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.storeName} · {fmtDate(o.createdAt)}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="spDesc" className="form-label">Describe the problem <span className="req">required</span></label>
          <textarea id="spDesc" className={`form-control ${errs.description ? 'is-invalid' : ''}`} rows={4} maxLength={1000} placeholder="Tell us what happened and what you expected" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <div className="d-flex justify-content-between"><div className="invalid-feedback d-block">{errs.description}</div><div className="form-text ms-auto flex-shrink-0 ps-2">{f.description.length} / 1000</div></div>
        </div>
        <button type="submit" className="btn btn-dark" disabled={busy}>{busy ? 'Sending…' : 'Submit report'}</button>
      </form>
      <div aria-live="polite">
        {last && <div className="case-card" tabIndex={-1} ref={caseRef}><strong>Report received — case {last.id}</strong><br />The Mangao team will look into it. You'll see our reply below, and you can also message us in the chat.</div>}
      </div>
      {tickets.length > 0 && (
        <>
          <h3 className="h6 mt-4 mb-0">Your reports</h3>
          <ul className="case-list">
            {tickets.slice(0, 10).map((c) => (
              <li key={c.id}>
                <span><strong>{c.id}</strong> · {c.type}{c.order && ` · ${c.order}`}{c.reply && <><br /><span className="text-body-secondary">Reply: {c.reply}</span></>}</span>
                <span className="text-nowrap"><span className={`status-tag ${c.status === 'resolved' ? 'done' : ''}`}>{c.status === 'resolved' ? 'Resolved' : 'Open'}</span></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Chat({ messages, setMessages }) {
  const { user } = useAuth();
  const { toastError } = useUI();
  const [text, setText] = useState('');
  const log = useRef(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages]);
  const send = async (t) => {
    const clean = t.trim().slice(0, 1000);
    if (!clean) return;
    try {
      const res = await api('/support/messages', { method: 'POST', body: { body: clean } });
      setMessages(res.messages);
      setText('');
    } catch (err) { toastError(err); }
  };
  return (
    <section className="panel chat-panel" aria-labelledby="chatTitle">
      <div className="chat-head">
        <span className="chat-avatar" aria-hidden="true"><Mangi /></span>
        <div><h2 className="panel-title mb-0" id="chatTitle">Message support</h2><small className="text-body-secondary">The Mangao team replies here</small></div>
      </div>
      <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Chat messages">
        {!user ? <div className="msg bot">Hi! <Link to="/login" state={{ from: '/help' }}>Log in</Link> to message the Mangao team about your orders.</div> : (
          <>
            <div className="msg bot">Hi! Send us a message and the Mangao team will reply here. Common answers are in the questions on this page.</div>
            {messages.map((m) => <div key={m.id} className={`msg ${m.from === 'user' ? 'user' : 'bot'}`}>{m.body}<span className="msg-time">{fmtDate(m.createdAt)}</span></div>)}
          </>
        )}
      </div>
      {user && !messages.length && (
        <div className="chat-quick" aria-label="Suggested questions">{STARTERS.map((t) => <button key={t} type="button" onClick={() => send(t)}>{t}</button>)}</div>
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="chatInput" className="visually-hidden">Type a message</label>
        <input id="chatInput" className="form-control" maxLength={1000} placeholder="Type a message" autoComplete="off" disabled={!user} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-mango" aria-label="Send message" disabled={!user}><i className="bi bi-send-fill" aria-hidden="true" /></button>
      </form>
    </section>
  );
}

export default function Help() {
  useTitle('Help — Mangao');
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [t, m] = await Promise.all([api('/support/tickets'), api('/support/messages')]);
      setTickets(t.tickets); setMessages(m.messages);
    } catch { /* keep last */ }
  }, [user]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 8000, Boolean(user)); // see replies from the Mangao team

  return (
    <section className="container-xl page-pad" aria-labelledby="helpTitle">
      <div className="help-head">
        <div className="help-mangi" aria-hidden="true"><Mangi mood="help" /></div>
        <div>
          <h1 id="helpTitle">How can we help?</h1>
          <p className="page-sub">Report a problem with an order, or message the Mangao team. We reply in this chat.</p>
        </div>
      </div>
      <div className="help-grid">
        <div>
          <section className="panel" aria-labelledby="reportTitle">
            <h2 className="panel-title" id="reportTitle">Report an issue</h2>
            {user ? <ReportForm tickets={tickets} setTickets={setTickets} /> : (
              <><p className="text-body-secondary">Log in to report a problem with an order.</p><Link className="btn btn-mango" to="/login" state={{ from: '/help' }}>Log in</Link></>
            )}
          </section>
          <section className="panel" aria-labelledby="faqTitle">
            <h2 className="panel-title" id="faqTitle">Common questions</h2>
            {FAQ.map(([q, a]) => <details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </section>
        </div>
        <Chat messages={messages} setMessages={setMessages} />
      </div>
    </section>
  );
}
