import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCatalog } from './CatalogContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { groupByVendor, totals, shortfalls, basketProblems } from '../lib/pricing.js';

// The basket lives on this device (localStorage) until the order is placed.
const KEY = 'mangao.cart';
const CartContext = createContext(null);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {};
    return {
      items: Array.isArray(saved.items) ? saved.items.filter((l) => l && typeof l.productId === 'string' && Number.isInteger(l.qty) && l.qty > 0) : [],
      promo: saved.promo && typeof saved.promo.code === 'string' ? saved.promo : null,
      addressId: saved.addressId || null,
    };
  } catch {
    return { items: [], promo: null, addressId: null };
  }
}

export function CartProvider({ children }) {
  const { productById, vendorById, status } = useCatalog();
  const { settings } = useSettings();
  const [cart, setCart] = useState(load);
  const [mode, setMode] = useState(settings.defaultMode === 'pickup' ? 'pickup' : 'delivery');
  const [tip, setTip] = useState(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* blocked */ } }, [cart]);

  // drop lines for products that no longer exist once the catalog has loaded
  useEffect(() => {
    if (status === 'ready') setCart((c) => ({ ...c, items: c.items.filter((l) => productById(l.productId)) }));
  }, [status, productById]);

  const lines = useMemo(() => cart.items.map((l) => ({ ...l, product: productById(l.productId) })).filter((l) => l.product), [cart.items, productById]);
  const groups = useMemo(() => groupByVendor(lines, vendorById), [lines, vendorById]);
  const currentTip = mode === 'pickup' ? 0 : (tip ?? Number(settings.defaultTip) ?? 0);

  const setQty = (productId, qty) => setCart((c) => {
    const items = c.items.filter((l) => l.productId !== productId);
    if (qty > 0) {
      const idx = c.items.findIndex((l) => l.productId === productId);
      const line = { productId, qty: Math.min(99, qty) };
      if (idx === -1) items.push(line); else items.splice(idx, 0, line);
    }
    return { ...c, items, promo: items.length ? c.promo : null };
  });

  const value = {
    items: cart.items, lines, groups, mode, setMode, promo: cart.promo, tip: currentTip, setTip,
    addressId: cart.addressId, setAddressId: (addressId) => setCart((c) => ({ ...c, addressId })),
    count: cart.items.reduce((s, l) => s + l.qty, 0),
    qtyOf: (pid) => cart.items.find((l) => l.productId === pid)?.qty || 0,
    add: (pid, qty = 1) => setCart((c) => {
      const items = [...c.items];
      const line = items.find((l) => l.productId === pid);
      if (line) line.qty = Math.min(99, line.qty + qty); else items.push({ productId: pid, qty: Math.min(99, qty) });
      return { ...c, items: items.map((l) => ({ ...l })) };
    }),
    setQty,
    remove: (pid) => setQty(pid, 0),
    clear: () => setCart((c) => ({ ...c, items: [], promo: null })),
    setPromo: (promo) => setCart((c) => ({ ...c, promo })),
    totals: (withTip = false) => totals({ groups, mode, promo: cart.promo, tip: withTip ? currentTip : 0 }),
    shortfalls: shortfalls(groups, mode),
    problems: basketProblems(lines, vendorById),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
