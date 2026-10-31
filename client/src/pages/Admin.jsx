import { useCallback, useEffect, useRef, useState } from 'react';
import { isActive } from '../lib/data.js';
import { rs, fmtDate } from '../lib/format.js';
import { api } from '../lib/api.js';
import usePolling from '../lib/usePolling.js';
import useStatusChange from '../lib/useStatusChange.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { EmptyState, Loading, VendorLogo } from '../components/Common.jsx';
import DashOrderCard from '../components/DashOrderCard.jsx';
import useTitle from '../lib/useTitle.js';

function OwnerForm({ store, refresh }) {
  const { toast, toastError } = useUI();
  const [email, setEmail] = useState('');
  return (
    <form className="d-flex gap-1 owner-form" onSubmit={async (e) => {
      e.preventDefault();
      try { await api(`/admin/stores/${encodeURIComponent(store.id)}/owner`, { method: 'POST', body: { email } }); toast(`${email} now manages ${store.name}`, { type: 'ok' }); refresh(); } catch (err) { toastError(err); }
    }}>
      <input type="email" className="form-control form-control-sm" placeholder="owner@email.com" aria-label={`Owner email for ${store.name}`} required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn btn-sm btn-outline-dark" type="submit">Assign</button>
    </form>
  );
}

function TicketCard({ t, refresh }) {
  const { toast, toastError } = useUI();
  const [reply, setReply] = useState(t.reply || '');
  return (
    <article className="order-card">
      <div className="order-top">
        <div><p className="order-title">{t.id} · {t.type}</p><span className="order-meta">{t.userName} ({t.userEmail}) · {fmtDate(t.createdAt)}{t.order && ` · order ${t.order}`}</span></div>
        <span className={`status-tag ${t.status === 'resolved' ? 'done' : ''}`}>{t.status === 'resolved' ? 'Resolved' : 'Open'}</span>
      </div>
      <p className="mt-2 mb-2">{t.description}</p>
      <form className="ticket-form d-flex gap-2 flex-wrap" onSubmit={async (e) => {
        e.preventDefault();
        if (!reply.trim()) return toastError(new Error('Write a reply first.'));
        try { await api(`/admin/tickets/${encodeURIComponent(t.id)}`, { method: 'POST', body: { reply: reply.trim() } }); toast(`${t.id} resolved`, { type: 'ok' }); refresh(); } catch (err) { toastError(err); }
      }}>
        <label className="visually-hidden" htmlFor={`tr-${t.id}`}>Reply</label>
        <input id={`tr-${t.id}`} className="form-control flex-grow-1" style={{ minWidth: 220 }} maxLength={1000} placeholder="Reply to the customer" value={reply} onChange={(e) => setReply(e.target.value)} />
        <button type="submit" className="btn btn-dark">{t.status === 'resolved' ? 'Update reply' : 'Reply and resolve'}</button>
      </form>
    </article>
  );
}

function Messages({ conversations }) {
  const { toastError } = useUI();
  const [sel, setSel] = useState(null);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const log = useRef(null);
  const load = useCallback(async () => {
    if (!sel) return;
    try { setMessages((await api(`/admin/messages/${sel}`)).messages); } catch (err) { toastError(err); }
  }, [sel, toastError]);
  useEffect(() => { setMessages(null); load(); }, [load]);
  usePolling(load, 8000, Boolean(sel));
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages]);
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { setMessages((await api(`/admin/messages/${sel}`, { method: 'POST', body: { body: text.trim() } })).messages); setText(''); } catch (err) { toastError(err); }
  };
  return (
    <div className="admin-chat">
      <div className="panel p-0 convo-list">
        {conversations.length ? conversations.map((c) => (
          <button key={c.userId} type="button" className={`convo ${sel === c.userId ? 'active' : ''}`} onClick={() => setSel(c.userId)}>
            <strong>{c.name}</strong><small>{c.email}</small>
            <small>{fmtDate(c.lastAt)}{c.lastFrom === 'user' && <> · <span className="text-danger fw-semibold">waiting for reply</span></>}</small>
          </button>
        )) : <p className="p-3 mb-0 text-body-secondary">No conversations yet.</p>}
      </div>
      <div className="panel chat-panel admin-thread">
        {sel ? (
          <>
            <div className="chat-log" ref={log}>
              {!messages ? <Loading /> : messages.map((m) => (
                <div key={m.id} className={`msg ${m.from === 'support' ? 'user' : 'bot'}`}>{m.body}<span className="msg-time">{m.from === 'support' ? 'Support' : 'Customer'} · {fmtDate(m.createdAt)}</span></div>
              ))}
            </div>
            <form className="chat-input" onSubmit={send}>
              <label htmlFor="adminReply" className="visually-hidden">Reply</label>
              <input id="adminReply" className="form-control" maxLength={1000} placeholder="Write a reply" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="btn btn-mango" aria-label="Send reply"><i className="bi bi-send-fill" aria-hidden="true" /></button>
            </form>
          </>
        ) : <EmptyState title="Choose a conversation" text="Pick a customer on the left to read and reply." />}
      </div>
    </div>
  );
}

export default function Admin() {
  useTitle('Admin — Mangao');
  const { reload: reloadCatalog } = useCatalog();
  const { toast, toastError } = useUI();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('orders');
  const load = useCallback(async () => {
    try { setD(await api('/admin/overview')); setError(''); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 20000);
  const onStatus = useStatusChange(load);

  const storeStatus = async (s, status) => {
    try { await api(`/admin/stores/${encodeURIComponent(s.id)}`, { method: 'POST', body: { status } }); toast(`${s.name} is now ${status}`, { type: 'ok' }); load(); reloadCatalog(); } catch (err) { toastError(err); }
  };

  if (!d) {
    return (
      <section className="container-xl page-pad">
        {error ? <EmptyState mood="sad" title="Could not load the admin panel" text={error}><button type="button" className="btn btn-mango" onClick={load}>Try again</button></EmptyState> : <Loading text="Loading admin panel…" />}
      </section>
    );
  }
  const st = d.stats;
  const activeOrders = d.orders.filter(isActive);
  const tabs = [['orders', 'Active orders', activeOrders.length], ['all', 'All orders'], ['stores', 'Stores', st.pendingStores], ['tickets', 'Reports', st.openTickets], ['messages', 'Messages'], ['users', 'Users']];
  const orderList = tab === 'orders' ? activeOrders : d.orders;

  return (
    <section className="container-xl page-pad" aria-labelledby="adminTitle">
      <div className="page-head">
        <div><h1 id="adminTitle">Admin panel</h1><p className="page-sub">Updates automatically every 20 seconds</p></div>
        <button type="button" className="btn btn-outline-dark" onClick={load}><i className="bi bi-arrow-clockwise" aria-hidden="true" />Refresh</button>
      </div>
      <div className="stat-row admin-stats">
        <div className="stat"><strong>{st.activeOrders}</strong><span>Active orders</span></div>
        <div className="stat"><strong>{st.orders}</strong><span>All orders</span></div>
        <div className="stat"><strong>{rs(st.revenue)}</strong><span>Completed sales</span></div>
        <div className="stat"><strong>{st.users}</strong><span>Accounts</span></div>
        <div className="stat"><strong>{st.openTickets}</strong><span>Open reports</span></div>
        <div className="stat"><strong>{st.pendingStores}</strong><span>Stores to approve</span></div>
      </div>
      <div className="seg-tabs flex-wrap" role="tablist" aria-label="Admin sections">
        {tabs.map(([k, l, n]) => <button key={k} type="button" role="tab" className="seg-tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}{n !== undefined && <span className="seg-count">{n}</span>}</button>)}
      </div>

      <div role="tabpanel">
        {(tab === 'orders' || tab === 'all') && (orderList.length
          ? <div className="dash-grid">{orderList.map((o) => (
            <DashOrderCard key={o.id} order={o} showStore onStatus={onStatus}
              extra={isActive(o) ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onStatus(o, 'cancelled')}>Cancel</button> : null} />
          ))}</div>
          : <EmptyState title="No orders here" text="New orders from every store appear here." />)}

        {tab === 'stores' && (
          <div className="table-responsive panel p-0">
            <table className="table align-middle mb-0 dash-table">
              <thead><tr><th>Store</th><th>Type</th><th>Area</th><th>Owner</th><th>Status</th><th /></tr></thead>
              <tbody>{d.stores.map((s) => (
                <tr key={s.id}>
                  <td><VendorLogo vendor={s} /> <strong className="ms-2">{s.name}</strong>{s.isDemo && <span className="badge text-bg-light ms-1">Demo</span>}</td>
                  <td>{s.kind}</td><td>{s.area}</td>
                  <td>{s.ownerEmail || <OwnerForm store={s} refresh={load} />}</td>
                  <td><span className={`status-tag ${s.status === 'active' ? 'done' : s.status === 'suspended' ? 'stopped' : ''}`}>{s.status}</span></td>
                  <td className="text-end text-nowrap">
                    {s.status !== 'active'
                      ? <button type="button" className="btn btn-sm btn-dark" onClick={() => storeStatus(s, 'active')}>{s.status === 'pending' ? 'Approve' : 'Reactivate'}</button>
                      : <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => storeStatus(s, 'suspended')}>Suspend</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'tickets' && (d.tickets.length ? d.tickets.map((t) => <TicketCard key={t.id} t={t} refresh={load} />)
          : <EmptyState title="No reports" text="Problem reports from customers appear here." />)}

        {tab === 'messages' && <Messages conversations={d.conversations} />}

        {tab === 'users' && (
          <div className="table-responsive panel p-0">
            <table className="table align-middle mb-0 dash-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>{d.users.map((u) => (
                <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.role}{u.storeId && ` (${u.storeId})`}</td><td>{fmtDate(u.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
