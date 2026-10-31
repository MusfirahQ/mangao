/** Put the items of a past order back in the basket (skipping anything no longer sold). */
export function reorderInto(order, { cart, productById, vendorById, toast, openCart }) {
  let added = 0;
  let skipped = 0;
  order.items.forEach((i) => {
    const p = productById(i.productId);
    const v = p && vendorById(p.vendorId);
    if (p && p.available && v && v.isOpen) { cart.add(p.id, i.qty); added += i.qty; } else skipped += 1;
  });
  if (!added) { toast('These items are not available right now', { icon: 'bi-exclamation-circle', type: 'err' }); return; }
  toast(skipped ? `Added to basket. ${skipped} item(s) are no longer available.` : 'Items added to your basket', { icon: 'bi-arrow-repeat' });
  openCart();
}
