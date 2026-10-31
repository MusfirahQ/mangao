import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isActive } from '../lib/data.js';
import { useOrders } from '../context/OrdersContext.jsx';
import { EmptyState } from '../components/Common.jsx';
import { OrderCard } from '../components/OrderBits.jsx';
import useTitle from '../lib/useTitle.js';

export default function Orders() {
  useTitle('Orders — Mangao');
  const { orders } = useOrders();
  const [tab, setTab] = useState('active');
  const active = orders.filter(isActive);
  const past = orders.filter((o) => !isActive(o));
  const list = tab === 'active' ? active : past;
  return (
    <section className="container-xl page-pad narrow" aria-labelledby="ordersTitle">
      <h1 id="ordersTitle">Your orders</h1>
      <div className="seg-tabs" role="tablist" aria-label="Order lists">
        <button type="button" role="tab" className="seg-tab" id="tabActive" aria-controls="ordersPanel" aria-selected={tab === 'active'} onClick={() => setTab('active')}>Active <span className="seg-count">{active.length}</span></button>
        <button type="button" role="tab" className="seg-tab" id="tabPast" aria-controls="ordersPanel" aria-selected={tab === 'past'} onClick={() => setTab('past')}>History <span className="seg-count">{past.length}</span></button>
      </div>
      <div id="ordersPanel" role="tabpanel" aria-labelledby={tab === 'active' ? 'tabActive' : 'tabPast'}>
        {list.length ? list.map((o) => <OrderCard key={o.id} order={o} />) : tab === 'active'
          ? <EmptyState title="No orders on the way" text="When you place an order, you can follow each step of it here."><Link to="/browse" className="btn btn-mango">Start an order</Link></EmptyState>
          : <EmptyState title="No past orders yet" text="Orders appear here once they are delivered, collected or cancelled."><Link to="/browse" className="btn btn-mango">Browse products</Link></EmptyState>}
      </div>
    </section>
  );
}
