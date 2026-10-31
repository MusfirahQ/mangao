// Basket maths (the server repeats the same rules when the order is placed).

/** Delivery fee for one store: free above its free-delivery threshold. */
export function feeFor(store, subtotal) {
  if (!store || store.deliveryFee === 0) return 0;
  if (store.freeDeliveryOver && subtotal >= store.freeDeliveryOver) return 0;
  return store.deliveryFee;
}

/** Group basket lines by store: [{ vendor, lines, subtotal }] */
export function groupByVendor(lines, vendorById) {
  const groups = new Map();
  lines.forEach((l) => {
    const vid = l.product.vendorId;
    if (!groups.has(vid)) groups.set(vid, { vendor: vendorById(vid), lines: [], subtotal: 0 });
    const g = groups.get(vid);
    g.lines.push(l);
    g.subtotal += l.product.price * l.qty;
  });
  return [...groups.values()].filter((g) => g.vendor);
}

export function totals({ groups, mode, promo, tip = 0 }) {
  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const deliveryFee = mode === 'pickup' ? 0 : groups.reduce((s, g) => s + feeFor(g.vendor, g.subtotal), 0);
  const discount = promo && subtotal > 0 ? Math.min(promo.amount, subtotal) : 0;
  const realTip = mode === 'pickup' ? 0 : tip;
  return { subtotal, deliveryFee, discount, tip: realTip, total: Math.max(0, subtotal - discount + deliveryFee + realTip) };
}

/** Stores whose delivery minimum isn't met (pickup has no minimum). */
export const shortfalls = (groups, mode) => (mode === 'pickup' ? [] : groups
  .filter((g) => g.subtotal < g.vendor.minOrder)
  .map((g) => ({ vendor: g.vendor, short: g.vendor.minOrder - g.subtotal })));

/** Closed stores or sold-out items stop checkout. */
export function basketProblems(lines, vendorById) {
  const out = new Set();
  lines.forEach((l) => {
    const v = vendorById(l.product.vendorId);
    if (!l.product.available) out.add(`${l.product.name} is sold out. Remove it to continue.`);
    else if (v && !v.isOpen) out.add(`${v.name} is closed right now. Remove its items to continue.`);
  });
  return [...out];
}
