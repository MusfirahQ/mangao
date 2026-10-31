/* =========================================================================
   Mangao — application logic (vanilla JS + Bootstrap 5)
   Sections: utils · Mangi art · state · lookups · pricing · cart · favourites
             · renderers · views · checkout · orders/tracking · account
             · settings · help/chat · router · events · boot
   All ordering, tracking, payment and support behaviour is simulated locally.
   ========================================================================= */
'use strict';

/* ---------------------------------------------------------------- utils */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape any text before it goes into an HTML template. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const rs = (n) => `Rs. ${nf.format(Math.max(0, Math.round(Number(n) || 0)))}`;
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDate = (ts) => dateFmt.format(new Date(ts));
const fmtTime = (ts) => timeFmt.format(new Date(ts));
const randId = (prefix, len = 6) => `${prefix}-${Math.random().toString(36).slice(2, 2 + len).toUpperCase().padEnd(len, '7')}`;
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------- Mangi art */
let mangiSeq = 0;
/** Returns an inline SVG of Mangi. Moods change the face and small props only,
    so the character stays consistent everywhere. */
function mangiSVG(mood = 'happy') {
  const id = `mg${++mangiSeq}`;
  const sad = mood === 'sad';
  const mouth = sad
    ? '<path d="M50 92 Q60 84 70 92" fill="none" stroke="#202124" stroke-width="4" stroke-linecap="round"/>'
    : mood === 'wave' || mood === 'hero'
      ? '<path d="M47 84 Q60 98 73 84 Z" fill="#202124"/><path d="M52 89 Q60 95 68 89" fill="#E8604A"/>'
      : '<path d="M49 85 Q60 95 71 85" fill="none" stroke="#202124" stroke-width="4" stroke-linecap="round"/>';
  const brows = sad ? '<path d="M38 54 L50 58 M82 54 L70 58" stroke="#202124" stroke-width="3" stroke-linecap="round"/>' : '';
  const arm = mood === 'wave'
    ? '<g><path d="M104 74 Q116 62 114 48" fill="none" stroke="#F07824" stroke-width="7" stroke-linecap="round"/><circle cx="114" cy="45" r="6" fill="#F5A900"/><path d="M122 36 l5 -4 M124 46 l6 0" stroke="#202124" stroke-width="2.5" stroke-linecap="round"/></g>'
    : '';
  const headset = mood === 'help'
    ? '<path d="M22 70 C20 34 100 30 100 70" fill="none" stroke="#202124" stroke-width="5" stroke-linecap="round"/><rect x="14" y="62" width="12" height="20" rx="5" fill="#202124"/><rect x="95" y="62" width="12" height="20" rx="5" fill="#202124"/><path d="M20 82 Q24 100 46 98" fill="none" stroke="#202124" stroke-width="3"/><circle cx="47" cy="98" r="4" fill="#202124"/>'
    : '';
  const speed = mood === 'ride'
    ? '<path d="M2 70 h12 M0 84 h16 M4 98 h10" stroke="#F5A900" stroke-width="4" stroke-linecap="round"/>'
    : '';
  const eyeRy = sad ? 6 : 7;
  return `<svg viewBox="0 0 132 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mangi, the Mangao mango">
    <defs><linearGradient id="${id}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#FFC21A"/><stop offset=".55" stop-color="#F5A900"/><stop offset="1" stop-color="#F07824"/></linearGradient></defs>
    ${speed}
    <path d="M62 20 L64 9 L69 10 L66 21 Z" fill="#7A4A1E"/>
    <path d="M66 18 C70 6 84 0 98 2 C106 3 112 7 114 10 C104 18 90 24 74 22 C70 21 67 20 66 18 Z" fill="#4E9A3E"/>
    <path d="M70 18 C82 12 96 8 110 9" fill="none" stroke="#2F6B25" stroke-width="2" stroke-linecap="round"/>
    <path d="M64 20 C92 22 110 50 106 82 C102 110 80 124 56 122 C30 120 12 100 14 72 C16 44 38 18 64 20 Z" fill="url(#${id})"/>
    <ellipse cx="38" cy="48" rx="9" ry="14" transform="rotate(25 38 48)" fill="#fff" opacity=".35"/>
    ${headset}
    ${brows}
    <ellipse cx="47" cy="68" rx="5.5" ry="${eyeRy}" fill="#202124"/><ellipse cx="73" cy="68" rx="5.5" ry="${eyeRy}" fill="#202124"/>
    <circle cx="49" cy="65" r="2" fill="#fff"/><circle cx="75" cy="65" r="2" fill="#fff"/>
    <ellipse cx="36" cy="82" rx="6" ry="4" fill="#E8604A" opacity=".35"/><ellipse cx="85" cy="82" rx="6" ry="4" fill="#E8604A" opacity=".35"/>
    ${mouth}
    ${arm}
  </svg>`;
}
function paintMangi(root = document) {
  $$('[data-mangi]', root).forEach((el) => {
    if (el.dataset.painted) return;
    const mood = el.dataset.mangi === 'mark' ? 'happy' : el.dataset.mangi;
    el.innerHTML = mangiSVG(mood);
    if (el.dataset.mangi === 'mark' || el.getAttribute('aria-hidden') === 'true') {
      const svg = el.querySelector('svg');
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
      svg.setAttribute('aria-hidden', 'true');
    }
    el.dataset.painted = '1';
  });
}
const mangiBlock = (mood) => `<div class="empty-mangi" aria-hidden="true">${mangiSVG(mood).replace('role="img"', 'aria-hidden="true"')}</div>`;

/* ----------------------------------------------------------------- state */
const STORAGE_KEY = 'mangao.v1';

function defaultState() {
  const now = Date.now();
  const day = 86400000;
  return {
    cart: [],                                   // [{ productId, qty }]
    favourites: { products: [], vendors: [] },
    orderMode: 'delivery',
    promo: null,                                // applied promo code or null
    usedPromos: [],                             // codes already redeemed on a demo order
    orders: [
      sampleOrder('MG-S1A2B3', now - 3 * day, 'delivery', [['kfc-1', 2], ['kfc-6', 1]], 5),
      sampleOrder('MG-S4C5D6', now - 8 * day, 'pickup', [['carrefour-1', 2], ['carrefour-2', 1], ['carrefour-4', 1]], 0),
    ],
    supportCases: [],
    profile: { name: '', phone: '', email: '' },
    addresses: [{ id: 'addr-home', label: 'Home', line: 'House 24, Street 5, Block G', area: 'Johar Town', isDefault: true }],
    selectedAddressId: 'addr-home',
    settings: { theme: 'light', photos: true, reduceMotion: false, defaultMode: 'delivery', defaultTip: 0, notifOrder: true, notifPromo: false },
    chat: [],
  };
}

/** Builds a completed sample order for the history list (marked as sample). */
function sampleOrder(id, ts, mode, lines, rating) {
  const items = lines.map(([pid, qty]) => {
    const p = PRODUCTS.find((x) => x.id === pid);
    return { productId: pid, name: p.name, price: p.price, qty, vendorId: p.vendorId };
  });
  const vendorIds = [...new Set(items.map((i) => i.vendorId))];
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = mode === 'delivery' ? vendorIds.reduce((s, v) => s + feeFor(VENDORS.find((x) => x.id === v), subtotal), 0) : 0;
  const stages = [ts, ts + 4 * 60000, ts + 18 * 60000, ts + 38 * 60000];
  return {
    id, isSample: true, createdAt: ts, mode, items, vendorIds, subtotal, deliveryFee, discount: 0, tip: 0,
    total: subtotal + deliveryFee, stage: 3, stageTimes: stages, nextAt: null, cancelled: false,
    contact: { name: 'Sample customer', phone: '0300 1234567', email: '' },
    address: mode === 'delivery' ? 'House 24, Street 5, Block G, Johar Town' : '',
    payment: 'Cash', when: 'As soon as possible', notes: '', rating,
  };
}

let state = null; // initialised in boot(), after lookups exist

function loadState() {
  const base = defaultState();
  const saved = safeParse(localStorage.getItem(STORAGE_KEY), null);
  if (!saved) return base;
  // Merge carefully so missing or malformed keys fall back to defaults.
  const merged = { ...base, ...saved };
  merged.settings = { ...base.settings, ...(saved.settings || {}) };
  merged.profile = { ...base.profile, ...(saved.profile || {}) };
  merged.favourites = {
    products: Array.isArray(saved.favourites?.products) ? saved.favourites.products : [],
    vendors: Array.isArray(saved.favourites?.vendors) ? saved.favourites.vendors : [],
  };
  merged.cart = Array.isArray(saved.cart)
    ? saved.cart.filter((l) => l && productById(l.productId) && Number.isInteger(l.qty) && l.qty > 0)
    : [];
  ['orders', 'supportCases', 'addresses', 'usedPromos', 'chat'].forEach((k) => {
    if (!Array.isArray(merged[k])) merged[k] = base[k];
  });
  merged.orderMode = merged.settings.defaultMode === 'pickup' ? 'pickup' : 'delivery';
  return merged;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

/* UI-only state (not persisted) */
const ui = {
  route: { name: 'home', params: {}, query: {} },
  activeCategory: 'all',
  searchQuery: '',
  popularCat: 'all',
  productSort: 'relevance',
  vendorFilters: {
    restaurant: { kind: 'All', lowFee: false, topRated: false, fast: false, sort: 'recommended' },
    shop: { kind: 'All', lowFee: false, topRated: false, fast: false, sort: 'recommended' },
  },
  vendorSearch: '',
  ordersTab: 'active',
  favTab: 'items',
  tip: null,
  lastCase: null,
};

/* --------------------------------------------------------------- lookups */
const productMap = new Map(PRODUCTS.map((p) => [p.id, p]));
const vendorMap = new Map(VENDORS.map((v) => [v.id, v]));
function productById(id) { return productMap.get(id) || null; }
function vendorById(id) { return vendorMap.get(id) || null; }
const categoryLabel = (value) => (CATEGORIES.find((c) => c.value === value) || {}).label || value;

function initials(name) {
  if (/^[A-Z0-9]{2,5}$/.test(name)) return name;
  const parts = name.split(/[\s.\-&]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
}
function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}
function vendorLogo(v) {
  const txt = initials(v.name);
  const style = `background:${v.color};color:${isLight(v.color) ? '#202124' : '#fff'};${txt.length > 3 ? 'font-size:.78rem;' : ''}`;
  return `<span class="vendor-logo" style="${style}" aria-hidden="true">${esc(txt)}</span>`;
}
const etaText = (v) => (state.orderMode === 'pickup' ? `Ready in ~${Math.max(10, v.eta[0] - 10)} min` : `${v.eta[0]}–${v.eta[1]} min`);
const ratingCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n));

/* --------------------------------------------------------------- pricing */
function cartLines() {
  return state.cart
    .map((l) => ({ ...l, product: productById(l.productId) }))
    .filter((l) => l.product);
}
function cartQty(pid) {
  const line = state.cart.find((l) => l.productId === pid);
  return line ? line.qty : 0;
}
const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);

function groupByVendor(lines = cartLines()) {
  const groups = new Map();
  lines.forEach((l) => {
    const vid = l.product.vendorId;
    if (!groups.has(vid)) groups.set(vid, { vendor: vendorById(vid), lines: [], subtotal: 0 });
    const g = groups.get(vid);
    g.lines.push(l);
    g.subtotal += l.product.price * l.qty;
  });
  return [...groups.values()];
}

/** Demo delivery fee for one vendor: waived above that vendor's free-delivery threshold. */
function feeFor(vendor, vendorSubtotal) {
  if (!vendor) return 0;
  if (vendor.deliveryFee === 0) return 0;
  if (vendor.freeDeliveryOver && vendorSubtotal >= vendor.freeDeliveryOver) return 0;
  return vendor.deliveryFee;
}

function calculateSubtotal() {
  return cartLines().reduce((s, l) => s + l.product.price * l.qty, 0);
}
function calculateDeliveryFee() {
  if (state.orderMode === 'pickup') return 0;
  return groupByVendor().reduce((s, g) => s + feeFor(g.vendor, g.subtotal), 0);
}
/** MANGO150: flat Rs. 150 off the subtotal, never more than the subtotal itself. */
function calculateDiscount(subtotal = calculateSubtotal()) {
  if (!state.promo || subtotal <= 0) return 0;
  const promo = PROMO_CODES[state.promo];
  if (!promo) return 0;
  return Math.min(promo.amount, subtotal);
}
function currentTip() {
  if (state.orderMode === 'pickup') return 0;
  return ui.tip ?? Number(state.settings.defaultTip) ?? 0;
}
function calculateTotal({ includeTip = false } = {}) {
  const subtotal = calculateSubtotal();
  const total = subtotal - calculateDiscount(subtotal) + calculateDeliveryFee() + (includeTip ? currentTip() : 0);
  return Math.max(0, total);
}
/** Vendors whose delivery minimum isn't met (pickup has no minimum). */
function minimumShortfalls() {
  if (state.orderMode === 'pickup') return [];
  return groupByVendor()
    .filter((g) => g.subtotal < g.vendor.minOrder)
    .map((g) => ({ vendor: g.vendor, short: g.vendor.minOrder - g.subtotal }));
}

/* ------------------------------------------------------------------ cart */
function addToCart(pid, qty = 1, { silent = false } = {}) {
  const p = productById(pid);
  if (!p || !p.available) return;
  const line = state.cart.find((l) => l.productId === pid);
  if (line) line.qty = Math.min(99, line.qty + qty);
  else state.cart.push({ productId: pid, qty: Math.min(99, qty) });
  saveState();
  refreshCartUI(true);
  if (!silent) toast(`${p.name} added to basket`, { icon: 'bi-basket2-fill', action: { label: 'View basket', run: openCart } });
}
function updateQuantity(pid, delta) {
  const line = state.cart.find((l) => l.productId === pid);
  if (!line) return;
  const next = line.qty + delta;
  if (next < 1) return; // decrement is disabled at 1; removal is a separate, explicit control
  line.qty = Math.min(99, next);
  saveState();
  refreshCartUI();
  announce(`${productById(pid).name}: quantity ${line.qty}`);
}
function setQuantity(pid, qty) {
  const line = state.cart.find((l) => l.productId === pid);
  if (line) line.qty = Math.max(1, Math.min(99, qty));
  else addToCart(pid, qty, { silent: true });
  saveState();
  refreshCartUI();
}
function removeFromCart(pid) {
  const p = productById(pid);
  const prev = state.cart.find((l) => l.productId === pid);
  state.cart = state.cart.filter((l) => l.productId !== pid);
  if (!state.cart.length) state.promo = null;
  saveState();
  refreshCartUI();
  toast(`${p ? p.name : 'Item'} removed`, {
    icon: 'bi-trash3',
    action: prev ? { label: 'Undo', run: () => { state.cart.push(prev); saveState(); refreshCartUI(); } } : null,
  });
}
function clearCart() {
  state.cart = [];
  state.promo = null;
  saveState();
  refreshCartUI();
}

/** Apply a promo code. `msgEl` receives inline feedback. Returns true on success. */
function applyPromo(raw, msgEl) {
  const code = String(raw || '').trim().toUpperCase();
  const say = (text, ok) => {
    if (msgEl) { msgEl.textContent = text; msgEl.className = `promo-msg ${ok ? 'ok' : 'err'}`; }
    announce(text);
  };
  if (!code) { say('Enter a promo code first.', false); return false; }
  if (!PROMO_CODES[code]) { say(`“${code}” isn't a valid code. Try MANGO150.`, false); return false; }
  if (!state.cart.length) { say('Add something to your basket before applying a code.', false); return false; }
  if (state.promo === code) { say(`${code} is already applied to this basket.`, false); return false; }
  if (state.usedPromos.includes(code)) { say(`You've already used ${code} on an earlier demo order. Reset demo data in Settings to try it again.`, false); return false; }
  state.promo = code;
  saveState();
  refreshCartUI();
  say(`${code} applied: ${rs(calculateDiscount())} off your subtotal.`, true);
  toast(`${code} applied — you save ${rs(calculateDiscount())}`, { icon: 'bi-ticket-perforated', type: 'ok' });
  return true;
}
function removePromo() {
  state.promo = null;
  saveState();
  refreshCartUI();
  announce('Promo code removed');
}

/* ------------------------------------------------------------ favourites */
function isFav(type, id) { return state.favourites[type].includes(id); }
function toggleFavourite(type, id, btn) {
  const list = state.favourites[type];
  const idx = list.indexOf(id);
  const on = idx === -1;
  if (on) list.push(id); else list.splice(idx, 1);
  saveState();
  const name = type === 'products' ? productById(id)?.name : vendorById(id)?.name;
  $$(`[data-action="fav"][data-type="${type}"][data-id="${CSS.escape(id)}"]`).forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', `${on ? 'Remove' : 'Save'} ${name} ${on ? 'from' : 'to'} favourites`);
  });
  if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  toast(on ? `Saved ${name} to favourites` : `Removed ${name} from favourites`, { icon: on ? 'bi-heart-fill' : 'bi-heart' });
  if (ui.route.name === 'favourites') renderFavourites();
  if (ui.route.name === 'account') renderAccount();
}
function favButton(type, id, name, cls = 'fav-btn') {
  const on = isFav(type, id);
  return `<button type="button" class="${cls}" data-action="fav" data-type="${type}" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Save'} ${esc(name)} ${on ? 'from' : 'to'} favourites"><i class="bi bi-heart" aria-hidden="true"></i></button>`;
}

/* ------------------------------------------------------------- renderers */
function imgTile(key, cat, alt, { tag = 'div', cls = '', attrs = '' } = {}) {
  const im = IMAGES[key] || { photo: null, emoji: '🛍️' };
  const photo = state.settings.photos && im.photo;
  return `<${tag} class="img-tile ${cls}" data-cat="${esc(cat)}" ${attrs}>
    <span class="tile-emoji" aria-hidden="true">${im.emoji}</span>
    ${photo ? `<img class="tile-img" src="${esc(photo)}" alt="${esc(alt)}" loading="lazy" decoding="async">` : ''}
  </${tag}>`;
}

function actionHTML(p, size = '') {
  if (!p.available) return `<button type="button" class="add-btn" disabled aria-label="${esc(p.name)} is sold out">Sold out</button>`;
  const qty = cartQty(p.id);
  if (!qty) {
    return `<button type="button" class="add-btn" data-action="add" data-pid="${p.id}" aria-label="Add ${esc(p.name)} to basket"><i class="bi bi-plus-lg" aria-hidden="true"></i><span class="lbl">Add</span></button>`;
  }
  const left = qty === 1
    ? `<button type="button" data-action="remove" data-pid="${p.id}" aria-label="Remove ${esc(p.name)} from basket"><i class="bi bi-trash3" aria-hidden="true"></i></button>`
    : `<button type="button" data-action="dec" data-pid="${p.id}" aria-label="Decrease quantity of ${esc(p.name)}"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>`;
  return `<div class="stepper ${size}" role="group" aria-label="Quantity of ${esc(p.name)}">
    ${left}<span class="qty" aria-live="polite">${qty}</span>
    <button type="button" data-action="inc" data-pid="${p.id}" aria-label="Increase quantity of ${esc(p.name)}"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
  </div>`;
}

function productCard(p) {
  const v = vendorById(p.vendorId);
  const badges = [p.featured ? '<span class="p-badge">Popular</span>' : '', p.isNew ? '<span class="p-badge new">New</span>' : ''].join('');
  return `<article class="product-card" data-pid="${p.id}">
    ${badges ? `<div class="badge-row">${badges}</div>` : ''}
    ${favButton('products', p.id, p.name)}
    ${imgTile(p.image, p.category, p.name, { tag: 'button', attrs: `type="button" data-action="open-product" data-pid="${p.id}" aria-label="View details for ${esc(p.name)}"` })}
    ${!p.available ? '<div class="sold-out" aria-hidden="true"><span>Sold out</span></div>' : ''}
    <div class="p-body">
      <a class="p-vendor" href="#/vendor/${v.id}">${esc(v.name)} <span class="p-cat">${esc(categoryLabel(p.category))}</span></a>
      <h3 class="p-name"><button type="button" data-action="open-product" data-pid="${p.id}">${esc(p.name)}</button></h3>
      <p class="p-desc">${esc(p.description)}</p>
      <div class="p-foot">
        <span class="p-price">${rs(p.price)}</span>
        <div class="p-action" data-pid="${p.id}">${actionHTML(p)}</div>
      </div>
    </div>
  </article>`;
}

function vendorCard(v) {
  const fee = state.orderMode === 'pickup'
    ? '<span class="free-tag"><i class="bi bi-bag-check" aria-hidden="true"></i>No delivery fee</span>'
    : v.deliveryFee === 0
      ? '<span class="free-tag"><i class="bi bi-bicycle" aria-hidden="true"></i>Free delivery</span>'
      : `<span><i class="bi bi-bicycle" aria-hidden="true"></i>${rs(v.deliveryFee)}${v.freeDeliveryOver ? `, free over ${rs(v.freeDeliveryOver)}` : ''}</span>`;
  const badge = v.deliveryFee === 0 ? 'Free delivery' : v.featured ? 'Popular' : '';
  return `<article class="vendor-card">
    <a class="vendor-link" href="#/vendor/${v.id}" aria-label="${esc(v.name)}, rated ${v.rating}, ${esc(etaText(v))}"></a>
    ${badge ? `<span class="deal-badge">${badge}</span>` : ''}
    ${favButton('vendors', v.id, v.name)}
    ${imgTile(v.cover, v.type === 'shop' ? 'shop' : 'food', '')}
    <div class="vendor-body">
      ${vendorLogo(v)}
      <h3 class="vendor-name"><span>${esc(v.name)}</span><span class="vendor-rating"><i class="bi bi-star-fill" aria-hidden="true"></i> ${v.rating} <small>(${ratingCount(v.ratings)})</small></span></h3>
      <p class="vendor-tags mb-2">${esc(v.tags.join(', '))} · ${esc(v.area)}</p>
      <div class="vendor-meta"><span><i class="bi bi-clock" aria-hidden="true"></i>${esc(etaText(v))}</span>${fee}</div>
    </div>
  </article>`;
}

function emptyState({ mood = 'happy', title, text, actions = '' }) {
  return `<div class="empty-state">${mangiBlock(mood)}<h2>${esc(title)}</h2><p>${esc(text)}</p>${actions}</div>`;
}

/** Mark cached images as loaded (load events can fire before listeners see them). */
function settleImages(root = document) {
  $$('img.tile-img:not(.loaded):not(.failed)', root).forEach((img) => {
    if (img.complete) img.classList.add(img.naturalWidth > 0 ? 'loaded' : 'failed');
  });
}

/* ------------------------------------------------------ cart UI refresh */
function refreshCartUI(bump = false) {
  const count = cartCount();
  const badge = $('#cartCount');
  badge.textContent = count;
  $('#cartCountLabel').textContent = `${plural(count, 'item')} in basket`;
  if (bump) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }

  // Update every product action area in place, so lists don't re-render.
  $$('.p-action[data-pid]').forEach((el) => {
    const p = productById(el.dataset.pid);
    if (!p) return;
    const focused = el.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    el.innerHTML = actionHTML(p, el.dataset.size || '');
    if (focused) {
      // Keep keyboard focus on the equivalent control after the swap.
      (el.querySelector(`[data-action="${focused}"]:not(:disabled)`) || el.querySelector('[data-action="inc"]') || el.querySelector('button')).focus();
    }
  });

  // Mobile basket bar
  const bar = $('#basketBar');
  const showBar = count > 0 && !['checkout', 'track'].includes(ui.route.name);
  bar.hidden = !showBar;
  document.body.classList.toggle('has-basket', showBar);
  $('#bbCount').textContent = count;
  $('#bbTotal').textContent = rs(calculateTotal());

  renderCart();
  if (ui.route.name === 'vendor') renderSideBasket();
  if (ui.route.name === 'checkout') renderCheckout(false);
}

function openCart() { bootstrap.Offcanvas.getOrCreateInstance('#cartPanel').show(); }
function closeCart() { bootstrap.Offcanvas.getOrCreateInstance('#cartPanel').hide(); }

function totalsHTML({ includeTip = false } = {}) {
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal);
  const fee = calculateDeliveryFee();
  const tip = includeTip ? currentTip() : 0;
  const feeLine = state.orderMode === 'pickup'
    ? `<li><span>Delivery fee<span class="muted">Pickup selected</span></span><span>${rs(0)}</span></li>`
    : `<li><span>Delivery fee<span class="muted">Demo estimate, per place</span></span><span>${fee === 0 ? 'Free' : rs(fee)}</span></li>`;
  return `<ul class="totals">
    <li><span>Subtotal</span><span>${rs(subtotal)}</span></li>
    ${feeLine}
    ${discount ? `<li class="discount"><span>Discount (${esc(state.promo)})</span><span>− ${rs(discount)}</span></li>` : ''}
    ${includeTip && state.orderMode === 'delivery' ? `<li><span>Rider tip</span><span>${rs(tip)}</span></li>` : ''}
    <li><span>Service fee</span><span>${rs(0)}</span></li>
    <li class="grand"><span>Total</span><span>${rs(calculateTotal({ includeTip }))}</span></li>
  </ul>`;
}

function promoBlockHTML(inputId) {
  if (state.promo) {
    return `<div class="promo-applied"><span><i class="bi bi-ticket-perforated me-1" aria-hidden="true"></i><strong>${esc(state.promo)}</strong> applied</span><button type="button" data-action="remove-promo">Remove</button></div>`;
  }
  return `<label for="${inputId}" class="form-label small mb-1">Promo code</label>
    <div class="input-group input-group-sm">
      <input id="${inputId}" class="form-control text-uppercase" placeholder="MANGO150" aria-describedby="${inputId}Msg">
      <button type="button" class="btn btn-outline-dark" data-promo-apply="${inputId}">Apply</button>
    </div>
    <div class="promo-msg" id="${inputId}Msg" aria-live="polite"></div>`;
}

function cartLineHTML(l) {
  const p = l.product;
  return `<div class="cart-line">
    ${imgTile(p.image, p.category, '')}
    <div>
      <div class="cart-line-name">${esc(p.name)}</div>
      <div class="cart-line-unit">${rs(p.price)} each</div>
      <button type="button" class="remove-link" data-action="remove" data-pid="${p.id}" aria-label="Remove ${esc(p.name)} from basket">Remove</button>
    </div>
    <div class="cart-line-right">
      <span class="cart-line-total">${rs(p.price * l.qty)}</span>
      <div class="stepper light" role="group" aria-label="Quantity of ${esc(p.name)}">
        <button type="button" data-action="dec" data-pid="${p.id}" aria-label="Decrease quantity of ${esc(p.name)}" ${l.qty <= 1 ? 'disabled' : ''}><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
        <span class="qty">${l.qty}</span>
        <button type="button" data-action="inc" data-pid="${p.id}" aria-label="Increase quantity of ${esc(p.name)}"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
      </div>
    </div>
  </div>`;
}

function renderCart() {
  const panel = $('#cartPanel');
  const active = document.activeElement;
  const refocus = panel.contains(active) && active !== panel
    ? (active.dataset.action && active.dataset.pid ? `[data-action="${active.dataset.action}"][data-pid="${active.dataset.pid}"]` : active.id ? `#${active.id}` : '')
    : null;
  renderCartContent();
  if (refocus !== null && !panel.contains(document.activeElement)) {
    const target = refocus && panel.querySelector(`${refocus}:not(:disabled)`);
    (target || panel.querySelector('.promo-applied button') || panel).focus();
  }
}

function renderCartContent() {
  const body = $('#cartBody');
  const footer = $('#cartFooter');
  $('#cartModeNote').textContent = state.orderMode === 'pickup' ? 'Pickup — collect from each place' : `Delivery to ${selectedAddressText() || 'your address'}`;
  const groups = groupByVendor();
  if (!groups.length) {
    body.innerHTML = emptyState({
      title: 'Your basket is empty',
      text: 'Find something tasty, or stock up on groceries — it all goes in one basket.',
      actions: '<button type="button" class="btn btn-mango" data-action="go" data-href="#/browse">Start browsing</button>',
    });
    footer.innerHTML = '';
    return;
  }
  const shortfalls = minimumShortfalls();
  body.innerHTML = groups.map((g) => {
    const fee = feeFor(g.vendor, g.subtotal);
    const short = shortfalls.find((s) => s.vendor.id === g.vendor.id);
    const feeNote = state.orderMode === 'pickup' ? 'Pickup' : fee === 0 ? 'Free delivery' : `${rs(fee)} delivery${g.vendor.freeDeliveryOver ? ` · add ${rs(g.vendor.freeDeliveryOver - g.subtotal)} for free delivery` : ''}`;
    return `<section class="cart-group" aria-label="${esc(g.vendor.name)} items">
      <div class="cart-group-head">${vendorLogo(g.vendor)}<div><a href="#/vendor/${g.vendor.id}">${esc(g.vendor.name)}</a><small>${esc(feeNote)}</small></div></div>
      ${g.lines.map(cartLineHTML).join('')}
      ${short ? `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>Add ${rs(short.short)} more from ${esc(g.vendor.name)} to reach its ${rs(g.vendor.minOrder)} delivery minimum, or switch to Pickup.</span></p>` : ''}
    </section>`;
  }).join('') + '<button type="button" class="remove-link" data-action="clear-cart">Clear basket</button>';

  footer.innerHTML = `${promoBlockHTML('cartPromo')}
    <div class="mt-3">${totalsHTML()}</div>
    <button type="button" class="btn btn-mango btn-lg w-100 mt-3" data-action="go-checkout" ${shortfalls.length ? 'disabled aria-describedby="cartBlockNote"' : ''}>Go to checkout</button>
    ${shortfalls.length ? '<p class="tiny-note text-center" id="cartBlockNote">Reach each delivery minimum to continue.</p>' : ''}`;
  settleImages(body);
}

/* -------------------------------------------------------------- toasts */
function announce(text) {
  const live = $('#liveRegion');
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}
function toast(text, { icon = 'bi-check-circle-fill', type = '', action = null, ms = 3200 } = {}) {
  const stack = $('#toastStack');
  const el = document.createElement('div');
  el.className = `m-toast ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i><span>${esc(text)}</span>${action ? `<button type="button" class="t-action">${esc(action.label)}</button>` : ''}<button type="button" class="t-close" aria-label="Dismiss"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`;
  const kill = () => el.remove();
  if (action) el.querySelector('.t-action').addEventListener('click', () => { action.run(); kill(); });
  el.querySelector('.t-close').addEventListener('click', kill);
  while (stack.children.length >= 3) stack.firstChild.remove();
  stack.appendChild(el);
  setTimeout(kill, ms);
  announce(text);
}

/* Confirm dialog (Bootstrap modal) */
function confirmDialog(title, text, confirmLabel, onConfirm) {
  $('#cmTitle').textContent = title;
  $('#cmText').textContent = text;
  const btn = $('#cmConfirm');
  btn.textContent = confirmLabel;
  const modal = bootstrap.Modal.getOrCreateInstance('#confirmModal');
  const handler = () => { modal.hide(); onConfirm(); };
  btn.replaceWith(btn.cloneNode(true));
  $('#cmConfirm').addEventListener('click', handler, { once: true });
  modal.show();
}

/* ================================================================= VIEWS */

/* ---------------- Home */
function renderHome() {
  $('#categoryTiles').innerHTML = CATEGORIES.map((c) => {
    const n = PRODUCTS.filter((p) => p.category === c.value).length;
    return `<a class="cat-tile" data-cat="${c.value}" href="#/browse?cat=${c.value}&q=">
      <span class="cat-emoji" aria-hidden="true">${c.emoji}</span>
      <h3>${esc(c.label)}</h3><p>${esc(c.blurb)}</p><span class="cat-count">${n} items</span>
    </a>`;
  }).join('');

  const rest = VENDORS.filter((v) => v.type === 'restaurant').sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  const shops = VENDORS.filter((v) => v.type === 'shop').sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  $('#homeRestaurants').innerHTML = rest.slice(0, 8).map(vendorCard).join('');
  $('#homeShops').innerHTML = shops.map(vendorCard).join('');

  renderPopular();
  renderOrderAgain();
  $('#heroModePill').textContent = state.orderMode === 'pickup' ? 'Pickup across Lahore' : `Delivering to ${selectedAddress()?.area || 'Lahore'}`;
  settleImages();
}

function renderPopular() {
  const chips = [{ value: 'all', label: 'All' }, ...CATEGORIES];
  $('#popularChips').innerHTML = chips.map((c) => `<button type="button" class="chip" data-action="popular-cat" data-cat="${c.value}" aria-pressed="${ui.popularCat === c.value}">${esc(c.label)}</button>`).join('');
  const list = PRODUCTS.filter((p) => p.featured && p.available && (ui.popularCat === 'all' || p.category === ui.popularCat)).slice(0, 8);
  $('#popularGrid').innerHTML = list.map(productCard).join('');
  settleImages($('#popularGrid'));
}

function renderOrderAgain() {
  const past = state.orders.filter((o) => o.stage === 3 && !o.cancelled).slice(0, 4);
  $('#orderAgainBlock').hidden = !past.length;
  $('#orderAgainList').innerHTML = past.map((o) => {
    const vs = o.vendorIds.map(vendorById).filter(Boolean);
    return `<article class="order-card mb-0">
      <div class="order-vendors"><span class="logo-stack">${vs.map(vendorLogo).join('')}</span>
        <div><p class="order-title">${esc(vs.map((v) => v.name).join(' + '))}</p><span class="order-meta">${fmtDate(o.createdAt)}</span></div></div>
      <p class="order-items">${esc(itemsSummary(o))}</p>
      <div class="order-actions"><span class="order-total">${rs(o.total)}</span><button type="button" class="btn btn-sm btn-dark" data-action="reorder" data-oid="${o.id}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button></div>
    </article>`;
  }).join('');
}

/* ---------------- Restaurants / Shops */
function renderVendors(type) {
  const f = ui.vendorFilters[type];
  const all = VENDORS.filter((v) => v.type === type);
  const isRest = type === 'restaurant';
  $('#vendorsTitle').textContent = isRest ? 'Restaurants' : 'Shops and supermarkets';
  $('#vendorsSub').textContent = isRest
    ? 'Burgers, pizza, karahi, biryani and coffee from around Lahore. Sample listings.'
    : 'Supermarkets, pharmacies and bakeries for your weekly shop. Sample listings.';
  document.title = `${isRest ? 'Restaurants' : 'Shops'} — Mangao`;

  const kinds = ['All', ...new Set(all.map((v) => v.kind))];
  $('#vendorKindChips').innerHTML = kinds.map((k) => {
    const n = k === 'All' ? all.length : all.filter((v) => v.kind === k).length;
    return `<button type="button" class="chip" data-action="vendor-kind" data-kind="${esc(k)}" aria-pressed="${f.kind === k}">${esc(k)} <span class="chip-n">${n}</span></button>`;
  }).join('');
  $$('[data-vfilter]').forEach((b) => b.setAttribute('aria-pressed', String(Boolean(f[b.dataset.vfilter]))));
  $('#vendorSort').value = f.sort;

  let list = all.filter((v) => (f.kind === 'All' || v.kind === f.kind)
    && (!f.lowFee || v.deliveryFee < 100)
    && (!f.topRated || v.rating >= 4.5)
    && (!f.fast || v.eta[0] < 30));
  const sorters = {
    recommended: (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
    fastest: (a, b) => a.eta[0] - b.eta[0],
    rating: (a, b) => b.rating - a.rating || b.ratings - a.ratings,
    fee: (a, b) => a.deliveryFee - b.deliveryFee,
  };
  list = list.sort(sorters[f.sort] || sorters.recommended);

  $('#vendorCount').textContent = `${plural(list.length, isRest ? 'restaurant' : 'shop')}`;
  $('#vendorGrid').innerHTML = list.length
    ? list.map(vendorCard).join('')
    : `<div style="grid-column:1/-1">${emptyState({ mood: 'sad', title: 'Nothing matches these filters', text: 'Try removing a filter to see more places.', actions: '<button type="button" class="btn btn-mango" data-action="reset-vfilters">Clear filters</button>' })}</div>`;
  settleImages($('#vendorGrid'));
}

/* ---------------- Vendor detail */
function renderVendor(id) {
  const v = vendorById(id);
  if (!v) return showView('notfound');
  document.title = `${v.name} — Mangao`;
  const fee = state.orderMode === 'pickup' ? 'No delivery fee' : v.deliveryFee === 0 ? 'Free delivery' : `${rs(v.deliveryFee)} delivery`;
  $('#vendorHero').innerHTML = `
    ${imgTile(v.cover, v.type === 'shop' ? 'shop' : 'food', '', { cls: 'vendor-cover' })}
    <div class="container-xl vendor-head">
      <div class="vendor-head-card">
        ${vendorLogo(v)}
        <div>
          <p class="mb-1"><a href="#/${v.type === 'shop' ? 'shops' : 'restaurants'}" class="back-link small"><i class="bi bi-arrow-left" aria-hidden="true"></i> ${v.type === 'shop' ? 'Shops' : 'Restaurants'}</a></p>
          <h1 id="vendorName">${esc(v.name)}</h1>
          <p class="page-sub">${esc(v.tags.join(', '))} · ${esc(v.area)}, Lahore</p>
          <div class="vendor-pills">
            <span class="v-pill"><i class="bi bi-star-fill" aria-hidden="true"></i>${v.rating} <span class="text-body-secondary fw-normal">(${ratingCount(v.ratings)} ratings)</span></span>
            <span class="v-pill"><i class="bi bi-clock" aria-hidden="true"></i>${esc(etaText(v))}</span>
            <span class="v-pill"><i class="bi bi-bicycle" aria-hidden="true"></i>${esc(fee)}</span>
            ${state.orderMode === 'delivery' ? `<span class="v-pill"><i class="bi bi-basket" aria-hidden="true"></i>Min. ${rs(v.minOrder)}</span>` : ''}
            ${v.freeDeliveryOver && state.orderMode === 'delivery' ? `<span class="v-pill"><i class="bi bi-gift" aria-hidden="true"></i>Free delivery over ${rs(v.freeDeliveryOver)}</span>` : ''}
          </div>
        </div>
        ${favButton('vendors', v.id, v.name)}
      </div>
    </div>`;
  $('#vendorSearch').value = ui.vendorSearch;
  renderVendorMenu(v);
  renderSideBasket();
}

function renderVendorMenu(v) {
  const q = ui.vendorSearch.trim().toLowerCase();
  const items = PRODUCTS.filter((p) => p.vendorId === v.id && (!q || `${p.name} ${p.description} ${p.section}`.toLowerCase().includes(q)));
  const sections = [...new Set(items.map((p) => p.section))];
  $('#vendorSections').innerHTML = sections.map((s, i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-action="jump-section" data-target="sec-${i}">${esc(s)}</button>`).join('');
  if (!items.length) {
    $('#vendorMenu').innerHTML = emptyState({ mood: 'sad', title: `No items match “${ui.vendorSearch}”`, text: `Try a different word, or browse the full ${v.name} menu.`, actions: '<button type="button" class="btn btn-mango" data-action="clear-vendor-search">Show full menu</button>' });
    return;
  }
  $('#vendorMenu').innerHTML = sections.map((s, i) => `
    <section class="menu-section" id="sec-${i}" aria-labelledby="sech-${i}">
      <h2 id="sech-${i}">${esc(s)}</h2>
      <div class="menu-list">${items.filter((p) => p.section === s).map(menuItem).join('')}</div>
    </section>`).join('');
  settleImages($('#vendorMenu'));
}

function menuItem(p) {
  return `<article class="menu-item">
    <div class="d-flex flex-column">
      <h3 class="p-name"><button type="button" data-action="open-product" data-pid="${p.id}">${esc(p.name)}</button>${p.isNew ? ' <span class="p-badge new">New</span>' : ''}</h3>
      <p class="p-desc">${esc(p.description)}</p>
      <div class="p-foot justify-content-start gap-2">
        <span class="p-price">${rs(p.price)}</span>
        ${!p.available ? '<span class="p-cat">Sold out</span>' : ''}
        ${favButton('products', p.id, p.name, 'fav-mini')}
      </div>
    </div>
    ${imgTile(p.image, p.category, p.name, { tag: 'button', attrs: `type="button" data-action="open-product" data-pid="${p.id}" aria-label="View details for ${esc(p.name)}"` })}
    <div class="menu-actions p-action" data-pid="${p.id}">${actionHTML(p)}</div>
  </article>`;
}

function renderSideBasket() {
  const v = vendorById(ui.route.params.id);
  if (!v) return;
  const group = groupByVendor().find((g) => g.vendor.id === v.id);
  const others = cartCount() - (group ? group.lines.reduce((s, l) => s + l.qty, 0) : 0);
  const el = $('#sideBasket');
  if (!group) {
    el.innerHTML = `<h2>Your basket</h2><p class="text-body-secondary small mb-0">Items you add from ${esc(v.name)} appear here.${others ? ` You also have ${plural(others, 'item')} from other places.` : ''}</p>
      ${others ? '<button type="button" class="btn btn-outline-dark w-100 mt-3" data-action="open-cart">View full basket</button>' : ''}`;
    return;
  }
  const short = minimumShortfalls().find((s) => s.vendor.id === v.id);
  el.innerHTML = `<h2>From ${esc(v.name)}</h2>
    ${group.lines.map((l) => `<div class="summary-line"><span>${l.qty} × ${esc(l.product.name)}</span><span>${rs(l.product.price * l.qty)}</span></div>`).join('')}
    <div class="summary-line fw-bold border-top mt-2 pt-2"><span>Subtotal here</span><span>${rs(group.subtotal)}</span></div>
    ${short ? `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>Add ${rs(short.short)} more for delivery.</span></p>` : ''}
    ${others ? `<p class="tiny-note">Plus ${plural(others, 'item')} from other places.</p>` : ''}
    <button type="button" class="btn btn-mango w-100 mt-3" data-action="open-cart">Review basket · ${rs(calculateTotal())}</button>`;
}

/* ---------------- Browse / search */
/** Combine category + search query (+ sort) over all products. */
function getFilteredProducts() {
  const q = ui.searchQuery.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    if (ui.activeCategory !== 'all' && p.category !== ui.activeCategory) return false;
    if (!q) return true;
    const v = vendorById(p.vendorId);
    return [p.name, categoryLabel(p.category), p.category, p.section, p.description, v.name, v.kind].join(' ').toLowerCase().includes(q);
  });
  const sorters = {
    relevance: (a, b) => (q ? Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)) : 0)
      || Number(b.available) - Number(a.available) || Number(b.featured) - Number(a.featured),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return list.sort(sorters[ui.productSort] || sorters.relevance);
}

function renderBrowse() {
  document.title = ui.searchQuery ? `“${ui.searchQuery}” — Mangao` : 'Browse — Mangao';
  $('#browseSearch').value = ui.searchQuery;
  $('#productSort').value = ui.productSort;
  const chips = [{ value: 'all', label: 'All' }, ...CATEGORIES];
  $('#browseChips').innerHTML = chips.map((c) => `<button type="button" class="chip" data-action="browse-cat" data-cat="${c.value}" aria-pressed="${ui.activeCategory === c.value}">${esc(c.label)}</button>`).join('');
  renderBrowseResults();
}

function renderBrowseResults() {
  const q = ui.searchQuery.trim();
  const list = getFilteredProducts();
  $('#browseSearchClear').hidden = !q;
  const vq = q.toLowerCase();
  const vendors = vq ? VENDORS.filter((v) => `${v.name} ${v.kind} ${v.tags.join(' ')}`.toLowerCase().includes(vq)) : [];
  $('#browseVendorsWrap').hidden = !vendors.length;
  $('#browseVendors').innerHTML = vendors.map(vendorCard).join('');
  const catTxt = ui.activeCategory === 'all' ? '' : ` in ${categoryLabel(ui.activeCategory)}`;
  $('#browseCount').textContent = `${plural(list.length, 'item')}${q ? ` for “${q}”` : ''}${catTxt}`;
  if (!list.length) {
    const actions = [
      q ? '<button type="button" class="btn btn-mango" data-action="clear-search">Clear search</button>' : '',
      ui.activeCategory !== 'all' ? '<button type="button" class="btn btn-outline-dark" data-action="browse-cat" data-cat="all">Search all categories</button>' : '',
    ].join(' ');
    $('#browseGrid').innerHTML = `<div style="grid-column:1/-1">${emptyState({ mood: 'sad', title: q ? `No items match “${q}”${catTxt}` : 'Nothing here yet', text: 'Check the spelling, try a broader word like “burger” or “milk”, or look in another category.', actions })}</div>`;
  } else {
    $('#browseGrid').innerHTML = list.map(productCard).join('');
  }
  settleImages($('#view-browse') || document);
}

function setSearch(value, { navigate = true } = {}) {
  ui.searchQuery = value;
  ['#headerSearch', '#browseSearch'].forEach((s) => { const el = $(s); if (el && el.value !== value) el.value = value; });
  $('#headerSearchClear').hidden = !value;
  if (ui.route.name === 'browse') renderBrowseResults();
  else if (navigate && value.trim()) location.hash = '#/browse';
}

/* ---------------- Product modal */
function openProduct(pid) {
  const p = productById(pid);
  if (!p) return;
  const v = vendorById(p.vendorId);
  const inCart = cartQty(pid);
  let qty = inCart || 1;
  const box = $('#productModalContent');
  box.innerHTML = `
    <button type="button" class="btn-close-float" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
    ${imgTile(p.image, p.category, p.name)}
    <div class="pm-body">
      <a class="p-vendor" href="#/vendor/${v.id}">${esc(v.name)} <span class="p-cat">${esc(categoryLabel(p.category))}</span></a>
      <h2 class="h4 mt-1 mb-1" id="pmTitle">${esc(p.name)}</h2>
      <p class="text-body-secondary mb-2">${esc(p.description)}</p>
      <p class="p-price fs-5 mb-0">${rs(p.price)}</p>
      ${p.available ? `<div class="pm-foot">
        <div class="stepper light" role="group" aria-label="Quantity">
          <button type="button" id="pmDec" aria-label="Decrease quantity"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
          <span class="qty" id="pmQty" aria-live="polite">${qty}</span>
          <button type="button" id="pmInc" aria-label="Increase quantity"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
        </div>
        <button type="button" class="btn btn-mango" id="pmAdd"></button>
      </div>` : '<p class="min-warn mt-3"><i class="bi bi-x-circle" aria-hidden="true"></i><span>This item is sold out right now.</span></p>'}
    </div>`;
  const paint = () => {
    const qEl = $('#pmQty'); if (!qEl) return;
    qEl.textContent = qty;
    $('#pmDec').disabled = qty <= 1;
    $('#pmAdd').textContent = `${inCart ? 'Update basket' : 'Add to basket'} · ${rs(p.price * qty)}`;
  };
  if (p.available) {
    paint();
    $('#pmDec').addEventListener('click', () => { if (qty > 1) { qty--; paint(); } });
    $('#pmInc').addEventListener('click', () => { if (qty < 99) { qty++; paint(); } });
    $('#pmAdd').addEventListener('click', () => {
      if (inCart) { setQuantity(pid, qty); toast(`${p.name}: quantity updated to ${qty}`); }
      else addToCart(pid, qty);
      bootstrap.Modal.getOrCreateInstance('#productModal').hide();
    });
  }
  settleImages(box);
  bootstrap.Modal.getOrCreateInstance('#productModal').show();
}

/* ============================================================ CHECKOUT */
function whenOptions() {
  const opts = ['As soon as possible'];
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  const end = new Date(); end.setHours(23, 30, 0, 0);
  while (d <= end && opts.length < 12) {
    opts.push(`Today, ${fmtTime(d)}`);
    d.setMinutes(d.getMinutes() + 30);
  }
  return opts;
}

function renderCheckout(full = true) {
  document.title = 'Checkout — Mangao';
  const empty = !state.cart.length;
  $('#checkoutGrid').hidden = empty;
  $('#checkoutEmpty').innerHTML = empty
    ? emptyState({ title: 'Nothing to check out yet', text: 'Your basket is empty. Add a few things and come back here to place a demo order.', actions: '<a href="#/browse" class="btn btn-mango">Browse products</a>' })
    : '';
  if (empty) return;

  if (full) {
    // Prefill contact and address from the profile once per visit.
    const pf = state.profile;
    if (!$('#coName').value) $('#coName').value = pf.name;
    if (!$('#coPhone').value) $('#coPhone').value = pf.phone;
    if (!$('#coEmail').value) $('#coEmail').value = pf.email;
    const addr = selectedAddress();
    const areaSel = $('#coArea');
    if (areaSel.options.length <= 1) areaSel.insertAdjacentHTML('beforeend', LAHORE_AREAS.map((a) => `<option>${esc(a)}</option>`).join(''));
    if (addr && !$('#coAddress').value) { $('#coAddress').value = addr.line; areaSel.value = addr.area; }
    $('#coWhen').innerHTML = whenOptions().map((o) => `<option>${esc(o)}</option>`).join('');
    $('#savedAddrPicker').innerHTML = state.addresses.map((a) => `<button type="button" class="chip" data-action="use-address" data-id="${a.id}"><i class="bi bi-geo-alt" aria-hidden="true"></i>${esc(a.label)}</button>`).join('');
    clearErrors($('#checkoutForm'));
    $('#checkoutErrors').hidden = true;
    if (ui.tip === null) ui.tip = Number(state.settings.defaultTip) || 0;
    $('#coPromo').value = '';
    $('#coPromoMsg').textContent = '';
  }
  $$('input[name="coMode"]').forEach((r) => { r.checked = r.value === state.orderMode; });
  const pickup = state.orderMode === 'pickup';
  $('#deliveryFields').hidden = pickup;
  $('#pickupFields').hidden = !pickup;
  $('#tipWrap').hidden = pickup;
  $('#pickupInfo').innerHTML = `<strong>Pickup points</strong><ul class="mb-0 mt-1 ps-3">${groupByVendor().map((g) => `<li>${esc(g.vendor.name)}, ${esc(g.vendor.area)} — ready in about ${Math.max(10, g.vendor.eta[0] - 10)} min (demo estimate)</li>`).join('')}</ul>`;
  $('#tipRow').innerHTML = [0, 50, 100, 150].map((t) => `<label class="tip-opt"><input type="radio" name="coTip" value="${t}" ${currentTip() === t ? 'checked' : ''}><span>${t ? rs(t) : 'No tip'}</span></label>`).join('');
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const groups = groupByVendor();
  const promoWrap = $('#coPromo').closest('.promo-form');
  promoWrap.hidden = Boolean(state.promo);
  $('#checkoutSummary').innerHTML = groups.map((g) => `
      <p class="summary-vendor mb-1">${esc(g.vendor.name)}</p>
      ${g.lines.map((l) => `<div class="summary-line"><span>${l.qty} × ${esc(l.product.name)}</span><span>${rs(l.product.price * l.qty)}</span></div>`).join('')}`).join('')
    + `<button type="button" class="btn btn-link btn-sm px-0 text-body" data-action="open-cart"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit basket</button>`
    + (state.promo ? `<div class="mt-2">${promoBlockHTML('x')}</div>` : '')
    + `<div class="mt-2">${totalsHTML({ includeTip: true })}</div>`;
  const shortfalls = minimumShortfalls();
  $('#placeOrderBtn').textContent = `Place demo order · ${rs(calculateTotal({ includeTip: true }))}`;
  if (shortfalls.length) {
    $('#checkoutSummary').insertAdjacentHTML('beforeend', shortfalls.map((s) => `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>Add ${rs(s.short)} more from ${esc(s.vendor.name)} for delivery, or switch to Pickup.</span></p>`).join(''));
  }
}

const PHONE_RE = /^(?:\+92|0)3\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normPhone = (v) => v.replace(/[\s-]/g, '');

function setError(input, msg) {
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  const fb = document.getElementById(`${input.id}Err`);
  if (fb) fb.textContent = msg;
}
function clearErrors(form) {
  $$('.is-invalid', form).forEach((el) => { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); });
  $$('.invalid-feedback', form).forEach((el) => { el.textContent = ''; });
}

/** Validates name + contact. Returns [{ el, msg }]. Shared by checkout and profile. */
function validateContact(nameEl, phoneEl, emailEl, { requireContact = true } = {}) {
  const errs = [];
  const name = nameEl.value.trim();
  if (!name) errs.push({ el: nameEl, msg: 'Enter your name.' });
  else if (name.length < 2) errs.push({ el: nameEl, msg: 'Your name should be at least 2 characters.' });
  const phone = normPhone(phoneEl.value.trim());
  const email = emailEl.value.trim();
  if (requireContact && !phone && !email) errs.push({ el: phoneEl, msg: 'Add a mobile number or an email so you can be reached about the order.' });
  if (phone && !PHONE_RE.test(phone)) errs.push({ el: phoneEl, msg: 'Enter a Pakistani mobile number like 0300 1234567.' });
  if (email && !EMAIL_RE.test(email)) errs.push({ el: emailEl, msg: 'Enter an email like name@example.com.' });
  return errs;
}

function validateCheckout() {
  const form = $('#checkoutForm');
  clearErrors(form);
  const errs = validateContact($('#coName'), $('#coPhone'), $('#coEmail'));
  if (state.orderMode === 'delivery') {
    const addr = $('#coAddress');
    if (!addr.value.trim()) errs.unshift({ el: addr, msg: 'Enter your delivery address.' });
    else if (addr.value.trim().length < 8) errs.unshift({ el: addr, msg: 'Add a bit more detail, such as house number and street.' });
    if (!$('#coArea').value) errs.splice(1, 0, { el: $('#coArea'), msg: 'Choose your area.' });
  }
  const shortfalls = minimumShortfalls();
  errs.forEach((e) => setError(e.el, e.msg));
  const summary = $('#checkoutErrors');
  const extra = shortfalls.map((s) => `Add ${rs(s.short)} more from ${s.vendor.name} to reach its delivery minimum, or switch to Pickup.`);
  if (errs.length || extra.length) {
    summary.innerHTML = `<strong>Please fix ${plural(errs.length + extra.length, 'thing')} before placing your order:</strong><ul>${
      errs.map((e) => `<li><a href="#${e.el.id}" data-action="focus-field" data-target="${e.el.id}">${esc(e.msg)}</a></li>`).join('')}${
      extra.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    summary.hidden = false;
    (errs[0] ? errs[0].el : summary).focus();
    if (errs[0]) errs[0].el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return false;
  }
  summary.hidden = true;
  return true;
}

function placeDemoOrder() {
  if (!state.cart.length) return;
  if (!validateCheckout()) { announce('Some details need fixing before you can place the order.'); return; }
  const btn = $('#placeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Placing demo order…';

  setTimeout(() => {
    const lines = cartLines();
    const subtotal = calculateSubtotal();
    const pickup = state.orderMode === 'pickup';
    const now = Date.now();
    const order = {
      id: randId('MG'),
      isSample: false,
      createdAt: now,
      mode: state.orderMode,
      items: lines.map((l) => ({ productId: l.productId, name: l.product.name, price: l.product.price, qty: l.qty, vendorId: l.product.vendorId })),
      vendorIds: groupByVendor().map((g) => g.vendor.id),
      subtotal,
      deliveryFee: calculateDeliveryFee(),
      discount: calculateDiscount(subtotal),
      promo: state.promo,
      tip: currentTip(),
      total: calculateTotal({ includeTip: true }),
      stage: 0,
      stageTimes: [now],
      nextAt: now + STAGE_MS[0],
      cancelled: false,
      contact: { name: $('#coName').value.trim(), phone: $('#coPhone').value.trim(), email: $('#coEmail').value.trim() },
      address: pickup ? '' : `${$('#coAddress').value.trim()}, ${$('#coArea').value}`,
      riderNote: pickup ? '' : $('#coRiderNote').value.trim(),
      pickupNote: pickup ? $('#coPickupNote').value.trim() : '',
      payment: ($('input[name="coPay"]:checked') || {}).value || 'Cash',
      when: $('#coWhen').value,
      notes: $('#coNotes').value.trim(),
      rating: 0,
    };
    state.orders.unshift(order);
    if (state.promo) state.usedPromos.push(state.promo);
    if (!state.profile.name) state.profile = { ...order.contact };
    state.cart = [];
    state.promo = null;
    ui.tip = null;
    saveState();
    $('#checkoutForm').reset();
    btn.disabled = false;
    refreshCartUI();
    location.hash = `#/track/${order.id}`;
    toast(`Demo order ${order.id} placed`, { icon: 'bi-bag-check-fill', type: 'ok' });
  }, 900);
}

/* ===================================================== ORDERS & TRACKING */
const STAGE_MS = [10000, 20000, 25000]; // demo durations between stages
const STAGE_COPY = {
  delivery: [
    'Your order is in. In a real launch, the places you ordered from would confirm it now.',
    'Your items are being prepared and packed.',
    'A rider is bringing your order to you.',
    'Delivered. Enjoy!',
  ],
  pickup: [
    'Your order is in. In a real launch, the places you ordered from would confirm it now.',
    'Your items are being prepared and packed.',
    'Your order is ready to collect.',
    'Collected. Enjoy!',
  ],
};

const itemsSummary = (o) => {
  const parts = o.items.map((i) => `${i.qty}× ${i.name}`);
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} and ${parts.length - 3} more` : parts.join(', ');
};
const isActive = (o) => !o.cancelled && o.stage < 3;
const orderById = (id) => state.orders.find((o) => o.id === id);

function advanceOrder(o, { manual = false } = {}) {
  if (!isActive(o)) return;
  o.stage += 1;
  o.stageTimes[o.stage] = Date.now();
  o.nextAt = o.stage < 3 ? Date.now() + STAGE_MS[o.stage] : null;
  saveState();
  const label = TRACKING_STAGES[o.mode][o.stage];
  if (state.settings.notifOrder || manual) {
    toast(`${o.id}: ${label}`, { icon: o.stage === 3 ? 'bi-check-circle-fill' : 'bi-bell-fill', type: o.stage === 3 ? 'ok' : '', action: ui.route.name === 'track' ? null : { label: 'Track', run: () => { location.hash = `#/track/${o.id}`; } } });
  }
  onOrdersChanged(o.id);
}

function onOrdersChanged(changedId) {
  updateActiveDot();
  if (ui.route.name === 'track' && ui.route.params.id === changedId) renderTrack(changedId);
  if (ui.route.name === 'orders') renderOrders();
  if (ui.route.name === 'home') renderOrderAgain();
}

function updateActiveDot() {
  $('#activeOrdersDot').hidden = !state.orders.some(isActive);
}

/* The simulation clock: moves active demo orders along their stages. */
setInterval(() => {
  if (!state) return;
  const now = Date.now();
  state.orders.filter((o) => isActive(o) && o.nextAt && now >= o.nextAt).forEach((o) => advanceOrder(o));
}, 1000);

function orderCard(o) {
  const vs = o.vendorIds.map(vendorById).filter(Boolean);
  const label = o.cancelled ? 'Cancelled' : TRACKING_STAGES[o.mode][o.stage];
  const done = o.cancelled || o.stage === 3;
  const rating = o.stage === 3 && !o.cancelled
    ? `<div class="rate-row" role="group" aria-label="Rate this order">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= (o.rating || 0) ? 'on' : ''}" data-action="rate" data-oid="${o.id}" data-stars="${n}" aria-label="Rate ${n} out of 5" aria-pressed="${n <= (o.rating || 0)}"><i class="bi bi-star-fill" aria-hidden="true"></i></button>`).join('')}</div>`
    : '';
  return `<article class="order-card">
    <div class="order-top">
      <div class="order-vendors"><span class="logo-stack">${vs.map(vendorLogo).join('')}</span>
        <div><p class="order-title">${esc(vs.map((v) => v.name).join(' + '))}${o.isSample ? '<span class="sample-tag">Sample</span>' : '<span class="sample-tag">Demo</span>'}</p>
        <span class="order-meta">${esc(o.id)} · ${fmtDate(o.createdAt)} · ${o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</span></div></div>
      <span class="status-tag ${done ? 'done' : ''}">${esc(label)}</span>
    </div>
    <p class="order-items">${esc(itemsSummary(o))}</p>
    ${isActive(o) ? `<div class="mini-progress" aria-hidden="true"><span style="width:${((o.stage + 1) / 4) * 100}%"></span></div>` : ''}
    <div class="order-actions mt-3">
      <span class="order-total">${rs(o.total)}</span>
      <div class="btns">
        ${rating}
        <a href="#/track/${o.id}" class="btn btn-sm ${isActive(o) ? 'btn-dark' : 'btn-outline-dark'}">${isActive(o) ? '<i class="bi bi-geo" aria-hidden="true"></i>Track' : 'Details'}</a>
        ${!isActive(o) ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="reorder" data-oid="${o.id}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button>` : ''}
        <a href="#/help?order=${o.id}" class="btn btn-sm btn-outline-dark">Get help</a>
      </div>
    </div>
  </article>`;
}

function renderOrders() {
  document.title = 'Orders — Mangao';
  const active = state.orders.filter(isActive);
  const past = state.orders.filter((o) => !isActive(o));
  $('#activeCount').textContent = active.length;
  $('#pastCount').textContent = past.length;
  $$('[data-otab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.otab === ui.ordersTab)));
  $('#ordersActive').hidden = ui.ordersTab !== 'active';
  $('#ordersPast').hidden = ui.ordersTab !== 'past';
  $('#ordersActive').innerHTML = active.length
    ? active.map(orderCard).join('')
    : emptyState({ title: 'No orders on the way', text: 'When you place a demo order, you can follow each step of it here.', actions: '<a href="#/browse" class="btn btn-mango">Start an order</a>' });
  $('#ordersPast').innerHTML = past.length
    ? past.map(orderCard).join('') + '<button type="button" class="remove-link mt-2" data-action="clear-history">Clear order history</button>'
    : emptyState({ title: 'No past orders yet', text: 'Demo orders appear here after you complete checkout and they finish.', actions: '<a href="#/browse" class="btn btn-mango">Browse products</a>' });
}

function renderTrack(id) {
  const o = orderById(id);
  const body = $('#trackBody');
  if (!o) {
    body.innerHTML = emptyState({ mood: 'sad', title: `We couldn't find order ${id}`, text: 'It may have been cleared from this browser.', actions: '<a href="#/orders" class="btn btn-mango">See your orders</a>' });
    return;
  }
  document.title = `Tracking ${o.id} — Mangao`;
  const stages = TRACKING_STAGES[o.mode];
  const vs = o.vendorIds.map(vendorById).filter(Boolean);
  const etaMax = Math.max(...vs.map((v) => v.eta[1]));
  const heroTitle = o.cancelled ? 'Order cancelled' : stages[o.stage];
  const heroText = o.cancelled ? 'This demo order was cancelled before preparation started.' : STAGE_COPY[o.mode][o.stage];
  const eta = isActive(o) ? `<p class="mt-2"><i class="bi bi-clock me-1" aria-hidden="true"></i>${o.mode === 'pickup' ? 'Ready in' : 'Arrives in'} about ${o.mode === 'pickup' ? Math.max(10, etaMax - 15) : etaMax} min · demo estimate</p>` : '';

  body.innerHTML = `
    <div class="track-head">
      <div><h1 id="trackTitle">Order ${esc(o.id)}</h1><p class="page-sub">${fmtDate(o.createdAt)} · ${esc(vs.map((v) => v.name).join(' + '))}</p></div>
      <span class="sim-badge"><i class="bi bi-cpu" aria-hidden="true"></i>Simulated tracking — no live GPS or courier</span>
    </div>
    <div class="track-hero" role="status" aria-live="polite">
      <div><h2>${esc(heroTitle)}</h2><p>${esc(heroText)}</p>${eta}</div>
      <div class="track-mangi" aria-hidden="true">${mangiSVG(o.cancelled ? 'sad' : o.stage === 3 ? 'wave' : 'ride').replace('role="img"', 'aria-hidden="true"')}</div>
    </div>
    ${o.cancelled ? '' : `<section class="panel" aria-label="Order progress">
      <ol class="stepper-track">${stages.map((s, i) => {
        const cls = i < o.stage || o.stage === 3 ? 'done' : i === o.stage ? 'current' : '';
        const t = o.stageTimes[i] ? fmtTime(o.stageTimes[i]) : 'Waiting';
        return `<li class="${cls}" ${i === o.stage ? 'aria-current="step"' : ''}><span class="dot" aria-hidden="true">${cls === 'done' ? '<i class="bi bi-check-lg"></i>' : i + 1}</span>${esc(s)}<span class="t">${esc(t)}</span></li>`;
      }).join('')}</ol>
      <div class="d-flex flex-wrap gap-2 mt-4">
        ${isActive(o) ? `<button type="button" class="btn btn-sm btn-dark" data-action="advance" data-oid="${o.id}"><i class="bi bi-skip-forward" aria-hidden="true"></i>Skip to next step (demo)</button>` : ''}
        ${o.stage === 0 && !o.cancelled ? `<button type="button" class="btn btn-sm btn-outline-danger" data-action="cancel-order" data-oid="${o.id}">Cancel order</button>` : ''}
        <a href="#/help?order=${o.id}" class="btn btn-sm btn-outline-dark"><i class="bi bi-life-preserver" aria-hidden="true"></i>Get help with this order</a>
        ${!isActive(o) ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="reorder" data-oid="${o.id}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button>` : ''}
      </div>
      <p class="tiny-note mt-3">Steps advance automatically every few seconds to demonstrate the flow. Nothing is sent to any restaurant, shop or rider.</p>
    </section>`}
    <div class="track-grid">
      <section class="panel" aria-labelledby="tdTitle">
        <h2 class="panel-title" id="tdTitle">Details</h2>
        <dl class="kv">
          <dt>Mode</dt><dd>${o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</dd>
          ${o.mode === 'delivery' ? `<dt>Address</dt><dd>${esc(o.address)}</dd>` : `<dt>Pick up from</dt><dd>${esc(vs.map((v) => `${v.name}, ${v.area}`).join('; '))}</dd>`}
          <dt>Name</dt><dd>${esc(o.contact.name)}</dd>
          <dt>Contact</dt><dd>${esc([o.contact.phone, o.contact.email].filter(Boolean).join(' / ') || '—')}</dd>
          <dt>When</dt><dd>${esc(o.when)}</dd>
          <dt>Payment</dt><dd>${esc(o.payment)} <span class="text-body-secondary fw-normal">(not processed)</span></dd>
          ${o.riderNote ? `<dt>Rider note</dt><dd>${esc(o.riderNote)}</dd>` : ''}
          ${o.pickupNote ? `<dt>Pickup note</dt><dd>${esc(o.pickupNote)}</dd>` : ''}
          ${o.notes ? `<dt>Order notes</dt><dd>${esc(o.notes)}</dd>` : ''}
        </dl>
      </section>
      <section class="panel" aria-labelledby="tiTitle">
        <h2 class="panel-title" id="tiTitle">Items</h2>
        ${o.items.map((i) => `<div class="summary-line"><span>${i.qty} × ${esc(i.name)}</span><span>${rs(i.price * i.qty)}</span></div>`).join('')}
        <ul class="totals mt-2 border-top pt-2">
          <li><span>Subtotal</span><span>${rs(o.subtotal)}</span></li>
          <li><span>Delivery fee</span><span>${o.deliveryFee ? rs(o.deliveryFee) : o.mode === 'pickup' ? rs(0) : 'Free'}</span></li>
          ${o.discount ? `<li class="discount"><span>Discount${o.promo ? ` (${esc(o.promo)})` : ''}</span><span>− ${rs(o.discount)}</span></li>` : ''}
          ${o.tip ? `<li><span>Rider tip</span><span>${rs(o.tip)}</span></li>` : ''}
          <li class="grand"><span>Total</span><span>${rs(o.total)}</span></li>
        </ul>
      </section>
    </div>`;
}

function reorder(oid) {
  const o = orderById(oid);
  if (!o) return;
  let added = 0, skipped = 0;
  o.items.forEach((i) => {
    const p = productById(i.productId);
    if (p && p.available) { addToCart(p.id, i.qty, { silent: true }); added += i.qty; } else skipped++;
  });
  toast(added ? `Added ${plural(added, 'item')} to your basket${skipped ? ` (${skipped} no longer available)` : ''}` : 'These items are no longer available', { icon: 'bi-arrow-repeat', action: added ? { label: 'View basket', run: openCart } : null });
}

/* ========================================================== FAVOURITES */
function renderFavourites() {
  document.title = 'Favourites — Mangao';
  const items = state.favourites.products.map(productById).filter(Boolean);
  const places = state.favourites.vendors.map(vendorById).filter(Boolean);
  $('#favItemsCount').textContent = items.length;
  $('#favPlacesCount').textContent = places.length;
  $$('[data-ftab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.ftab === ui.favTab)));
  $('#favItems').hidden = ui.favTab !== 'items';
  $('#favPlaces').hidden = ui.favTab !== 'places';
  $('#favItems').innerHTML = items.length
    ? `<div class="product-grid">${items.map(productCard).join('')}</div>`
    : emptyState({ title: 'No saved items yet', text: 'Tap the heart on any item to keep it here for next time.', actions: '<a href="#/browse" class="btn btn-mango">Browse products</a>' });
  $('#favPlaces').innerHTML = places.length
    ? `<div class="vendor-grid">${places.map(vendorCard).join('')}</div>`
    : emptyState({ title: 'No saved places yet', text: 'Save your go-to restaurants and shops to find them in one tap.', actions: '<a href="#/restaurants" class="btn btn-mango">See restaurants</a>' });
  settleImages();
}

/* ============================================================= ACCOUNT */
function selectedAddress() {
  return state.addresses.find((a) => a.id === state.selectedAddressId) || state.addresses.find((a) => a.isDefault) || state.addresses[0] || null;
}
function selectedAddressText() {
  const a = selectedAddress();
  return a ? `${a.label}, ${a.area}` : '';
}
const addrIcon = (label) => ({ Home: 'bi-house', Work: 'bi-briefcase', University: 'bi-mortarboard' }[label] || 'bi-geo-alt');

function renderHeaderAddress() {
  const a = selectedAddress();
  $('#addressChipLabel').textContent = `${state.orderMode === 'pickup' ? 'Pickup near' : 'Deliver to'}${a ? ` · ${a.label}` : ''}`;
  $('#addressChipValue').textContent = a ? a.area : 'Add an address';
  const initial = (state.profile.name || 'Guest').trim()[0].toUpperCase();
  $('#headerAvatar').textContent = initial;
  $('#addressModalList').innerHTML = state.addresses.length
    ? state.addresses.map((ad) => `<label class="addr-opt"><input type="radio" name="addrPick" value="${ad.id}" ${ad.id === (a && a.id) ? 'checked' : ''}><span><i class="bi ${addrIcon(ad.label)}" aria-hidden="true"></i><span><strong>${esc(ad.label)}</strong><small>${esc(ad.line)}, ${esc(ad.area)}</small></span></span></label>`).join('')
    : '<p class="text-body-secondary mb-0">You have no saved addresses yet.</p>';
}

function renderAccount() {
  document.title = 'Account — Mangao';
  const pf = state.profile;
  $('#accountTitle').textContent = pf.name || 'Guest';
  $('#profileAvatar').textContent = (pf.name || 'Guest').trim()[0].toUpperCase();
  $('#profileContact').textContent = [pf.phone, pf.email].filter(Boolean).join(' · ') || 'Add your details to speed up checkout';
  const saved = state.orders.reduce((s, o) => s + (o.discount || 0), 0);
  $('#profileStats').innerHTML = `
    <div class="stat"><strong>${state.orders.length}</strong><span>Orders</span></div>
    <div class="stat"><strong>${state.favourites.products.length + state.favourites.vendors.length}</strong><span>Favourites</span></div>
    <div class="stat"><strong>${rs(saved)}</strong><span>Saved with codes</span></div>`;
  $('#pfName').value = pf.name;
  $('#pfPhone').value = pf.phone;
  $('#pfEmail').value = pf.email;
  if ($('#adArea').options.length <= 1) $('#adArea').insertAdjacentHTML('beforeend', LAHORE_AREAS.map((a) => `<option>${esc(a)}</option>`).join(''));
  $('#addressList').innerHTML = state.addresses.length
    ? state.addresses.map((a) => `<li>
        <i class="bi ${addrIcon(a.label)}" aria-hidden="true"></i>
        <div class="addr-text"><div class="addr-label">${esc(a.label)}${a.isDefault ? '<span class="default-tag">Default</span>' : ''}</div><div class="addr-line">${esc(a.line)}, ${esc(a.area)}, Lahore</div></div>
        <div class="d-flex gap-1 flex-wrap justify-content-end">
          ${!a.isDefault ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="default-address" data-id="${a.id}">Make default</button>` : ''}
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-address" data-id="${a.id}" aria-label="Delete ${esc(a.label)} address"><i class="bi bi-trash3" aria-hidden="true"></i></button>
        </div>
      </li>`).join('')
    : '<li class="text-body-secondary">No saved addresses. Add one to check out faster.</li>';
}

function saveProfile(e) {
  e.preventDefault();
  const form = $('#profileForm');
  clearErrors(form);
  const errs = validateContact($('#pfName'), $('#pfPhone'), $('#pfEmail'), { requireContact: false });
  if (errs.length) {
    errs.forEach((x) => setError(x.el, x.msg));
    errs[0].el.focus();
    $('#profileSaved').textContent = '';
    return;
  }
  state.profile = { name: $('#pfName').value.trim(), phone: $('#pfPhone').value.trim(), email: $('#pfEmail').value.trim() };
  saveState();
  renderAccount();
  renderHeaderAddress();
  $('#profileSaved').textContent = 'Saved';
  toast('Profile details saved', { type: 'ok' });
  setTimeout(() => { $('#profileSaved').textContent = ''; }, 2500);
}

function saveAddress(e) {
  e.preventDefault();
  const form = $('#addressForm');
  clearErrors(form);
  const line = $('#adLine'), area = $('#adArea');
  const errs = [];
  if (line.value.trim().length < 6) errs.push({ el: line, msg: 'Enter a street address with house number and street.' });
  if (!area.value) errs.push({ el: area, msg: 'Choose an area.' });
  if (errs.length) { errs.forEach((x) => setError(x.el, x.msg)); errs[0].el.focus(); return; }
  const addr = { id: randId('addr', 5), label: $('#adLabel').value, line: line.value.trim(), area: area.value, isDefault: !state.addresses.length };
  state.addresses.push(addr);
  if (addr.isDefault) state.selectedAddressId = addr.id;
  saveState();
  form.reset();
  toggleAddressForm(false);
  renderAccount();
  renderHeaderAddress();
  toast(`${addr.label} address saved`, { type: 'ok' });
}
function toggleAddressForm(show) {
  $('#addressForm').hidden = !show;
  $('#addAddressToggle').setAttribute('aria-expanded', String(show));
  if (show) $('#adLine').focus();
}

/* ============================================================ SETTINGS */
const prefersReducedMotion = () => state.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

function applySettings() {
  const s = state.settings;
  const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  document.documentElement.classList.toggle('reduce-motion', Boolean(s.reduceMotion));
}
function renderSettings() {
  document.title = 'Settings — Mangao';
  const s = state.settings;
  $('#setTheme').value = s.theme;
  $('#setPhotos').checked = s.photos;
  $('#setMotion').checked = s.reduceMotion;
  $('#setDefaultMode').value = s.defaultMode;
  $('#setTip').value = String(s.defaultTip);
  $('#setNotifOrder').checked = s.notifOrder;
  $('#setNotifPromo').checked = s.notifPromo;
}
function bindSettings() {
  const map = {
    setTheme: ['theme', (el) => el.value, (v) => `Theme set to ${v === 'system' ? 'match device' : v}`],
    setPhotos: ['photos', (el) => el.checked, (v) => (v ? 'Product photos on' : 'Using illustrations instead of photos')],
    setMotion: ['reduceMotion', (el) => el.checked, (v) => (v ? 'Reduced motion on' : 'Animations on')],
    setDefaultMode: ['defaultMode', (el) => el.value, (v) => `Default mode set to ${v}`],
    setTip: ['defaultTip', (el) => Number(el.value), (v) => (v ? `Default tip set to ${rs(v)}` : 'Default tip off')],
    setNotifOrder: ['notifOrder', (el) => el.checked, (v) => (v ? 'Order progress alerts on' : 'Order progress alerts off')],
    setNotifPromo: ['notifPromo', (el) => el.checked, (v) => (v ? 'Offer preference saved' : 'Offers turned off')],
  };
  Object.entries(map).forEach(([id, [key, read, msg]]) => {
    $(`#${id}`).addEventListener('change', (e) => {
      const v = read(e.target);
      state.settings[key] = v;
      if (key === 'defaultTip') ui.tip = null;
      saveState();
      applySettings();
      toast(msg(v), { icon: 'bi-gear-fill' });
    });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

  $('#exportDataBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mangao-demo-data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    toast('Downloaded mangao-demo-data.json', { icon: 'bi-download' });
  });
  $('#resetDataBtn').addEventListener('click', () => {
    confirmDialog('Reset all demo data?', 'This clears your basket, favourites, profile, addresses, demo orders and support reports from this browser.', 'Reset data', () => {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      ui.tip = null;
      saveState();
      applySettings();
      refreshCartUI();
      renderHeaderAddress();
      syncModeUI();
      updateActiveDot();
      router();
      toast('Demo data reset', { icon: 'bi-arrow-counterclockwise' });
    });
  });
}

/* ================================================================ HELP */
const FAQ = [
  ['Is this a real delivery service?', 'No. Mangao is a student frontend prototype. Restaurant and shop names, menus and prices are sample data, and no order is sent anywhere.'],
  ['How does the MANGO150 code work?', 'It takes Rs. 150 off your subtotal (never more than the subtotal). It can be applied once per basket and used on one demo order. Reset demo data in Settings to try it again.'],
  ['Why is there a minimum order?', 'Each place sets a minimum for delivery. If your items from one place are below it, add a little more or switch to Pickup, which has no minimum.'],
  ['Can I order from more than one place?', 'Yes. Your basket groups items by place, and each place shows its own delivery fee so you can see exactly what you pay for.'],
  ['How is tracking calculated?', 'Tracking is simulated. Each step advances after a few seconds, and you can skip ahead with the demo button. There is no live GPS or courier connection.'],
];

const CHAT_TOPICS = {
  where: 'Where is my order?',
  promo: 'My promo code isn\'t working',
  address: 'Change my delivery address',
  missing: 'An item is missing',
  human: 'Talk to a person',
};

function botReply(topic) {
  const active = state.orders.find(isActive);
  switch (topic) {
    case 'where':
      return active
        ? { text: `Your demo order ${active.id} is at “${TRACKING_STAGES[active.mode][active.stage]}”. You can follow every step on its tracking page.`, link: { href: `#/track/${active.id}`, label: 'Open tracking' } }
        : { text: 'You have no active demo orders right now. Once you place one, I can point you to its tracking page.', link: { href: '#/browse', label: 'Start an order' } };
    case 'promo':
      return { text: 'MANGO150 takes Rs. 150 off your subtotal. Check that:\n• your basket isn\'t empty\n• it isn\'t already applied\n• you haven\'t used it on an earlier demo order\n\nYou can reset demo data in Settings to use it again.' };
    case 'address':
      return { text: 'You can pick a different saved address from the “Deliver to” button at the top, or add a new one in your account.', link: { href: '#/account', label: 'Manage addresses' } };
    case 'missing':
      return { text: 'Sorry about that. Use the “Report an issue” form on this page, choose “Missing or incorrect item” and pick the order. It\'ll create a demo case reference.' };
    case 'human':
      return { text: 'There are no live agents in this prototype, so I can\'t transfer you. In a real launch this is where a support agent would join the chat.' };
    case 'hello':
      return { text: 'Hi! I\'m Mangi. Ask me about your order, promo codes or addresses — or tap one of the suggestions below.' };
    case 'thanks':
      return { text: 'You\'re welcome! Anything else?' };
    default:
      return { text: 'I\'m a demo assistant with a few pre-written answers. Try one of the suggestions below, or submit a report using the form.' };
  }
}
function detectTopic(text) {
  const t = text.toLowerCase();
  if (/(where|track|status|late|eta|arriv)/.test(t)) return 'where';
  if (/(promo|code|discount|mango150|coupon|voucher)/.test(t)) return 'promo';
  if (/(address|location|deliver to)/.test(t)) return 'address';
  if (/(missing|wrong|incorrect|cold|damaged)/.test(t)) return 'missing';
  if (/(human|agent|person|call|representative)/.test(t)) return 'human';
  if (/^(hi|hello|hey|salam|assalam|aoa)\b/.test(t)) return 'hello';
  if (/(thank|thx|shukria|jazak)/.test(t)) return 'thanks';
  return 'fallback';
}

function renderChat() {
  if (!state.chat.length) state.chat.push({ from: 'bot', ...botReply('hello'), ts: Date.now() });
  $('#chatLog').innerHTML = state.chat.map((m) => `<div class="msg ${m.from}">${esc(m.text)}${m.link ? `<div class="mt-2"><a class="btn btn-sm btn-outline-dark" href="${esc(m.link.href)}">${esc(m.link.label)}</a></div>` : ''}</div>`).join('');
  $('#chatQuick').innerHTML = Object.entries(CHAT_TOPICS).map(([k, label]) => `<button type="button" data-action="chat-topic" data-topic="${k}">${esc(label)}</button>`).join('');
  const log = $('#chatLog');
  log.scrollTop = log.scrollHeight;
}
function sendChat(text, topic) {
  const clean = text.trim().slice(0, 200);
  if (!clean) return;
  state.chat.push({ from: 'user', text: clean, ts: Date.now() });
  state.chat = state.chat.slice(-40);
  renderChat();
  const log = $('#chatLog');
  log.insertAdjacentHTML('beforeend', '<div class="msg bot typing" id="typing">Mangi is typing…</div>');
  log.scrollTop = log.scrollHeight;
  setTimeout(() => {
    state.chat.push({ from: 'bot', ...botReply(topic || detectTopic(clean)), ts: Date.now() });
    saveState();
    renderChat();
  }, 650);
}

function renderHelp() {
  document.title = 'Help — Mangao';
  const typeSel = $('#spType');
  if (typeSel.options.length <= 1) typeSel.insertAdjacentHTML('beforeend', SUPPORT_TYPES.map((t) => `<option>${esc(t)}</option>`).join(''));
  $('#spOrder').innerHTML = '<option value="">Not about a specific order</option>' + state.orders.map((o) => `<option value="${o.id}">${esc(o.id)} — ${esc(o.vendorIds.map((v) => vendorById(v)?.name).join(' + '))}, ${fmtDate(o.createdAt)}</option>`).join('');
  if (ui.route.query.order && orderById(ui.route.query.order)) {
    $('#spOrder').value = ui.route.query.order;
    if (!typeSel.value) typeSel.value = SUPPORT_TYPES[0];
  }
  $('#faq').innerHTML = FAQ.map(([q, a], i) => `<div class="accordion-item">
      <h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq${i}" aria-expanded="false" aria-controls="faq${i}">${esc(q)}</button></h3>
      <div id="faq${i}" class="accordion-collapse collapse" data-bs-parent="#faq"><div class="accordion-body">${esc(a)}</div></div>
    </div>`).join('');
  renderCases();
  renderChat();
}
function renderCases() {
  $('#supportConfirm').innerHTML = ui.lastCase
    ? `<div class="case-card" tabindex="-1" id="caseCard"><strong>Report recorded — case reference ${esc(ui.lastCase.id)}</strong><br>This is a prototype: your report is saved in this browser only and is not sent to a real support team, so no one will reply.</div>`
    : '';
  $('#supportCases').innerHTML = state.supportCases.length
    ? `<h3 class="h6 mt-4 mb-0">Your demo reports</h3><ul class="case-list">${state.supportCases.slice(0, 5).map((c) => `<li><span><strong>${esc(c.id)}</strong> · ${esc(c.type)}${c.orderId ? ` · ${esc(c.orderId)}` : ''}</span><span class="text-body-secondary">${fmtDate(c.createdAt)}</span></li>`).join('')}</ul>`
    : '';
}
function submitSupportIssue(e) {
  e.preventDefault();
  const form = $('#supportForm');
  clearErrors(form);
  const type = $('#spType'), desc = $('#spDesc');
  const errs = [];
  if (!type.value) errs.push({ el: type, msg: 'Choose what the issue is about.' });
  const d = desc.value.trim();
  if (!d) errs.push({ el: desc, msg: 'Describe the problem so it can be looked into.' });
  else if (d.length < 15) errs.push({ el: desc, msg: `Add a little more detail — at least 15 characters (you have ${d.length}).` });
  const box = $('#supportErrors');
  if (errs.length) {
    errs.forEach((x) => setError(x.el, x.msg));
    box.innerHTML = `<strong>To submit, please fill in:</strong><ul>${errs.map((x) => `<li>${esc(x.msg)}</li>`).join('')}</ul>`;
    box.hidden = false;
    errs[0].el.focus();
    return;
  }
  box.hidden = true;
  const c = { id: `CASE-${Math.floor(1000 + Math.random() * 9000)}`, type: type.value, orderId: $('#spOrder').value, description: d, createdAt: Date.now() };
  state.supportCases.unshift(c);
  ui.lastCase = c;
  saveState();
  form.reset();
  $('#spDescCount').textContent = '0 / 500';
  renderCases();
  $('#caseCard').focus();
  toast(`Demo report ${c.id} recorded`, { icon: 'bi-clipboard-check', type: 'ok' });
}

/* ============================================================= ROUTER */
const VIEW_FOR = { home: 'home', restaurants: 'vendors', shops: 'vendors', vendor: 'vendor', browse: 'browse', checkout: 'checkout', orders: 'orders', track: 'track', favourites: 'favourites', account: 'account', settings: 'settings', help: 'help', notfound: 'notfound' };
const TAB_FOR = { home: 'home', restaurants: 'home', shops: 'home', vendor: 'home', browse: 'browse', checkout: 'home', orders: 'orders', track: 'orders', favourites: 'favourites', account: 'account', settings: 'account', help: 'account' };

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs));
  const name = parts[0] || 'home';
  const params = {};
  if ((name === 'vendor' || name === 'track') && parts[1]) params.id = decodeURIComponent(parts[1]);
  return { name: VIEW_FOR[name] ? name : 'notfound', params, query };
}

function showView(viewName) {
  $$('.view').forEach((v) => { v.hidden = v.dataset.view !== viewName; });
}

function router() {
  const prev = ui.route.name;
  ui.route = parseHash();
  const r = ui.route;

  // Close any open overlay when navigating.
  ['#productModal', '#addressModal', '#confirmModal'].forEach((s) => bootstrap.Modal.getInstance(s)?.hide());
  bootstrap.Offcanvas.getInstance('#cartPanel')?.hide();

  if (r.name === 'browse') {
    if ('cat' in r.query) ui.activeCategory = CATEGORIES.some((c) => c.value === r.query.cat) ? r.query.cat : 'all';
    if ('q' in r.query) setSearch(r.query.q, { navigate: false });
  }
  if (r.name === 'vendor' && prev !== 'vendor') ui.vendorSearch = '';
  if (r.name === 'help' && prev !== 'help') ui.lastCase = null;

  showView(VIEW_FOR[r.name]);
  ({
    home: renderHome,
    restaurants: () => renderVendors('restaurant'),
    shops: () => renderVendors('shop'),
    vendor: () => renderVendor(r.params.id),
    browse: renderBrowse,
    checkout: () => renderCheckout(true),
    orders: renderOrders,
    track: () => renderTrack(r.params.id),
    favourites: renderFavourites,
    account: renderAccount,
    settings: renderSettings,
    help: renderHelp,
    notfound: () => { document.title = 'Not found — Mangao'; },
  })[r.name]();
  if (r.name === 'home') document.title = 'Mangao — Order it. Get it.';

  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === r.name || (a.dataset.nav === 'orders' && r.name === 'track');
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $$('.bottom-nav a').forEach((a) => {
    const on = a.dataset.tab === TAB_FOR[r.name];
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  refreshCartUI();
  paintMangi();
  if (prev !== r.name || r.name === 'vendor' || r.name === 'track') {
    window.scrollTo({ top: 0, behavior: 'auto' });
    // Move focus to main for screen readers, without scrolling.
    if (document.activeElement && document.activeElement !== document.body && !$('#appHeader').contains(document.activeElement)) $('#main').focus({ preventScroll: true });
  }
}

/* ====================================================== ORDER MODE */
function setOrderMode(mode) {
  if (mode !== 'delivery' && mode !== 'pickup') return;
  if (state.orderMode === mode) return;
  state.orderMode = mode;
  saveState();
  syncModeUI();
  refreshCartUI();
  if (ui.route.name === 'home') renderHome();
  if (ui.route.name === 'restaurants' || ui.route.name === 'shops') renderVendors(ui.route.name === 'shops' ? 'shop' : 'restaurant');
  if (ui.route.name === 'vendor') renderVendor(ui.route.params.id);
  if (ui.route.name === 'browse') renderBrowseResults();
  if (ui.route.name === 'favourites') renderFavourites();
  toast(mode === 'pickup' ? 'Switched to Pickup — no delivery fees or minimums' : 'Switched to Delivery', { icon: mode === 'pickup' ? 'bi-bag' : 'bi-bicycle' });
}
function syncModeUI() {
  $$('.mode-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.orderMode)));
  renderHeaderAddress();
}

/* ============================================================= EVENTS */
function bindEvents() {
  // Image load / failure → reveal photo or keep the illustrated tile.
  document.addEventListener('load', (e) => { if (e.target.classList?.contains('tile-img')) e.target.classList.add('loaded'); }, true);
  document.addEventListener('error', (e) => { if (e.target.classList?.contains('tile-img')) e.target.classList.add('failed'); }, true);

  // One delegated click handler for every repeated control.
  document.addEventListener('click', (e) => {
    const promoBtn = e.target.closest('[data-promo-apply]');
    if (promoBtn) {
      const input = document.getElementById(promoBtn.dataset.promoApply);
      applyPromo(input.value, document.getElementById(`${input.id}Msg`));
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, pid, oid, id } = el.dataset;
    switch (action) {
      case 'add': addToCart(pid); break;
      case 'inc': updateQuantity(pid, 1); break;
      case 'dec': updateQuantity(pid, -1); break;
      case 'remove': removeFromCart(pid); break;
      case 'clear-cart': confirmDialog('Clear your basket?', `This removes all ${plural(cartCount(), 'item')} from your basket.`, 'Clear basket', () => { clearCart(); toast('Basket cleared', { icon: 'bi-trash3' }); }); break;
      case 'remove-promo': removePromo(); break;
      case 'fav': e.preventDefault(); toggleFavourite(el.dataset.type, id, el); break;
      case 'open-product': openProduct(pid); break;
      case 'open-cart': openCart(); break;
      case 'go-checkout': closeCart(); location.hash = '#/checkout'; break;
      case 'go': closeCart(); location.hash = el.dataset.href; break;
      case 'popular-cat': ui.popularCat = el.dataset.cat; renderPopular(); break;
      case 'browse-cat': ui.activeCategory = el.dataset.cat; renderBrowse(); break;
      case 'clear-search': setSearch(''); $('#browseSearch').focus(); break;
      case 'vendor-kind': {
        const type = ui.route.name === 'shops' ? 'shop' : 'restaurant';
        ui.vendorFilters[type].kind = el.dataset.kind;
        renderVendors(type);
        break;
      }
      case 'reset-vfilters': {
        const type = ui.route.name === 'shops' ? 'shop' : 'restaurant';
        ui.vendorFilters[type] = { kind: 'All', lowFee: false, topRated: false, fast: false, sort: 'recommended' };
        renderVendors(type);
        break;
      }
      case 'jump-section': {
        $$('#vendorSections .chip').forEach((c) => c.classList.toggle('active', c === el));
        document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        break;
      }
      case 'clear-vendor-search': ui.vendorSearch = ''; $('#vendorSearch').value = ''; renderVendorMenu(vendorById(ui.route.params.id)); break;
      case 'use-address': {
        const a = state.addresses.find((x) => x.id === id);
        if (a) { $('#coAddress').value = a.line; $('#coArea').value = a.area; state.selectedAddressId = a.id; saveState(); renderHeaderAddress(); clearErrors($('#deliveryFields')); }
        break;
      }
      case 'focus-field': e.preventDefault(); document.getElementById(el.dataset.target)?.focus(); break;
      case 'reorder': reorder(oid); break;
      case 'advance': { const o = orderById(oid); if (o) advanceOrder(o, { manual: true }); break; }
      case 'cancel-order': {
        confirmDialog('Cancel this demo order?', 'You can cancel while the order hasn\'t started being prepared.', 'Cancel order', () => {
          const o = orderById(oid);
          if (o && o.stage === 0) { o.cancelled = true; o.nextAt = null; saveState(); onOrdersChanged(o.id); toast(`${o.id} cancelled`, { icon: 'bi-x-circle' }); }
        });
        break;
      }
      case 'rate': {
        const o = orderById(oid);
        if (o) { o.rating = Number(el.dataset.stars); saveState(); renderOrders(); toast(`Thanks — you rated this order ${o.rating} out of 5`, { icon: 'bi-star-fill' }); }
        break;
      }
      case 'clear-history':
        confirmDialog('Clear order history?', 'Completed and cancelled demo orders will be removed. Active orders stay.', 'Clear history', () => {
          state.orders = state.orders.filter(isActive);
          saveState();
          renderOrders();
          toast('Order history cleared', { icon: 'bi-trash3' });
        });
        break;
      case 'default-address':
        state.addresses.forEach((a) => { a.isDefault = a.id === id; });
        state.selectedAddressId = id;
        saveState(); renderAccount(); renderHeaderAddress();
        toast('Default address updated');
        break;
      case 'delete-address': {
        const a = state.addresses.find((x) => x.id === id);
        confirmDialog('Delete this address?', `${a.label}: ${a.line}, ${a.area}`, 'Delete', () => {
          state.addresses = state.addresses.filter((x) => x.id !== id);
          if (a.isDefault && state.addresses[0]) state.addresses[0].isDefault = true;
          if (state.selectedAddressId === id) state.selectedAddressId = state.addresses[0]?.id || null;
          saveState(); renderAccount(); renderHeaderAddress();
          toast('Address deleted', { icon: 'bi-trash3' });
        });
        break;
      }
      case 'chat-topic': sendChat(CHAT_TOPICS[el.dataset.topic], el.dataset.topic); break;
      default: break;
    }
  });

  // Header: order mode
  $$('.mode-btn').forEach((b) => {
    b.addEventListener('click', () => setOrderMode(b.dataset.mode));
    b.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const next = b.dataset.mode === 'delivery' ? 'pickup' : 'delivery';
        setOrderMode(next);
        $(`.mode-btn[data-mode="${next}"]`).focus();
      }
    });
  });
  $('#checkoutForm').addEventListener('change', (e) => {
    if (e.target.name === 'coMode') setOrderMode(e.target.value);
    if (e.target.name === 'coTip') { ui.tip = Number(e.target.value); renderCheckoutSummary(); }
  });

  // Search: header, hero, browse
  const onHeaderInput = debounce((v) => setSearch(v), 120);
  $('#headerSearch').addEventListener('input', (e) => onHeaderInput(e.target.value));
  $('#headerSearchForm').addEventListener('submit', (e) => { e.preventDefault(); setSearch($('#headerSearch').value); if (ui.route.name !== 'browse') location.hash = '#/browse'; });
  $('#headerSearchClear').addEventListener('click', () => { setSearch(''); $('#headerSearch').focus(); });
  $('#heroSearchForm').addEventListener('submit', (e) => { e.preventDefault(); setSearch($('#heroSearch').value, { navigate: false }); location.hash = '#/browse'; });
  $$('[data-quick]').forEach((b) => b.addEventListener('click', () => { setSearch(b.dataset.quick, { navigate: false }); ui.activeCategory = 'all'; location.hash = '#/browse'; }));
  $('#browseSearch').addEventListener('input', debounce((e) => setSearch(e.target.value), 100));
  $('#browseSearchForm').addEventListener('submit', (e) => e.preventDefault());
  $('#browseSearchClear').addEventListener('click', () => { setSearch(''); $('#browseSearch').focus(); });
  $('#productSort').addEventListener('change', (e) => { ui.productSort = e.target.value; renderBrowseResults(); });

  // Vendors
  $$('[data-vfilter]').forEach((b) => b.addEventListener('click', () => {
    const type = ui.route.name === 'shops' ? 'shop' : 'restaurant';
    const f = ui.vendorFilters[type];
    f[b.dataset.vfilter] = !f[b.dataset.vfilter];
    renderVendors(type);
  }));
  $('#vendorSort').addEventListener('change', (e) => {
    const type = ui.route.name === 'shops' ? 'shop' : 'restaurant';
    ui.vendorFilters[type].sort = e.target.value;
    renderVendors(type);
  });
  $('#vendorSearch').addEventListener('input', debounce((e) => { ui.vendorSearch = e.target.value; renderVendorMenu(vendorById(ui.route.params.id)); }, 120));

  // Cart: promo input Enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('#cartPromo, #coPromo')) {
      e.preventDefault();
      applyPromo(e.target.value, document.getElementById(`${e.target.id}Msg`));
    }
  });

  // Checkout
  $('#checkoutForm').addEventListener('submit', (e) => { e.preventDefault(); placeDemoOrder(); });
  $('#checkoutForm').addEventListener('input', (e) => {
    if (e.target.classList.contains('is-invalid')) {
      e.target.classList.remove('is-invalid');
      e.target.removeAttribute('aria-invalid');
      const fb = document.getElementById(`${e.target.id}Err`); if (fb) fb.textContent = '';
    }
    if (e.target.id === 'coNotes') $('#coNotesCount').textContent = `${e.target.value.length} / 200`;
  });

  // Account
  $('#profileForm').addEventListener('submit', saveProfile);
  $('#addressForm').addEventListener('submit', saveAddress);
  $('#addAddressToggle').addEventListener('click', () => toggleAddressForm($('#addressForm').hidden));
  $('#cancelAddress').addEventListener('click', () => { $('#addressForm').reset(); clearErrors($('#addressForm')); toggleAddressForm(false); });
  $('#addressModal').addEventListener('change', (e) => {
    if (e.target.name === 'addrPick') {
      state.selectedAddressId = e.target.value;
      saveState();
      renderHeaderAddress();
      refreshCartUI();
      if (ui.route.name === 'home') renderHome();
      bootstrap.Modal.getOrCreateInstance('#addressModal').hide();
      toast(`Delivering to ${selectedAddressText()}`, { icon: 'bi-geo-alt-fill' });
    }
  });

  // Orders & favourites tabs (arrow keys move between tabs)
  const bindTabs = (attr, key, render) => {
    $$(`[${attr}]`).forEach((t) => {
      t.addEventListener('click', () => { ui[key] = t.getAttribute(attr); render(); });
      t.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        const tabs = $$(`[${attr}]`);
        const next = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        ui[key] = next.getAttribute(attr); render(); next.focus();
      });
    });
  };
  bindTabs('data-otab', 'ordersTab', renderOrders);
  bindTabs('data-ftab', 'favTab', renderFavourites);

  // Help
  $('#supportForm').addEventListener('submit', submitSupportIssue);
  $('#spDesc').addEventListener('input', (e) => { $('#spDescCount').textContent = `${e.target.value.length} / 500`; });
  $('#supportForm').addEventListener('input', (e) => {
    if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); const fb = document.getElementById(`${e.target.id}Err`); if (fb) fb.textContent = ''; }
  });
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendChat($('#chatInput').value); $('#chatInput').value = ''; });

  // Promo banner copy
  $('#copyPromoBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('MANGO150'); toast('MANGO150 copied — paste it at checkout', { icon: 'bi-clipboard-check' }); }
    catch { toast('Code: MANGO150 — type it at checkout', { icon: 'bi-ticket-perforated' }); }
  });

  window.addEventListener('hashchange', router);
  // Keep other tabs in sync
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) { state = loadState(); applySettings(); syncModeUI(); router(); } });
}

/* =============================================================== BOOT */
function boot() {
  state = loadState();
  applySettings();
  bindEvents();
  bindSettings();
  paintMangi();
  syncModeUI();
  updateActiveDot();
  // Resume demo orders that were in progress before a reload.
  state.orders.filter((o) => isActive(o) && o.nextAt && o.nextAt < Date.now()).forEach((o) => { o.nextAt = Date.now() + 3000; });
  router();
}
document.addEventListener('DOMContentLoaded', boot);
