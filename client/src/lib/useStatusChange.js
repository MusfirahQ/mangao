import { api } from './api.js';
import { STATUS_LABEL } from './data.js';
import { useUI } from '../context/UIContext.jsx';

/** Returns a function that moves an order to its next status, then calls `refresh`. */
export default function useStatusChange(refresh) {
  const { toast, toastError, confirm } = useUI();
  return async (order, status) => {
    if (status === 'rejected' && !(await confirm({ title: `Decline order ${order.id}?`, text: 'The customer will be told the store could not take it.', confirmLabel: 'Decline' }))) return;
    if (status === 'cancelled' && !(await confirm({ title: `Cancel order ${order.id}?`, text: 'This stops the order for the customer and the store.', confirmLabel: 'Cancel order' }))) return;
    try {
      await api(`/orders/${encodeURIComponent(order.id)}/status`, { method: 'POST', body: { status } });
      toast(`${order.id}: ${STATUS_LABEL[status]}`, { icon: 'bi-check2-circle', type: 'ok' });
    } catch (err) { toastError(err); }
    await refresh();
  };
}
