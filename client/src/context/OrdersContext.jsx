import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { STATUS_LABEL, isActive } from '../lib/data.js';
import usePolling from '../lib/usePolling.js';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { useUI } from './UIContext.jsx';

// The logged-in customer's orders. Refreshed every 20 s while one is active, with a message when a status changes.
const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useUI();
  const [orders, setOrders] = useState([]);
  const known = useRef(new Map());

  const load = useCallback(async ({ notify = true } = {}) => {
    if (!user) { setOrders([]); known.current = new Map(); return; }
    try {
      const res = await api('/orders');
      if (notify && settings.notifOrder) {
        res.orders.forEach((o) => {
          const was = known.current.get(o.id);
          if (was && was !== o.status) toast(`${o.storeName}: ${STATUS_LABEL[o.status]}`, { icon: 'bi-bell-fill' });
        });
      }
      known.current = new Map(res.orders.map((o) => [o.id, o.status]));
      setOrders(res.orders);
    } catch { /* keep last known */ }
  }, [user, settings.notifOrder, toast]);

  useEffect(() => { load({ notify: false }); }, [load]);
  usePolling(load, 20000, Boolean(user) && orders.some(isActive));

  /** Replace one order after an update (cancel, rate, live refresh) */
  const upsert = useCallback((order) => {
    known.current.set(order.id, order.status);
    setOrders((list) => (list.some((o) => o.id === order.id) ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list]));
  }, []);

  return <OrdersContext.Provider value={{ orders, reload: load, upsert, setOrders }}>{children}</OrdersContext.Provider>;
}

export const useOrders = () => useContext(OrdersContext);
