import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Toast messages, confirm dialog, basket drawer and product popup
const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [productId, setProductId] = useState(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((text, { icon = 'bi-check-circle-fill', type = '', action = null, ms = 3200 } = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, text, icon, type, action }]);
    setAnnouncement(text);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);
  const toastError = useCallback((err) => toast(err.message || String(err), { icon: 'bi-exclamation-triangle-fill', type: 'err', ms: 4500 }), [toast]);

  /** confirm({ title, text, confirmLabel }) → Promise<boolean> */
  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);

  const value = {
    toasts, toast, toastError, dismiss, announcement,
    confirmState, confirm, closeConfirm: (answer) => { confirmState?.resolve(answer); setConfirmState(null); },
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    productId, openProduct: setProductId, closeProduct: () => setProductId(null),
    addressOpen, setAddressOpen,
  };
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export const useUI = () => useContext(UIContext);
