/* =========================================================================
   Mangao — application logic (vanilla JS + Bootstrap 5)
   Talks to the Mangao API (/api/*) for accounts, stores, menus, orders,
   favourites, addresses, promo codes, support and the partner/admin dashboards.
   Sections: utils · Mangi art · state · api · lookups · pricing · cart
             · favourites · renderers · views · checkout · orders/tracking
             · account · settings · help · auth · partner · admin · router · events · boot
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
/** Returns an inline SVG of Mangi. Moods change the face and small props only. */
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
// Device data (basket, display settings) is kept in localStorage.
// Account data (profile, addresses, favourites, orders, support) lives on the server, in `session`.
const STORAGE_KEY = 'mangao.v2';

function defaultState() {
  return {
    cart: [],                 // [{ productId, qty }]
    orderMode: 'delivery',
    promo: null,              // { code, amount } after the server has checked the code
    selectedAddressId: null,
    settings: { theme: 'light', photos: true, reduceMotion: false, defaultMode: 'delivery', defaultTip: 0, notifOrder: true, notifPromo: true },
  };
}

function loadState() {
  const base = defaultState();
  const saved = safeParse(localStorage.getItem(STORAGE_KEY), null);
  if (!saved) return base;
  const merged = { ...base, ...saved };
  merged.settings = { ...base.settings, ...(saved.settings || {}) };
  merged.cart = Array.isArray(saved.cart) ? saved.cart.filter((l) => l && typeof l.productId === 'string' && Number.isInteger(l.qty) && l.qty > 0) : [];
  merged.orderMode = merged.settings.defaultMode === 'pickup' ? 'pickup' : 'delivery';
  if (merged.promo && (typeof merged.promo.code !== 'string' || !Number.isFinite(merged.promo.amount))) merged.promo = null;
  return merged;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

let state = loadState();

const session = {
  user: null,
  favourites: { products: [], vendors: [] },
  addresses: [],
  orders: [],
  tickets: [],
  messages: [],
  partner: null,  // { store, products, orders } for partner accounts
  admin: null,    // overview data for admins
};

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
  authTab: 'login',
  partnerTab: 'orders',
  adminTab: 'orders',
  adminThread: null,
  tip: null,
  lastCase: null,
  pollTimer: null,
  catalogLoaded: false,
};

/* ------------------------------------------------------------------- api */
/** Call the Mangao API. Throws an Error with the server's message on failure. */
async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined || method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : method !== 'GET' ? '{}' : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Could not reach Mangao. Check your internet connection and try again.');
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    if (res.status === 401 && session.user) { session.user = null; renderAuthUI(); }
    throw err;
  }
  return data;
}

/** Run an API call and show any error as a toast. Returns null on failure. */
async function tryApi(path, opts) {
  try {
    return await api(path, opts);
  } catch (err) {
    toast(err.message, { icon: 'bi-exclamation-triangle-fill', type: 'err', ms: 4500 });
    return null;
  }
}

/* --------------------------------------------------------------- lookups */
let productMap = new Map();
let vendorMap = new Map();
function setCatalog(stores, products) {
  VENDORS = stores;
  PRODUCTS = products;
  productMap = new Map(PRODUCTS.map((p) => [p.id, p]));
  vendorMap = new Map(VENDORS.map((v) => [v.id, v]));
  // drop basket lines for items that no longer exist
  const before = state.cart.length;
  state.cart = state.cart.filter((l) => productMap.has(l.productId));
  if (state.cart.length !== before) saveState();
}
function productById(id) { return productMap.get(id) || null; }
function vendorById(id) { return vendorMap.get(id) || null; }
const categoryLabel = (value) => (CATEGORIES.find((c) => c.value === value) || {}).label || value;

function initials(name) {
  if (/^[A-Z0-9]{2,5}$/.test(name)) return name;
  const parts = name.split(/[\s.\-&]+/).filter(Boolean);
  return ((parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?')[0]) || '?').toUpperCase();
}
function isLight(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}
function vendorLogo(v) {
  const txt = initials(v.name);
  const color = /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : '#202124';
  const style = `background:${color};color:${isLight(color) ? '#202124' : '#fff'};${txt.length > 3 ? 'font-size:.78rem;' : ''}`;
  return `<span class="vendor-logo" style="${style}" aria-hidden="true">${esc(txt)}</span>`;
}
const etaText = (v) => (state.orderMode === 'pickup' ? `Ready in ~${Math.max(10, v.eta[0] - 10)} min` : `${v.eta[0]}–${v.eta[1]} min`);
const ratingCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n));
const ratingText = (v) => (v.ratings ? `${Number(v.rating).toFixed(1)}` : 'New');
const isLoggedIn = () => Boolean(session.user);

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
  return [...groups.values()].filter((g) => g.vendor);
}

/** Delivery fee for one store: waived above that store's free-delivery threshold. (Same rule as the server.) */
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
/** Promo discount: the code's amount, never more than the subtotal. */
function calculateDiscount(subtotal = calculateSubtotal()) {
  if (!state.promo || subtotal <= 0) return 0;
  return Math.min(state.promo.amount, subtotal);
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
/** Stores whose delivery minimum isn't met (pickup has no minimum). */
function minimumShortfalls() {
  if (state.orderMode === 'pickup') return [];
  return groupByVendor()
    .filter((g) => g.subtotal < g.vendor.minOrder)
    .map((g) => ({ vendor: g.vendor, short: g.vendor.minOrder - g.subtotal }));
}
/** Problems that stop checkout: closed stores or sold-out items. */
function basketProblems() {
  const problems = [];
  cartLines().forEach((l) => {
    const v = vendorById(l.product.vendorId);
    if (!l.product.available) problems.push(`${l.product.name} is sold out. Remove it to continue.`);
    else if (v && !v.isOpen) problems.push(`${v.name} is closed right now. Remove its items to continue.`);
  });
  return [...new Set(problems)];
}

/* ------------------------------------------------------------------ cart */
function addToCart(pid, qty = 1, { silent = false } = {}) {
  const p = productById(pid);
  if (!p || !p.available) return;
  const v = vendorById(p.vendorId);
  if (v && !v.isOpen) { toast(`${v.name} is closed right now.`, { icon: 'bi-clock', type: 'err' }); return; }
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

/** Check a promo code with the server. `msgEl` receives inline feedback. */
async function applyPromo(raw, msgEl) {
  const code = String(raw || '').trim().toUpperCase();
  const say = (text, ok) => {
    if (msgEl) { msgEl.textContent = text; msgEl.className = `promo-msg ${ok ? 'ok' : 'err'}`; }
    announce(text);
  };
  if (!code) { say('Enter a promo code first.', false); return false; }
  if (!state.cart.length) { say('Add something to your basket before applying a code.', false); return false; }
  if (!isLoggedIn()) { say('Log in to use a promo code.', false); goLogin('Log in to use a promo code.'); return false; }
  if (state.promo && state.promo.code === code) { say(`${code} is already applied to this basket.`, false); return false; }
  try {
    const res = await api('/promo/check', { method: 'POST', body: { code } });
    state.promo = { code: res.code, amount: res.amount };
    saveState();
    refreshCartUI();
    say(`${res.code} applied: ${rs(calculateDiscount())} off your subtotal.`, true);
    toast(`${res.code} applied — you save ${rs(calculateDiscount())}`, { icon: 'bi-ticket-perforated', type: 'ok' });
    return true;
  } catch (err) {
    say(err.message, false);
    return false;
  }
}
function removePromo() {
  state.promo = null;
  saveState();
  refreshCartUI();
  announce('Promo code removed');
}

/* ------------------------------------------------------------ favourites */
function isFav(type, id) { return session.favourites[type].includes(id); }
async function toggleFavourite(type, id, btn) {
  if (!isLoggedIn()) { goLogin('Log in to save favourites.'); return; }
  const res = await tryApi('/favourites', { method: 'POST', body: { kind: type, id } });
  if (!res) return;
  const list = session.favourites[type];
  const idx = list.indexOf(id);
  if (res.on && idx === -1) list.push(id);
  if (!res.on && idx !== -1) list.splice(idx, 1);
  const on = res.on;
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
  const v = vendorById(p.vendorId);
  if (!p.available) return `<button type="button" class="add-btn" disabled aria-label="${esc(p.name)} is sold out">Sold out</button>`;
  if (v && !v.isOpen) return `<button type="button" class="add-btn" disabled aria-label="${esc(v.name)} is closed">Closed</button>`;
  const qty = cartQty(p.id);
  if (!qty) {
    return `<button type="button" class="add-btn" data-action="add" data-pid="${esc(p.id)}" aria-label="Add ${esc(p.name)} to basket"><i class="bi bi-plus-lg" aria-hidden="true"></i><span class="lbl">Add</span></button>`;
  }
  const left = qty === 1
    ? `<button type="button" data-action="remove" data-pid="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from basket"><i class="bi bi-trash3" aria-hidden="true"></i></button>`
    : `<button type="button" data-action="dec" data-pid="${esc(p.id)}" aria-label="Decrease quantity of ${esc(p.name)}"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>`;
  return `<div class="stepper ${size}" role="group" aria-label="Quantity of ${esc(p.name)}">
    ${left}<span class="qty" aria-live="polite">${qty}</span>
    <button type="button" data-action="inc" data-pid="${esc(p.id)}" aria-label="Increase quantity of ${esc(p.name)}"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
  </div>`;
}

function productCard(p) {
  const v = vendorById(p.vendorId);
  if (!v) return '';
  const badges = [p.featured ? '<span class="p-badge">Popular</span>' : '', p.isNew ? '<span class="p-badge new">New</span>' : ''].join('');
  return `<article class="product-card" data-pid="${esc(p.id)}">
    ${badges ? `<div class="badge-row">${badges}</div>` : ''}
    ${favButton('products', p.id, p.name)}
    ${imgTile(p.image, p.category, p.name, { tag: 'button', attrs: `type="button" data-action="open-product" data-pid="${esc(p.id)}" aria-label="View details for ${esc(p.name)}"` })}
    ${!p.available ? '<div class="sold-out" aria-hidden="true"><span>Sold out</span></div>' : ''}
    <div class="p-body">
      <a class="p-vendor" href="#/vendor/${esc(v.id)}">${esc(v.name)} <span class="p-cat">${esc(categoryLabel(p.category))}</span></a>
      <h3 class="p-name"><button type="button" data-action="open-product" data-pid="${esc(p.id)}">${esc(p.name)}</button></h3>
      <p class="p-desc">${esc(p.description)}</p>
      <div class="p-foot">
        <span class="p-price">${rs(p.price)}</span>
        <div class="p-action" data-pid="${esc(p.id)}">${actionHTML(p)}</div>
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
  const badge = !v.isOpen ? 'Closed now' : v.deliveryFee === 0 ? 'Free delivery' : v.featured ? 'Popular' : '';
  return `<article class="vendor-card ${v.isOpen ? '' : 'is-closed'}">
    <a class="vendor-link" href="#/vendor/${esc(v.id)}" aria-label="${esc(v.name)}${v.isOpen ? '' : ', closed now'}, rated ${ratingText(v)}, ${esc(etaText(v))}"></a>
    ${badge ? `<span class="deal-badge">${badge}</span>` : ''}
    ${favButton('vendors', v.id, v.name)}
    ${imgTile(v.cover, v.type === 'shop' ? 'shop' : 'food', '')}
    <div class="vendor-body">
      ${vendorLogo(v)}
      <h3 class="vendor-name"><span>${esc(v.name)}</span><span class="vendor-rating"><i class="bi bi-star-fill" aria-hidden="true"></i> ${ratingText(v)} ${v.ratings ? `<small>(${ratingCount(v.ratings)})</small>` : ''}</span></h3>
      <p class="vendor-tags mb-2">${esc((v.tags || []).join(', '))} · ${esc(v.area)}</p>
      <div class="vendor-meta"><span><i class="bi bi-clock" aria-hidden="true"></i>${esc(etaText(v))}</span>${fee}</div>
      ${v.isDemo ? '<p class="demo-tag"><i class="bi bi-info-circle" aria-hidden="true"></i>Demo listing · not affiliated</p>' : ''}
    </div>
  </article>`;
}

function emptyState({ mood = 'happy', title, text, actions = '' }) {
  return `<div class="empty-state">${mangiBlock(mood)}<h2>${esc(title)}</h2><p>${esc(text)}</p>${actions}</div>`;
}
const loadingState = (text = 'Loading…') => `<div class="empty-state"><div class="spinner-border text-warning" role="status"><span class="visually-hidden">${esc(text)}</span></div><p class="mt-3">${esc(text)}</p></div>`;

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
      (el.querySelector(`[data-action="${focused}"]:not(:disabled)`) || el.querySelector('[data-action="inc"]') || el.querySelector('button'))?.focus();
    }
  });

  // Mobile basket bar
  const bar = $('#basketBar');
  const showBar = count > 0 && !['checkout', 'track', 'partner', 'admin', 'login'].includes(ui.route.name);
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
    : `<li><span>Delivery fee<span class="muted">Charged by each place</span></span><span>${fee === 0 ? 'Free' : rs(fee)}</span></li>`;
  return `<ul class="totals">
    <li><span>Subtotal</span><span>${rs(subtotal)}</span></li>
    ${feeLine}
    ${discount ? `<li class="discount"><span>Discount (${esc(state.promo.code)})</span><span>− ${rs(discount)}</span></li>` : ''}
    ${includeTip && state.orderMode === 'delivery' ? `<li><span>Rider tip</span><span>${rs(tip)}</span></li>` : ''}
    <li><span>Service fee</span><span>${rs(0)}</span></li>
    <li class="grand"><span>Total</span><span>${rs(calculateTotal({ includeTip }))}</span></li>
  </ul>`;
}

function promoBlockHTML(inputId) {
  if (state.promo) {
    return `<div class="promo-applied"><span><i class="bi bi-ticket-perforated me-1" aria-hidden="true"></i><strong>${esc(state.promo.code)}</strong> applied</span><button type="button" data-action="remove-promo">Remove</button></div>`;
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
      <div class="cart-line-unit">${rs(p.price)} each${p.available ? '' : ' · <strong class="text-danger">Sold out</strong>'}</div>
      <button type="button" class="remove-link" data-action="remove" data-pid="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from basket">Remove</button>
    </div>
    <div class="cart-line-right">
      <span class="cart-line-total">${rs(p.price * l.qty)}</span>
      <div class="stepper light" role="group" aria-label="Quantity of ${esc(p.name)}">
        <button type="button" data-action="dec" data-pid="${esc(p.id)}" aria-label="Decrease quantity of ${esc(p.name)}" ${l.qty <= 1 ? 'disabled' : ''}><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
        <span class="qty">${l.qty}</span>
        <button type="button" data-action="inc" data-pid="${esc(p.id)}" aria-label="Increase quantity of ${esc(p.name)}"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
      </div>
    </div>
  </div>`;
}

function renderCart() {
  const panel = $('#cartPanel');
  const active = document.activeElement;
  const refocus = panel.contains(active) && active !== panel
    ? (active.dataset.action && active.dataset.pid ? `[data-action="${active.dataset.action}"][data-pid="${CSS.escape(active.dataset.pid)}"]` : active.id ? `#${active.id}` : '')
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
  const problems = basketProblems();
  body.innerHTML = groups.map((g) => {
    const fee = feeFor(g.vendor, g.subtotal);
    const short = shortfalls.find((s) => s.vendor.id === g.vendor.id);
    const feeNote = !g.vendor.isOpen ? 'Closed now' : state.orderMode === 'pickup' ? 'Pickup' : fee === 0 ? 'Free delivery' : `${rs(fee)} delivery${g.vendor.freeDeliveryOver ? ` · add ${rs(g.vendor.freeDeliveryOver - g.subtotal)} for free delivery` : ''}`;
    return `<section class="cart-group" aria-label="${esc(g.vendor.name)} items">
      <div class="cart-group-head">${vendorLogo(g.vendor)}<div><a href="#/vendor/${esc(g.vendor.id)}">${esc(g.vendor.name)}</a><small>${esc(feeNote)}</small></div></div>
      ${g.lines.map(cartLineHTML).join('')}
      ${short ? `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>Add ${rs(short.short)} more from ${esc(g.vendor.name)} to reach its ${rs(g.vendor.minOrder)} delivery minimum, or switch to Pickup.</span></p>` : ''}
    </section>`;
  }).join('') + problems.map((t) => `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>${esc(t)}</span></p>`).join('')
    + '<button type="button" class="remove-link" data-action="clear-cart">Clear basket</button>';

  const blocked = shortfalls.length || problems.length;
  footer.innerHTML = `${promoBlockHTML('cartPromo')}
    <div class="mt-3">${totalsHTML()}</div>
    <button type="button" class="btn btn-mango btn-lg w-100 mt-3" data-action="go-checkout" ${blocked ? 'disabled aria-describedby="cartBlockNote"' : ''}>Go to checkout</button>
    ${blocked ? '<p class="tiny-note text-center" id="cartBlockNote">Fix the notes above to continue.</p>' : ''}`;
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

/* Disable a button and show a spinner while an async task runs. */
async function withBusy(btn, label, task) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> ${esc(label)}`;
  try {
    return await task();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
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

  const sortV = (a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.featured) - Number(a.featured) || b.rating - a.rating;
  const rest = VENDORS.filter((v) => v.type === 'restaurant').sort(sortV);
  const shops = VENDORS.filter((v) => v.type === 'shop').sort(sortV);
  $('#homeRestaurants').innerHTML = rest.slice(0, 8).map(vendorCard).join('') || '<p class="text-body-secondary">No restaurants yet.</p>';
  $('#homeShops').innerHTML = shops.slice(0, 8).map(vendorCard).join('') || '<p class="text-body-secondary">No shops yet.</p>';

  renderPopular();
  renderOrderAgain();
  $('.promo-banner').hidden = !state.settings.notifPromo;
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
  const past = session.orders.filter((o) => ['delivered', 'collected'].includes(o.status)).slice(0, 4);
  $('#orderAgainBlock').hidden = !past.length;
  $('#orderAgainList').innerHTML = past.map((o) => `<article class="order-card mb-0">
      <div class="order-vendors"><span class="logo-stack">${vendorById(o.storeId) ? vendorLogo(vendorById(o.storeId)) : ''}</span>
        <div><p class="order-title">${esc(o.storeName)}</p><span class="order-meta">${fmtDate(o.createdAt)}</span></div></div>
      <p class="order-items">${esc(itemsSummary(o))}</p>
      <div class="order-actions"><span class="order-total">${rs(o.total)}</span><button type="button" class="btn btn-sm btn-dark" data-action="reorder" data-oid="${esc(o.id)}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button></div>
    </article>`).join('');
}

/* ---------------- Restaurants / Shops */
function renderVendors(type) {
  const f = ui.vendorFilters[type];
  const all = VENDORS.filter((v) => v.type === type);
  const isRest = type === 'restaurant';
  $('#vendorsTitle').textContent = isRest ? 'Restaurants' : 'Shops and supermarkets';
  $('#vendorsSub').textContent = isRest
    ? 'Burgers, pizza, karahi, biryani and coffee from around Lahore.'
    : 'Supermarkets, pharmacies and bakeries for your weekly shop.';
  document.title = `${isRest ? 'Restaurants' : 'Shops'} — Mangao`;

  const kinds = ['All', ...new Set(all.map((v) => v.kind))];
  if (!kinds.includes(f.kind)) f.kind = 'All';
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
    recommended: (a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.featured) - Number(a.featured) || b.rating - a.rating,
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

/* ---------------- Store page */
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
          <p class="page-sub">${esc((v.tags || []).join(', '))} · ${esc(v.area)}, Lahore</p>
          <div class="vendor-pills">
            ${v.isOpen ? '' : '<span class="v-pill closed-pill"><i class="bi bi-moon" aria-hidden="true"></i>Closed now</span>'}
            <span class="v-pill"><i class="bi bi-star-fill" aria-hidden="true"></i>${ratingText(v)} <span class="text-body-secondary fw-normal">(${v.ratings ? `${ratingCount(v.ratings)} ratings` : 'no ratings yet'})</span></span>
            <span class="v-pill"><i class="bi bi-clock" aria-hidden="true"></i>${esc(etaText(v))}</span>
            <span class="v-pill"><i class="bi bi-bicycle" aria-hidden="true"></i>${esc(fee)}</span>
            ${state.orderMode === 'delivery' && v.minOrder ? `<span class="v-pill"><i class="bi bi-basket" aria-hidden="true"></i>Min. ${rs(v.minOrder)}</span>` : ''}
            ${v.freeDeliveryOver && state.orderMode === 'delivery' ? `<span class="v-pill"><i class="bi bi-gift" aria-hidden="true"></i>Free delivery over ${rs(v.freeDeliveryOver)}</span>` : ''}
          </div>
          ${v.isDemo ? `<p class="demo-tag mt-3 mb-0"><i class="bi bi-info-circle" aria-hidden="true"></i>Demo listing: ${esc(v.name)} is used as a sample menu and is not affiliated with Mangao. Orders are handled by the Mangao team.</p>` : ''}
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
    $('#vendorMenu').innerHTML = q
      ? emptyState({ mood: 'sad', title: `No items match “${ui.vendorSearch}”`, text: `Try a different word, or browse the full ${v.name} menu.`, actions: '<button type="button" class="btn btn-mango" data-action="clear-vendor-search">Show full menu</button>' })
      : emptyState({ title: 'The menu is coming soon', text: `${v.name} hasn't added items yet.` });
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
      <h3 class="p-name"><button type="button" data-action="open-product" data-pid="${esc(p.id)}">${esc(p.name)}</button>${p.isNew ? ' <span class="p-badge new">New</span>' : ''}</h3>
      <p class="p-desc">${esc(p.description)}</p>
      <div class="p-foot justify-content-start gap-2">
        <span class="p-price">${rs(p.price)}</span>
        ${!p.available ? '<span class="p-cat">Sold out</span>' : ''}
        ${favButton('products', p.id, p.name, 'fav-mini')}
      </div>
    </div>
    ${imgTile(p.image, p.category, p.name, { tag: 'button', attrs: `type="button" data-action="open-product" data-pid="${esc(p.id)}" aria-label="View details for ${esc(p.name)}"` })}
    <div class="menu-actions p-action" data-pid="${esc(p.id)}">${actionHTML(p)}</div>
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
    return [p.name, categoryLabel(p.category), p.category, p.section, p.description, v?.name, v?.kind].join(' ').toLowerCase().includes(q);
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
  const vendors = vq ? VENDORS.filter((v) => `${v.name} ${v.kind} ${(v.tags || []).join(' ')}`.toLowerCase().includes(vq)) : [];
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
  settleImages();
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
  const canAdd = p.available && v && v.isOpen;
  const box = $('#productModalContent');
  box.innerHTML = `
    <button type="button" class="btn-close-float" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
    ${imgTile(p.image, p.category, p.name)}
    <div class="pm-body">
      <a class="p-vendor" href="#/vendor/${esc(v.id)}">${esc(v.name)} <span class="p-cat">${esc(categoryLabel(p.category))}</span></a>
      <h2 class="h4 mt-1 mb-1" id="pmTitle">${esc(p.name)}</h2>
      <p class="text-body-secondary mb-2">${esc(p.description)}</p>
      <p class="p-price fs-5 mb-0">${rs(p.price)}</p>
      ${canAdd ? `<div class="pm-foot">
        <div class="stepper light" role="group" aria-label="Quantity">
          <button type="button" id="pmDec" aria-label="Decrease quantity"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
          <span class="qty" id="pmQty" aria-live="polite">${qty}</span>
          <button type="button" id="pmInc" aria-label="Increase quantity"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
        </div>
        <button type="button" class="btn btn-mango" id="pmAdd"></button>
      </div>` : `<p class="min-warn mt-3"><i class="bi bi-x-circle" aria-hidden="true"></i><span>${p.available ? `${esc(v.name)} is closed right now.` : 'This item is sold out right now.'}</span></p>`}
    </div>`;
  const paint = () => {
    const qEl = $('#pmQty'); if (!qEl) return;
    qEl.textContent = qty;
    $('#pmDec').disabled = qty <= 1;
    $('#pmAdd').textContent = `${inCart ? 'Update basket' : 'Add to basket'} · ${rs(p.price * qty)}`;
  };
  if (canAdd) {
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
    ? emptyState({ title: 'Nothing to check out yet', text: 'Your basket is empty. Add a few things and come back here to place your order.', actions: '<a href="#/browse" class="btn btn-mango">Browse products</a>' })
    : '';
  if (empty) return;

  if (full) {
    // Prefill contact and address from the account once per visit.
    const u = session.user || {};
    if (!$('#coName').value) $('#coName').value = u.name || '';
    if (!$('#coPhone').value) $('#coPhone').value = u.phone || '';
    if (!$('#coEmail').value) $('#coEmail').value = u.email || '';
    const addr = selectedAddress();
    const areaSel = $('#coArea');
    if (areaSel.options.length <= 1) areaSel.insertAdjacentHTML('beforeend', LAHORE_AREAS.map((a) => `<option>${esc(a)}</option>`).join(''));
    if (addr && !$('#coAddress').value) { $('#coAddress').value = addr.line; areaSel.value = addr.area; }
    $('#coWhen').innerHTML = whenOptions().map((o) => `<option>${esc(o)}</option>`).join('');
    $('#savedAddrPicker').innerHTML = session.addresses.map((a) => `<button type="button" class="chip" data-action="use-address" data-id="${a.id}"><i class="bi bi-geo-alt" aria-hidden="true"></i>${esc(a.label)}</button>`).join('');
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
  $('#pickupInfo').innerHTML = `<strong>Pickup points</strong><ul class="mb-0 mt-1 ps-3">${groupByVendor().map((g) => `<li>${esc(g.vendor.name)}, ${esc(g.vendor.area)} — ready in about ${Math.max(10, g.vendor.eta[0] - 10)} min</li>`).join('')}</ul>`;
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
    + `<div class="mt-2">${totalsHTML({ includeTip: true })}</div>`
    + (groups.length > 1 ? `<p class="tiny-note">Each place prepares its part separately, so you'll get ${groups.length} order numbers to track.</p>` : '');
  const blocked = [...minimumShortfalls().map((s) => `Add ${rs(s.short)} more from ${s.vendor.name} for delivery, or switch to Pickup.`), ...basketProblems()];
  $('#placeOrderBtn').textContent = `Place order · ${rs(calculateTotal({ includeTip: true }))}`;
  if (blocked.length) {
    $('#checkoutSummary').insertAdjacentHTML('beforeend', blocked.map((t) => `<p class="min-warn"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>${esc(t)}</span></p>`).join(''));
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
function clearFieldError(e) {
  if (e.target.classList?.contains('is-invalid')) {
    e.target.classList.remove('is-invalid');
    e.target.removeAttribute('aria-invalid');
    const fb = document.getElementById(`${e.target.id}Err`);
    if (fb) fb.textContent = '';
  }
}

/** Validates name + contact. Returns [{ el, msg }]. Shared by checkout, sign-up and profile. */
function validateContact(nameEl, phoneEl, emailEl, { requireContact = true } = {}) {
  const errs = [];
  const name = nameEl.value.trim();
  if (!name) errs.push({ el: nameEl, msg: 'Enter your name.' });
  else if (name.length < 2) errs.push({ el: nameEl, msg: 'Your name should be at least 2 characters.' });
  const phone = normPhone(phoneEl.value.trim());
  const email = emailEl ? emailEl.value.trim() : '';
  if (requireContact && !phone && !email) errs.push({ el: phoneEl, msg: 'Add a mobile number or an email so you can be reached about the order.' });
  if (phone && !PHONE_RE.test(phone)) errs.push({ el: phoneEl, msg: 'Enter a Pakistani mobile number like 0300 1234567.' });
  if (email && !EMAIL_RE.test(email)) errs.push({ el: emailEl, msg: 'Enter an email like name@example.com.' });
  return errs;
}

function showFormErrors(summaryEl, errs, extra = []) {
  errs.forEach((e) => setError(e.el, e.msg));
  if (!errs.length && !extra.length) { summaryEl.hidden = true; return false; }
  summaryEl.innerHTML = `<strong>Please fix ${plural(errs.length + extra.length, 'thing')}:</strong><ul>${
    errs.map((e) => `<li><a href="#${e.el.id}" data-action="focus-field" data-target="${e.el.id}">${esc(e.msg)}</a></li>`).join('')}${
    extra.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  summaryEl.hidden = false;
  (errs[0] ? errs[0].el : summaryEl).focus();
  if (errs[0]) errs[0].el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  return true;
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
  const extra = [
    ...minimumShortfalls().map((s) => `Add ${rs(s.short)} more from ${s.vendor.name} to reach its delivery minimum, or switch to Pickup.`),
    ...basketProblems(),
  ];
  return !showFormErrors($('#checkoutErrors'), errs, extra);
}

async function placeOrder() {
  if (!state.cart.length) return;
  if (!isLoggedIn()) { goLogin('Log in to place your order. Your basket is saved.'); return; }
  if (!validateCheckout()) { announce('Some details need fixing before you can place the order.'); return; }
  const btn = $('#placeOrderBtn');
  const pickup = state.orderMode === 'pickup';
  const body = {
    mode: state.orderMode,
    items: state.cart.map((l) => ({ productId: l.productId, qty: l.qty })),
    contact: { name: $('#coName').value.trim(), phone: $('#coPhone').value.trim(), email: $('#coEmail').value.trim() },
    address: pickup ? '' : $('#coAddress').value.trim(),
    area: pickup ? '' : $('#coArea').value,
    riderNote: $('#coRiderNote').value.trim(),
    pickupNote: $('#coPickupNote').value.trim(),
    saveAddress: !pickup && $('#coSaveAddr').checked,
    payment: ($('input[name="coPay"]:checked') || {}).value || 'Cash',
    when: $('#coWhen').value,
    notes: $('#coNotes').value.trim(),
    tip: currentTip(),
    promo: state.promo ? state.promo.code : '',
  };
  try {
    const res = await withBusy(btn, 'Placing order…', () => api('/orders', { method: 'POST', body }));
    session.orders = [...res.orders, ...session.orders];
    state.cart = [];
    state.promo = null;
    ui.tip = null;
    saveState();
    $('#checkoutForm').reset();
    refreshCartUI();
    updateActiveDot();
    loadAddresses();
    if (res.orders.length > 1) {
      ui.ordersTab = 'active';
      location.hash = '#/orders';
      toast(`${res.orders.length} orders placed — one for each place`, { icon: 'bi-bag-check-fill', type: 'ok', ms: 4500 });
    } else {
      location.hash = `#/track/${res.orders[0].id}`;
      toast(`Order ${res.orders[0].id} placed`, { icon: 'bi-bag-check-fill', type: 'ok' });
    }
  } catch (err) {
    const summary = $('#checkoutErrors');
    summary.innerHTML = `<strong>Your order wasn't placed.</strong> ${esc(err.message)}`;
    summary.hidden = false;
    summary.focus();
    if (err.status === 400) loadCatalog(); // menus or prices may have changed
  }
}

/* ===================================================== ORDERS & TRACKING */
const itemsSummary = (o) => {
  const parts = o.items.map((i) => `${i.qty}× ${i.name}`);
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} and ${parts.length - 3} more` : parts.join(', ');
};
const isActive = (o) => !FINAL_STATUSES.includes(o.status);
const orderById = (id) => session.orders.find((o) => o.id === id);
const statusClass = (s) => (['delivered', 'collected'].includes(s) ? 'done' : ['cancelled', 'rejected'].includes(s) ? 'stopped' : '');

async function loadOrders() {
  if (!isLoggedIn()) { session.orders = []; return; }
  const res = await tryApi('/orders');
  if (res) {
    const before = new Map(session.orders.map((o) => [o.id, o.status]));
    session.orders = res.orders;
    // Tell the customer when one of their orders moves on.
    if (state.settings.notifOrder && before.size) {
      res.orders.forEach((o) => {
        const was = before.get(o.id);
        if (was && was !== o.status) toast(`${o.storeName}: ${STATUS_LABEL[o.status]}`, { icon: 'bi-bell-fill', action: ui.route.name === 'track' ? null : { label: 'Track', run: () => { location.hash = `#/track/${o.id}`; } } });
      });
    }
  }
  updateActiveDot();
}

function updateActiveDot() {
  $('#activeOrdersDot').hidden = !session.orders.some(isActive);
}

function orderCard(o) {
  const v = vendorById(o.storeId);
  const done = !isActive(o);
  const flow = ORDER_FLOW[o.mode];
  const rating = ['delivered', 'collected'].includes(o.status)
    ? `<div class="rate-row" role="group" aria-label="Rate this order">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= (o.rating || 0) ? 'on' : ''}" data-action="rate" data-oid="${esc(o.id)}" data-stars="${n}" aria-label="Rate ${n} out of 5" aria-pressed="${n <= (o.rating || 0)}"><i class="bi bi-star-fill" aria-hidden="true"></i></button>`).join('')}</div>`
    : '';
  return `<article class="order-card">
    <div class="order-top">
      <div class="order-vendors"><span class="logo-stack">${v ? vendorLogo(v) : ''}</span>
        <div><p class="order-title">${esc(o.storeName)}</p>
        <span class="order-meta">${esc(o.id)} · ${fmtDate(o.createdAt)} · ${o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</span></div></div>
      <span class="status-tag ${statusClass(o.status)}">${esc(STATUS_LABEL[o.status] || o.status)}</span>
    </div>
    <p class="order-items">${esc(itemsSummary(o))}</p>
    ${isActive(o) ? `<div class="mini-progress" aria-hidden="true"><span style="width:${((flow.indexOf(o.status) + 1) / flow.length) * 100}%"></span></div>` : ''}
    <div class="order-actions mt-3">
      <span class="order-total">${rs(o.total)}</span>
      <div class="btns">
        ${rating}
        <a href="#/track/${esc(o.id)}" class="btn btn-sm ${isActive(o) ? 'btn-dark' : 'btn-outline-dark'}">${isActive(o) ? '<i class="bi bi-geo" aria-hidden="true"></i>Track' : 'Details'}</a>
        ${done ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="reorder" data-oid="${esc(o.id)}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button>` : ''}
        <a href="#/help?order=${esc(o.id)}" class="btn btn-sm btn-outline-dark">Get help</a>
      </div>
    </div>
  </article>`;
}

function renderOrders() {
  document.title = 'Orders — Mangao';
  const active = session.orders.filter(isActive);
  const past = session.orders.filter((o) => !isActive(o));
  $('#activeCount').textContent = active.length;
  $('#pastCount').textContent = past.length;
  $$('[data-otab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.otab === ui.ordersTab)));
  $('#ordersActive').hidden = ui.ordersTab !== 'active';
  $('#ordersPast').hidden = ui.ordersTab !== 'past';
  $('#ordersActive').innerHTML = active.length
    ? active.map(orderCard).join('')
    : emptyState({ title: 'No orders on the way', text: 'When you place an order, you can follow each step of it here.', actions: '<a href="#/browse" class="btn btn-mango">Start an order</a>' });
  $('#ordersPast').innerHTML = past.length
    ? past.map(orderCard).join('')
    : emptyState({ title: 'No past orders yet', text: 'Orders appear here once they are delivered, collected or cancelled.', actions: '<a href="#/browse" class="btn btn-mango">Browse products</a>' });
}

function renderTrack(id) {
  const o = orderById(id);
  const body = $('#trackBody');
  if (!o) {
    body.innerHTML = emptyState({ mood: 'sad', title: `We couldn't find order ${id}`, text: 'Check the order number, or see all your orders.', actions: '<a href="#/orders" class="btn btn-mango">See your orders</a>' });
    return;
  }
  document.title = `Tracking ${o.id} — Mangao`;
  const flow = ORDER_FLOW[o.mode];
  const stopped = ['cancelled', 'rejected'].includes(o.status);
  const idx = flow.indexOf(o.status);
  const eventTime = (s) => { const e = o.events.find((x) => x.status === s); return e ? fmtTime(e.at) : ''; };
  const siblings = session.orders.filter((x) => x.checkoutId === o.checkoutId && x.id !== o.id);
  const eta = isActive(o) ? `<p class="mt-2"><i class="bi bi-clock me-1" aria-hidden="true"></i>${o.mode === 'pickup' ? 'Usually ready in' : 'Usually arrives in'} about ${o.mode === 'pickup' ? Math.max(10, (o.storeEta || 30) - 15) : o.storeEta || 40} min from when it's accepted</p>` : '';
  const lastNote = [...o.events].reverse().find((e) => e.note);

  body.innerHTML = `
    <div class="track-head">
      <div><h1 id="trackTitle">Order ${esc(o.id)}</h1><p class="page-sub">${fmtDate(o.createdAt)} · ${esc(o.storeName)}</p></div>
      ${isActive(o) ? '<span class="sim-badge live"><span class="live-dot" aria-hidden="true"></span>Live · updates automatically</span>' : ''}
    </div>
    <div class="track-hero" role="status" aria-live="polite">
      <div><h2>${esc(STATUS_LABEL[o.status])}</h2><p>${esc(STATUS_TEXT[o.status])}</p>${lastNote ? `<p class="mt-1">Note: ${esc(lastNote.note)}</p>` : ''}${eta}</div>
      <div class="track-mangi" aria-hidden="true">${mangiSVG(stopped ? 'sad' : ['delivered', 'collected'].includes(o.status) ? 'wave' : 'ride').replace('role="img"', 'aria-hidden="true"')}</div>
    </div>
    ${stopped ? '' : `<section class="panel" aria-label="Order progress">
      <ol class="stepper-track" style="grid-template-columns:repeat(${flow.length},1fr)">${flow.map((s, i) => {
        const cls = i < idx || o.status === flow[flow.length - 1] ? 'done' : i === idx ? 'current' : '';
        return `<li class="${cls}" ${i === idx ? 'aria-current="step"' : ''}><span class="dot" aria-hidden="true">${cls === 'done' ? '<i class="bi bi-check-lg"></i>' : i + 1}</span>${esc(STATUS_LABEL[s])}<span class="t">${esc(eventTime(s) || (i > idx ? 'Waiting' : ''))}</span></li>`;
      }).join('')}</ol>
    </section>`}
    <div class="d-flex flex-wrap gap-2 mb-3">
      ${o.status === 'placed' ? `<button type="button" class="btn btn-sm btn-outline-danger" data-action="cancel-order" data-oid="${esc(o.id)}">Cancel order</button>` : ''}
      <a href="#/help?order=${esc(o.id)}" class="btn btn-sm btn-outline-dark"><i class="bi bi-life-preserver" aria-hidden="true"></i>Get help with this order</a>
      ${!isActive(o) ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="reorder" data-oid="${esc(o.id)}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Reorder</button>` : ''}
      ${siblings.map((s) => `<a href="#/track/${esc(s.id)}" class="btn btn-sm btn-outline-dark">Also in this checkout: ${esc(s.storeName)}</a>`).join('')}
    </div>
    ${['delivered', 'collected'].includes(o.status) ? `<section class="panel"><h2 class="panel-title">How was it?</h2>${orderCard(o).match(/<div class="rate-row"[\s\S]*?<\/div>/)?.[0] || ''}</section>` : ''}
    <div class="track-grid">
      <section class="panel" aria-labelledby="tdTitle">
        <h2 class="panel-title" id="tdTitle">Details</h2>
        <dl class="kv">
          <dt>Mode</dt><dd>${o.mode === 'pickup' ? 'Pickup' : 'Delivery'}</dd>
          ${o.mode === 'delivery' ? `<dt>Address</dt><dd>${esc(o.address)}</dd>` : `<dt>Pick up from</dt><dd>${esc(o.storeName)}, ${esc(o.storeArea || '')}</dd>`}
          <dt>Name</dt><dd>${esc(o.contact.name)}</dd>
          <dt>Contact</dt><dd>${esc([o.contact.phone, o.contact.email].filter(Boolean).join(' / ') || '—')}</dd>
          <dt>When</dt><dd>${esc(o.when)}</dd>
          <dt>Payment</dt><dd>${esc(o.payment)}${o.payment === 'Cash' ? ` — pay ${rs(o.total)} ${o.mode === 'pickup' ? 'at pickup' : 'on delivery'}` : ' <span class="text-body-secondary fw-normal">(test option, not charged)</span>'}</dd>
          ${o.riderNote ? `<dt>${o.mode === 'pickup' ? 'Pickup note' : 'Rider note'}</dt><dd>${esc(o.riderNote)}</dd>` : ''}
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

/** Refresh one order from the server (used while the tracking page is open). */
async function refreshOrder(id) {
  try {
    const res = await api(`/orders/${encodeURIComponent(id)}`);
    const i = session.orders.findIndex((o) => o.id === id);
    const changed = i === -1 || session.orders[i].status !== res.order.status;
    if (i === -1) session.orders.unshift(res.order); else session.orders[i] = res.order;
    if (changed && ui.route.name === 'track' && ui.route.params.id === id) {
      renderTrack(id);
      if (i !== -1 && state.settings.notifOrder) toast(`${res.order.storeName}: ${STATUS_LABEL[res.order.status]}`, { icon: 'bi-bell-fill' });
    }
    updateActiveDot();
  } catch { /* keep showing the last known state */ }
}

function reorder(oid) {
  const o = orderById(oid);
  if (!o) return;
  let added = 0, skipped = 0;
  o.items.forEach((i) => {
    const p = productById(i.productId);
    const v = p && vendorById(p.vendorId);
    if (p && p.available && v && v.isOpen) { addToCart(p.id, i.qty, { silent: true }); added += i.qty; } else skipped++;
  });
  toast(added ? `Added ${plural(added, 'item')} to your basket${skipped ? ` (${skipped} not available right now)` : ''}` : 'These items are not available right now', { icon: 'bi-arrow-repeat', action: added ? { label: 'View basket', run: openCart } : null });
}

/* ========================================================== FAVOURITES */
function renderFavourites() {
  document.title = 'Favourites — Mangao';
  const items = session.favourites.products.map(productById).filter(Boolean);
  const places = session.favourites.vendors.map(vendorById).filter(Boolean);
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
  return session.addresses.find((a) => a.id === state.selectedAddressId) || session.addresses.find((a) => a.is_default) || session.addresses[0] || null;
}
function selectedAddressText() {
  const a = selectedAddress();
  return a ? `${a.label}, ${a.area}` : '';
}
const addrIcon = (label) => ({ Home: 'bi-house', Work: 'bi-briefcase', University: 'bi-mortarboard' }[label] || 'bi-geo-alt');

async function loadAddresses() {
  if (!isLoggedIn()) { session.addresses = []; renderHeaderAddress(); return; }
  const res = await tryApi('/addresses');
  if (res) session.addresses = res.addresses;
  renderHeaderAddress();
  if (ui.route.name === 'account') renderAccount();
}

function renderHeaderAddress() {
  const a = selectedAddress();
  $('#addressChipLabel').textContent = `${state.orderMode === 'pickup' ? 'Pickup near' : 'Deliver to'}${a ? ` · ${a.label}` : ''}`;
  $('#addressChipValue').textContent = a ? a.area : isLoggedIn() ? 'Add an address' : 'Lahore';
  $('#addressModalList').innerHTML = !isLoggedIn()
    ? '<p class="text-body-secondary mb-0">Log in to save delivery addresses.</p>'
    : session.addresses.length
      ? session.addresses.map((ad) => `<label class="addr-opt"><input type="radio" name="addrPick" value="${ad.id}" ${ad.id === (a && a.id) ? 'checked' : ''}><span><i class="bi ${addrIcon(ad.label)}" aria-hidden="true"></i><span><strong>${esc(ad.label)}</strong><small>${esc(ad.line)}, ${esc(ad.area)}</small></span></span></label>`).join('')
      : '<p class="text-body-secondary mb-0">You have no saved addresses yet.</p>';
  $('#manageAddrLink').textContent = isLoggedIn() ? 'Add or manage addresses' : 'Log in';
  $('#manageAddrLink').href = isLoggedIn() ? '#/account' : '#/login';
}

function renderAccount() {
  document.title = 'Account — Mangao';
  const u = session.user;
  $('#accountTitle').textContent = u.name;
  $('#profileAvatar').textContent = (u.name || '?').trim()[0].toUpperCase();
  $('#profileContact').textContent = [u.email, u.phone].filter(Boolean).join(' · ');
  const saved = session.orders.reduce((s, o) => s + (o.discount || 0), 0);
  $('#profileStats').innerHTML = `
    <div class="stat"><strong>${session.orders.length}</strong><span>Orders</span></div>
    <div class="stat"><strong>${session.favourites.products.length + session.favourites.vendors.length}</strong><span>Favourites</span></div>
    <div class="stat"><strong>${rs(saved)}</strong><span>Saved with codes</span></div>`;
  $('#roleLinks').innerHTML = [
    u.role === 'admin' ? '<a href="#/admin"><i class="bi bi-speedometer2" aria-hidden="true"></i>Admin panel<i class="bi bi-chevron-right" aria-hidden="true"></i></a>' : '',
    u.role === 'partner' ? '<a href="#/partner"><i class="bi bi-shop" aria-hidden="true"></i>My store dashboard<i class="bi bi-chevron-right" aria-hidden="true"></i></a>' : '',
    u.role === 'customer' ? '<a href="#/partner"><i class="bi bi-shop" aria-hidden="true"></i>Sell on Mangao<i class="bi bi-chevron-right" aria-hidden="true"></i></a>' : '',
  ].join('');
  $('#pfName').value = u.name;
  $('#pfPhone').value = u.phone || '';
  $('#pfEmail').value = u.email;
  if ($('#adArea').options.length <= 1) $('#adArea').insertAdjacentHTML('beforeend', LAHORE_AREAS.map((a) => `<option>${esc(a)}</option>`).join(''));
  $('#addressList').innerHTML = session.addresses.length
    ? session.addresses.map((a) => `<li>
        <i class="bi ${addrIcon(a.label)}" aria-hidden="true"></i>
        <div class="addr-text"><div class="addr-label">${esc(a.label)}${a.is_default ? '<span class="default-tag">Default</span>' : ''}</div><div class="addr-line">${esc(a.line)}, ${esc(a.area)}, Lahore</div></div>
        <div class="d-flex gap-1 flex-wrap justify-content-end">
          ${!a.is_default ? `<button type="button" class="btn btn-sm btn-outline-dark" data-action="default-address" data-id="${a.id}">Make default</button>` : ''}
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-address" data-id="${a.id}" aria-label="Delete ${esc(a.label)} address"><i class="bi bi-trash3" aria-hidden="true"></i></button>
        </div>
      </li>`).join('')
    : '<li class="text-body-secondary">No saved addresses. Add one to check out faster.</li>';
}

async function saveProfile(e) {
  e.preventDefault();
  const form = $('#profileForm');
  clearErrors(form);
  const errs = validateContact($('#pfName'), $('#pfPhone'), null, { requireContact: false });
  if (errs.length) {
    errs.forEach((x) => setError(x.el, x.msg));
    errs[0].el.focus();
    $('#profileSaved').textContent = '';
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  const res = await withBusy(btn, 'Saving…', () => tryApi('/me', { method: 'PATCH', body: { name: $('#pfName').value.trim(), phone: $('#pfPhone').value.trim() } }));
  if (!res) return;
  session.user = { ...session.user, ...res.user, store: session.user.store };
  renderAccount();
  renderAuthUI();
  $('#profileSaved').textContent = 'Saved';
  toast('Profile details saved', { type: 'ok' });
  setTimeout(() => { $('#profileSaved').textContent = ''; }, 2500);
}

async function saveAddress(e) {
  e.preventDefault();
  const form = $('#addressForm');
  clearErrors(form);
  const line = $('#adLine'), area = $('#adArea');
  const errs = [];
  if (line.value.trim().length < 6) errs.push({ el: line, msg: 'Enter a street address with house number and street.' });
  if (!area.value) errs.push({ el: area, msg: 'Choose an area.' });
  if (errs.length) { errs.forEach((x) => setError(x.el, x.msg)); errs[0].el.focus(); return; }
  const res = await tryApi('/addresses', { method: 'POST', body: { label: $('#adLabel').value, line: line.value.trim(), area: area.value } });
  if (!res) return;
  session.addresses.push(res.address);
  if (res.address.is_default) state.selectedAddressId = res.address.id;
  saveState();
  form.reset();
  toggleAddressForm(false);
  renderAccount();
  renderHeaderAddress();
  toast(`${res.address.label} address saved`, { type: 'ok' });
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
  const loggedIn = isLoggedIn();
  $('#securityPanel').hidden = !loggedIn;
  $('#exportDataBtn').hidden = !loggedIn;
  $('#deleteForm').hidden = !loggedIn || session.user.role === 'admin';
}
function bindSettings() {
  const map = {
    setTheme: ['theme', (el) => el.value, (v) => `Theme set to ${v === 'system' ? 'match device' : v}`],
    setPhotos: ['photos', (el) => el.checked, (v) => (v ? 'Product photos on' : 'Using illustrations instead of photos')],
    setMotion: ['reduceMotion', (el) => el.checked, (v) => (v ? 'Reduced motion on' : 'Animations on')],
    setDefaultMode: ['defaultMode', (el) => el.value, (v) => `Default mode set to ${v}`],
    setTip: ['defaultTip', (el) => Number(el.value), (v) => (v ? `Default tip set to ${rs(v)}` : 'Default tip off')],
    setNotifOrder: ['notifOrder', (el) => el.checked, (v) => (v ? 'Order progress alerts on' : 'Order progress alerts off')],
    setNotifPromo: ['notifPromo', (el) => el.checked, (v) => (v ? 'Offer banners on' : 'Offer banners off')],
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

  $('#exportDataBtn').addEventListener('click', async (e) => {
    const data = await withBusy(e.currentTarget, 'Preparing…', () => tryApi('/me/export'));
    if (!data) return;
    const blob = new Blob([JSON.stringify({ ...data, device: state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mangao-my-data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    toast('Downloaded mangao-my-data.json', { icon: 'bi-download' });
  });
  $('#resetDataBtn').addEventListener('click', () => {
    confirmDialog('Clear this device?', 'This empties your basket and resets display settings on this device. Your account and orders are not affected.', 'Clear', () => {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      ui.tip = null;
      saveState();
      applySettings();
      refreshCartUI();
      renderHeaderAddress();
      syncModeUI();
      router();
      toast('This device has been cleared', { icon: 'bi-arrow-counterclockwise' });
    });
  });
  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    clearErrors(form);
    const cur = $('#pwCurrent'), next = $('#pwNext');
    if (!cur.value) { setError(cur, 'Enter your current password.'); cur.focus(); return; }
    if (next.value.length < 8) { setError(next, 'New password must be at least 8 characters.'); next.focus(); return; }
    try {
      await withBusy(form.querySelector('button'), 'Saving…', () => api('/me/password', { method: 'POST', body: { current: cur.value, next: next.value } }));
      form.reset();
      toast('Password changed', { type: 'ok' });
    } catch (err) { setError(cur, err.message); cur.focus(); }
  });
  $('#deleteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = $('#delPassword');
    clearErrors(e.currentTarget);
    if (!pw.value) { setError(pw, 'Enter your password to confirm.'); pw.focus(); return; }
    confirmDialog('Delete your account?', 'Your account, addresses, favourites, orders and messages will be permanently deleted. This cannot be undone.', 'Delete account', async () => {
      try {
        await api('/me', { method: 'DELETE', body: { password: pw.value } });
        pw.value = '';
        signedOut();
        location.hash = '#/';
        toast('Your account has been deleted', { icon: 'bi-person-x' });
      } catch (err) { setError(pw, err.message); pw.focus(); }
    });
  });
}

/* ================================================================ HELP */
const FAQ = [
  ['How do I pay?', 'Choose Cash and pay the rider when your order arrives, or pay at the counter when you collect it. Card and wallet are test options for now and nothing is charged.'],
  ['How does the MANGO150 code work?', 'It takes Rs. 150 off your subtotal (never more than the subtotal). Each account can use it once. If you cancel that order, you can use it again.'],
  ['Why is there a minimum order?', 'Each place sets a minimum for delivery. If your items from one place are below it, add a little more or switch to Pickup, which has no minimum.'],
  ['Can I order from more than one place?', 'Yes. Your basket groups items by place. Each place prepares and sends its part separately, so you get one order number per place.'],
  ['Can I cancel an order?', 'Yes, until the store accepts it. Open the order and choose Cancel order. After that, message support and we will help.'],
  ['What are “Demo listing” stores?', 'Some stores use well-known brand names as sample menus. They are not affiliated with those brands. Orders to them are handled by the Mangao team.'],
];

function renderHelp() {
  document.title = 'Help — Mangao';
  const typeSel = $('#spType');
  if (typeSel.options.length <= 1) typeSel.insertAdjacentHTML('beforeend', SUPPORT_TYPES.map((t) => `<option>${esc(t)}</option>`).join(''));
  $('#spOrder').innerHTML = '<option value="">Not about a specific order</option>' + session.orders.map((o) => `<option value="${esc(o.id)}">${esc(o.id)} — ${esc(o.storeName)}, ${fmtDate(o.createdAt)}</option>`).join('');
  if (ui.route.query.order && orderById(ui.route.query.order)) {
    $('#spOrder').value = ui.route.query.order;
    if (!typeSel.value) typeSel.value = SUPPORT_TYPES[0];
  }
  $('#faq').innerHTML = FAQ.map(([q, a], i) => `<div class="accordion-item">
      <h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq${i}" aria-expanded="false" aria-controls="faq${i}">${esc(q)}</button></h3>
      <div id="faq${i}" class="accordion-collapse collapse" data-bs-parent="#faq"><div class="accordion-body">${esc(a)}</div></div>
    </div>`).join('');
  const loggedIn = isLoggedIn();
  $('#supportForm').hidden = !loggedIn;
  $('#chatForm').hidden = !loggedIn;
  $('#chatQuick').hidden = !loggedIn;
  renderCases();
  renderChat();
  if (loggedIn) { loadTickets(); loadMessages(); }
}

async function loadTickets() {
  const res = await tryApi('/tickets');
  if (res) { session.tickets = res.tickets; renderCases(); }
}
async function loadMessages() {
  try {
    const res = await api('/messages');
    const changed = res.messages.length !== session.messages.length;
    session.messages = res.messages;
    if (changed) renderChat();
  } catch { /* try again on next poll */ }
}

function renderCases() {
  if (!isLoggedIn()) {
    $('#supportConfirm').innerHTML = `<p class="text-body-secondary">Log in to report a problem with an order.</p><a class="btn btn-mango" href="#/login">Log in</a>`;
    $('#supportCases').innerHTML = '';
    return;
  }
  $('#supportConfirm').innerHTML = ui.lastCase
    ? `<div class="case-card" tabindex="-1" id="caseCard"><strong>Report received — case ${esc(ui.lastCase.id)}</strong><br>The Mangao team will look into it. You'll see our reply below, and you can also message us in the chat.</div>`
    : '';
  $('#supportCases').innerHTML = session.tickets.length
    ? `<h3 class="h6 mt-4 mb-0">Your reports</h3><ul class="case-list">${session.tickets.slice(0, 10).map((c) => `<li><span><strong>${esc(c.id)}</strong> · ${esc(c.type)}${c.order_id ? ` · ${esc(c.order_id)}` : ''}${c.reply ? `<br><span class="text-body-secondary">Reply: ${esc(c.reply)}</span>` : ''}</span><span class="text-nowrap"><span class="status-tag ${c.status === 'resolved' ? 'done' : ''}">${c.status === 'resolved' ? 'Resolved' : 'Open'}</span></span></li>`).join('')}</ul>`
    : '';
}

async function submitSupportIssue(e) {
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
  const btn = form.querySelector('button[type="submit"]');
  const res = await withBusy(btn, 'Sending…', () => tryApi('/tickets', { method: 'POST', body: { type: type.value, orderId: $('#spOrder').value, description: d } }));
  if (!res) return;
  session.tickets.unshift(res.ticket);
  ui.lastCase = res.ticket;
  form.reset();
  $('#spDescCount').textContent = '0 / 1000';
  renderCases();
  $('#caseCard').focus();
  toast(`Report ${res.ticket.id} sent`, { icon: 'bi-clipboard-check', type: 'ok' });
}

const CHAT_STARTERS = ['Where is my order?', 'I want to change my order', 'An item is missing', 'Promo code question'];

function renderChat() {
  const log = $('#chatLog');
  if (!isLoggedIn()) {
    log.innerHTML = '<div class="msg bot">Hi! Log in to message the Mangao team about your orders.</div>';
    return;
  }
  const welcome = '<div class="msg bot">Hi! Send us a message and the Mangao team will reply here. Common answers are in the questions on this page.</div>';
  log.innerHTML = welcome + session.messages.map((m) => `<div class="msg ${m.from_role === 'user' ? 'user' : 'bot'}">${esc(m.body)}<span class="msg-time">${fmtDate(m.created_at)}</span></div>`).join('');
  $('#chatQuick').innerHTML = session.messages.length ? '' : CHAT_STARTERS.map((t) => `<button type="button" data-action="chat-starter" data-text="${esc(t)}">${esc(t)}</button>`).join('');
  log.scrollTop = log.scrollHeight;
}
async function sendChat(text) {
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  const res = await tryApi('/messages', { method: 'POST', body: { body: clean } });
  if (!res) return;
  session.messages = res.messages;
  renderChat();
}

/* ================================================================ AUTH */
async function loadSession() {
  try {
    const res = await api('/auth/me');
    session.user = res.user;
  } catch {
    session.user = null;
  }
}

/** After login: load everything that belongs to the account. */
async function loadAccountData() {
  if (!isLoggedIn()) return;
  const [fav] = await Promise.all([tryApi('/favourites'), loadAddresses(), loadOrders()]);
  if (fav) session.favourites = fav;
}

function signedOut() {
  session.user = null;
  session.favourites = { products: [], vendors: [] };
  session.addresses = [];
  session.orders = [];
  session.tickets = [];
  session.messages = [];
  session.partner = null;
  session.admin = null;
  state.promo = null;
  saveState();
  renderAuthUI();
  renderHeaderAddress();
  updateActiveDot();
}

function renderAuthUI() {
  const u = session.user;
  $('#headerAvatar').textContent = u ? (u.name || '?').trim()[0].toUpperCase() : '';
  $('#headerAvatar').innerHTML = u ? esc((u.name || '?').trim()[0].toUpperCase()) : '<i class="bi bi-person" aria-hidden="true"></i>';
  $('#accountMenu').innerHTML = u
    ? `<li><h6 class="dropdown-header">${esc(u.name)}</h6></li>
       <li><a class="dropdown-item" href="#/account"><i class="bi bi-person me-2" aria-hidden="true"></i>Profile</a></li>
       <li><a class="dropdown-item" href="#/orders"><i class="bi bi-receipt me-2" aria-hidden="true"></i>Orders</a></li>
       <li><a class="dropdown-item" href="#/favourites"><i class="bi bi-heart me-2" aria-hidden="true"></i>Favourites</a></li>
       ${u.role === 'partner' ? '<li><a class="dropdown-item" href="#/partner"><i class="bi bi-shop me-2" aria-hidden="true"></i>My store</a></li>' : ''}
       ${u.role === 'admin' ? '<li><a class="dropdown-item" href="#/admin"><i class="bi bi-speedometer2 me-2" aria-hidden="true"></i>Admin panel</a></li>' : ''}
       <li><a class="dropdown-item" href="#/settings"><i class="bi bi-gear me-2" aria-hidden="true"></i>Settings</a></li>
       <li><a class="dropdown-item" href="#/help"><i class="bi bi-life-preserver me-2" aria-hidden="true"></i>Help &amp; support</a></li>
       <li><hr class="dropdown-divider"></li>
       <li><button type="button" class="dropdown-item" data-action="logout"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Log out</button></li>`
    : `<li><a class="dropdown-item" href="#/login"><i class="bi bi-box-arrow-in-right me-2" aria-hidden="true"></i>Log in or sign up</a></li>
       <li><a class="dropdown-item" href="#/partner"><i class="bi bi-shop me-2" aria-hidden="true"></i>Sell on Mangao</a></li>
       <li><a class="dropdown-item" href="#/settings"><i class="bi bi-gear me-2" aria-hidden="true"></i>Settings</a></li>
       <li><a class="dropdown-item" href="#/help"><i class="bi bi-life-preserver me-2" aria-hidden="true"></i>Help &amp; support</a></li>`;
  const accountTab = $('.bottom-nav a[data-tab="account"] span');
  if (accountTab) accountTab.textContent = u ? 'Account' : 'Log in';
}

let afterLogin = '#/';
function goLogin(reason) {
  afterLogin = location.hash && !location.hash.startsWith('#/login') ? location.hash : '#/';
  ui.authReason = reason;
  closeCart();
  location.hash = '#/login';
}

function renderLogin() {
  document.title = 'Log in — Mangao';
  if (isLoggedIn()) { location.hash = afterLogin || '#/'; return; }
  $('#authReason').textContent = ui.authReason || 'Log in or create an account to order.';
  $$('[data-atab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.atab === ui.authTab)));
  $('#loginForm').hidden = ui.authTab !== 'login';
  $('#registerForm').hidden = ui.authTab !== 'register';
}

async function afterSignIn(user, message) {
  session.user = user;
  renderAuthUI();
  await loadAccountData();
  toast(message, { type: 'ok' });
  ui.authReason = '';
  const roleHome = user.role === 'admin' ? '#/admin' : user.role === 'partner' ? '#/partner' : '#/';
  const dest = afterLogin && !['', '#', '#/', '#/login'].includes(afterLogin) ? afterLogin : roleHome;
  afterLogin = '#/';
  if (location.hash === dest) router(); else location.hash = dest;
}

async function submitLogin(e) {
  e.preventDefault();
  const form = $('#loginForm');
  clearErrors(form);
  const email = $('#liEmail'), pw = $('#liPassword');
  const errs = [];
  if (!EMAIL_RE.test(email.value.trim())) errs.push({ el: email, msg: 'Enter the email you signed up with.' });
  if (!pw.value) errs.push({ el: pw, msg: 'Enter your password.' });
  if (showFormErrors($('#loginError'), errs)) return;
  try {
    const res = await withBusy(form.querySelector('button[type="submit"]'), 'Logging in…', () => api('/auth/login', { method: 'POST', body: { email: email.value.trim(), password: pw.value } }));
    form.reset();
    await afterSignIn(res.user, `Welcome back, ${res.user.name.split(' ')[0]}!`);
  } catch (err) {
    $('#loginError').innerHTML = esc(err.message);
    $('#loginError').hidden = false;
    pw.focus();
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const form = $('#registerForm');
  clearErrors(form);
  const pw = $('#rgPassword');
  const errs = validateContact($('#rgName'), $('#rgPhone'), $('#rgEmail'), { requireContact: false });
  if (!$('#rgEmail').value.trim()) errs.push({ el: $('#rgEmail'), msg: 'Enter your email.' });
  if (pw.value.length < 8) errs.push({ el: pw, msg: 'Password must be at least 8 characters.' });
  if (showFormErrors($('#registerError'), errs)) return;
  try {
    const res = await withBusy(form.querySelector('button[type="submit"]'), 'Creating account…', () => api('/auth/register', {
      method: 'POST',
      body: { name: $('#rgName').value.trim(), email: $('#rgEmail').value.trim(), phone: $('#rgPhone').value.trim(), password: pw.value },
    }));
    form.reset();
    await afterSignIn(res.user, `Welcome to Mangao, ${res.user.name.split(' ')[0]}!`);
  } catch (err) {
    $('#registerError').innerHTML = esc(err.message);
    $('#registerError').hidden = false;
  }
}

async function logout() {
  await tryApi('/auth/logout', { method: 'POST' });
  signedOut();
  location.hash = '#/';
  toast('You have logged out', { icon: 'bi-box-arrow-right' });
}

/* ============================================================= PARTNER */
const NEXT_ACTION = {
  placed: [['accepted', 'Accept'], ['rejected', 'Decline']],
  accepted: [['preparing', 'Start preparing']],
  preparing: [['on_the_way', 'Out for delivery'], ['ready', 'Ready for pickup']],
  on_the_way: [['delivered', 'Mark delivered']],
  ready: [['collected', 'Mark collected']],
};
function orderActions(o) {
  const flow = ORDER_FLOW[o.mode];
  return (NEXT_ACTION[o.status] || [])
    .filter(([s]) => s === 'rejected' || flow.includes(s))
    .map(([s, label]) => `<button type="button" class="btn btn-sm ${s === 'rejected' ? 'btn-outline-danger' : 'btn-dark'}" data-action="set-status" data-oid="${esc(o.id)}" data-status="${s}">${label}</button>`)
    .join(' ');
}
function dashOrderCard(o, { showStore = false } = {}) {
  return `<article class="order-card dash-order">
    <div class="order-top">
      <div><p class="order-title">${esc(o.id)}${showStore ? ` · ${esc(o.storeName)}` : ''}</p>
        <span class="order-meta">${fmtDate(o.createdAt)} · ${o.mode === 'pickup' ? 'Pickup' : 'Delivery'} · ${esc(o.when)}</span></div>
      <span class="status-tag ${statusClass(o.status)}">${esc(STATUS_LABEL[o.status])}</span>
    </div>
    <ul class="dash-items">${o.items.map((i) => `<li><strong>${i.qty}×</strong> ${esc(i.name)}</li>`).join('')}</ul>
    <p class="order-meta mb-1"><i class="bi bi-person" aria-hidden="true"></i> ${esc(o.contact.name)} · ${esc([o.contact.phone, o.contact.email].filter(Boolean).join(' / '))}</p>
    ${o.mode === 'delivery' ? `<p class="order-meta mb-1"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${esc(o.address)}</p>` : ''}
    ${o.riderNote ? `<p class="order-meta mb-1"><i class="bi bi-chat-left-text" aria-hidden="true"></i> ${esc(o.riderNote)}</p>` : ''}
    ${o.notes ? `<p class="order-meta mb-1"><i class="bi bi-sticky" aria-hidden="true"></i> ${esc(o.notes)}</p>` : ''}
    <div class="order-actions mt-2">
      <span class="order-total">${rs(o.total)} <small class="text-body-secondary fw-normal">${esc(o.payment)}</small></span>
      <div class="btns">${orderActions(o)}</div>
    </div>
  </article>`;
}

async function loadPartner() {
  const res = await tryApi('/partner/store');
  if (res) session.partner = res;
  return res;
}

function renderPartnerApply() {
  return `<div class="auth-card wide">
    <h1 id="partnerTitle" class="h3">Sell on Mangao</h1>
    <p class="page-sub mb-3">Tell us about your restaurant or shop. Once our team approves it, customers can order from you and you'll manage orders from your dashboard.</p>
    <form id="partnerApplyForm" novalidate>
      <div class="form-error-summary" id="paErrors" role="alert" hidden></div>
      <div class="row g-3">
        <div class="col-sm-8"><label for="paName" class="form-label">Restaurant or shop name</label><input id="paName" class="form-control" maxlength="60" aria-describedby="paNameErr"><div class="invalid-feedback" id="paNameErr"></div></div>
        <div class="col-sm-4"><label for="paType" class="form-label">Type</label><select id="paType" class="form-select"><option value="restaurant">Restaurant</option><option value="shop">Shop</option></select></div>
        <div class="col-sm-6"><label for="paKind" class="form-label">What do you sell?</label><input id="paKind" class="form-control" maxlength="40" placeholder="e.g. Burgers, Supermarket" aria-describedby="paKindErr"><div class="invalid-feedback" id="paKindErr"></div></div>
        <div class="col-sm-6"><label for="paArea" class="form-label">Area</label><select id="paArea" class="form-select" aria-describedby="paAreaErr"><option value="">Choose an area</option>${LAHORE_AREAS.map((a) => `<option>${esc(a)}</option>`).join('')}</select><div class="invalid-feedback" id="paAreaErr"></div></div>
        <div class="col-12"><label for="paAddress" class="form-label">Full address</label><input id="paAddress" class="form-control" maxlength="200" aria-describedby="paAddressErr"><div class="invalid-feedback" id="paAddressErr"></div></div>
        <div class="col-sm-6"><label for="paPhone" class="form-label">Contact number</label><input id="paPhone" type="tel" class="form-control" placeholder="03XX XXXXXXX" aria-describedby="paPhoneErr"><div class="invalid-feedback" id="paPhoneErr"></div></div>
      </div>
      <button type="submit" class="btn btn-mango btn-lg mt-3">Submit for approval</button>
    </form>
  </div>`;
}

function renderPartner() {
  document.title = 'My store — Mangao';
  const body = $('#partnerBody');
  const u = session.user;
  if (u.role === 'admin') {
    body.innerHTML = emptyState({ title: 'You are an admin', text: 'Admins manage every store from the admin panel.', actions: '<a class="btn btn-mango" href="#/admin">Open admin panel</a>' });
    return;
  }
  if (u.role !== 'partner') { body.innerHTML = renderPartnerApply(); return; }
  const data = session.partner;
  if (!data) { body.innerHTML = loadingState('Loading your store…'); loadPartner().then(() => ui.route.name === 'partner' && renderPartner()); return; }
  const s = data.store;
  const active = data.orders.filter(isActive);
  const past = data.orders.filter((o) => !isActive(o));
  const today = new Date().toDateString();
  const todayDone = past.filter((o) => ['delivered', 'collected'].includes(o.status) && new Date(o.createdAt).toDateString() === today);
  const tab = ui.partnerTab;
  body.innerHTML = `
    <div class="page-head">
      <div><h1 id="partnerTitle">${esc(s.name)}</h1><p class="page-sub">Store dashboard · new orders appear automatically</p></div>
      <div class="d-flex align-items-center gap-3">
        <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="storeOpen" ${s.isOpen ? 'checked' : ''}><label class="form-check-label fw-semibold" for="storeOpen">${s.isOpen ? 'Open for orders' : 'Closed'}</label></div>
        ${s.status === 'active' ? `<a class="btn btn-sm btn-outline-dark" href="#/vendor/${esc(s.id)}">View store page</a>` : ''}
      </div>
    </div>
    ${s.status === 'pending' ? '<p class="min-warn"><i class="bi bi-hourglass-split" aria-hidden="true"></i><span>Your store is waiting for approval by the Mangao team. Add your menu now so you are ready when it goes live.</span></p>' : ''}
    ${s.status === 'suspended' ? '<p class="min-warn"><i class="bi bi-exclamation-octagon" aria-hidden="true"></i><span>Your store is suspended and hidden from customers. Contact support.</span></p>' : ''}
    <div class="stat-row">
      <div class="stat"><strong>${active.length}</strong><span>Active orders</span></div>
      <div class="stat"><strong>${todayDone.length}</strong><span>Completed today</span></div>
      <div class="stat"><strong>${rs(todayDone.reduce((t, o) => t + o.subtotal, 0))}</strong><span>Sales today</span></div>
    </div>
    <div class="seg-tabs" role="tablist" aria-label="Dashboard sections">
      ${[['orders', `Orders <span class="seg-count">${active.length}</span>`], ['menu', `Menu <span class="seg-count">${data.products.length}</span>`], ['history', 'History'], ['settings', 'Store settings']].map(([k, l]) => `<button type="button" role="tab" class="seg-tab" aria-selected="${tab === k}" data-ptab="${k}">${l}</button>`).join('')}
    </div>
    <div id="partnerPanel">${
      tab === 'orders' ? (active.length ? `<div class="dash-grid">${active.map((o) => dashOrderCard(o)).join('')}</div>` : emptyState({ title: 'No active orders', text: 'New orders will show up here automatically. Keep this page open.' }))
      : tab === 'history' ? (past.length ? `<div class="dash-grid">${past.slice(0, 50).map((o) => dashOrderCard(o)).join('')}</div>` : emptyState({ title: 'No past orders yet', text: 'Completed and cancelled orders appear here.' }))
      : tab === 'menu' ? renderPartnerMenu(data)
      : renderPartnerSettings(s)
    }</div>`;
}

function renderPartnerMenu(data) {
  const imageOptions = Object.keys(IMAGES).filter((k) => !['supermarket', 'supermarket2', 'aisle', 'pharmacy', 'bakery'].includes(k))
    .map((k) => `<option value="${k}">${IMAGES[k].emoji} ${k}</option>`).join('');
  return `<form id="productForm" class="panel" novalidate>
      <h2 class="panel-title">Add a menu item</h2>
      <div class="form-error-summary" id="prErrors" role="alert" hidden></div>
      <div class="row g-2">
        <div class="col-md-4"><label for="prName" class="form-label">Item name</label><input id="prName" class="form-control" maxlength="80"></div>
        <div class="col-md-3"><label for="prSection" class="form-label">Menu section</label><input id="prSection" class="form-control" maxlength="40" placeholder="e.g. Burgers" list="sectionList"><datalist id="sectionList">${[...new Set(data.products.map((p) => p.section))].map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>
        <div class="col-md-2"><label for="prPrice" class="form-label">Price (Rs.)</label><input id="prPrice" type="number" min="1" step="1" class="form-control"></div>
        <div class="col-md-3"><label for="prCategory" class="form-label">Category</label><select id="prCategory" class="form-select">${CATEGORIES.map((c) => `<option value="${c.value}">${esc(c.label)}</option>`).join('')}</select></div>
        <div class="col-md-8"><label for="prDesc" class="form-label">Short description <span class="opt">optional</span></label><input id="prDesc" class="form-control" maxlength="200"></div>
        <div class="col-md-4"><label for="prImage" class="form-label">Picture</label><select id="prImage" class="form-select">${imageOptions}</select></div>
      </div>
      <button type="submit" class="btn btn-dark mt-3">Add item</button>
    </form>
    ${data.products.length ? `<div class="table-responsive panel p-0"><table class="table align-middle mb-0 dash-table">
      <thead><tr><th>Item</th><th>Section</th><th>Price (Rs.)</th><th>Available</th><th></th></tr></thead>
      <tbody>${data.products.map((p) => `<tr>
        <td><span class="me-2" aria-hidden="true">${(IMAGES[p.image] || {}).emoji || '🛍️'}</span>${esc(p.name)}</td>
        <td>${esc(p.section)}</td>
        <td><input type="number" min="1" step="1" class="form-control form-control-sm price-input" value="${p.price}" data-action-change="price" data-id="${esc(p.id)}" aria-label="Price of ${esc(p.name)}"></td>
        <td><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" ${p.available ? 'checked' : ''} data-action-change="available" data-id="${esc(p.id)}" aria-label="${esc(p.name)} available"></div></td>
        <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-product" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.name)}"><i class="bi bi-trash3" aria-hidden="true"></i></button></td>
      </tr>`).join('')}</tbody></table></div>` : emptyState({ title: 'No menu items yet', text: 'Add your first item above.' })}`;
}

function renderPartnerSettings(s) {
  return `<form id="storeSettingsForm" class="panel" novalidate>
    <h2 class="panel-title">Delivery settings</h2>
    <div class="row g-3">
      <div class="col-sm-3"><label for="ssEtaMin" class="form-label">Fastest time (min)</label><input id="ssEtaMin" type="number" min="5" class="form-control" value="${s.eta[0]}"></div>
      <div class="col-sm-3"><label for="ssEtaMax" class="form-label">Slowest time (min)</label><input id="ssEtaMax" type="number" min="5" class="form-control" value="${s.eta[1]}"></div>
      <div class="col-sm-3"><label for="ssFee" class="form-label">Delivery fee (Rs.)</label><input id="ssFee" type="number" min="0" class="form-control" value="${s.deliveryFee}"></div>
      <div class="col-sm-3"><label for="ssMin" class="form-label">Minimum order (Rs.)</label><input id="ssMin" type="number" min="0" class="form-control" value="${s.minOrder}"></div>
    </div>
    <button type="submit" class="btn btn-dark mt-3">Save settings</button>
  </form>`;
}

async function partnerStatus(oid, status, refresh) {
  const res = await tryApi(`/orders/${encodeURIComponent(oid)}/status`, { method: 'POST', body: { status } });
  if (!res) return;
  toast(`${oid}: ${STATUS_LABEL[status]}`, { icon: 'bi-check2-circle', type: 'ok' });
  await refresh();
}

/* =============================================================== ADMIN */
async function loadAdmin() {
  const res = await tryApi('/admin/overview');
  if (res) session.admin = res;
  return res;
}

function renderAdmin() {
  document.title = 'Admin — Mangao';
  const body = $('#adminBody');
  const d = session.admin;
  if (!d) { body.innerHTML = loadingState('Loading admin panel…'); loadAdmin().then(() => ui.route.name === 'admin' && renderAdmin()); return; }
  const st = d.stats;
  const tab = ui.adminTab;
  const activeOrders = d.orders.filter(isActive);
  body.innerHTML = `
    <div class="page-head"><div><h1 id="adminTitle">Admin panel</h1><p class="page-sub">Updates automatically every 20 seconds</p></div>
      <button type="button" class="btn btn-outline-dark" data-action="admin-refresh"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i>Refresh</button></div>
    <div class="stat-row admin-stats">
      <div class="stat"><strong>${st.active_orders}</strong><span>Active orders</span></div>
      <div class="stat"><strong>${st.orders}</strong><span>All orders</span></div>
      <div class="stat"><strong>${rs(st.revenue)}</strong><span>Completed sales</span></div>
      <div class="stat"><strong>${st.users}</strong><span>Accounts</span></div>
      <div class="stat"><strong>${st.open_tickets}</strong><span>Open reports</span></div>
      <div class="stat"><strong>${st.pending_stores}</strong><span>Stores to approve</span></div>
    </div>
    <div class="seg-tabs flex-wrap" role="tablist" aria-label="Admin sections">
      ${[['orders', `Active orders <span class="seg-count">${activeOrders.length}</span>`], ['all', 'All orders'], ['stores', `Stores <span class="seg-count">${st.pending_stores}</span>`], ['tickets', `Reports <span class="seg-count">${st.open_tickets}</span>`], ['messages', 'Messages'], ['users', 'Users']]
        .map(([k, l]) => `<button type="button" role="tab" class="seg-tab" aria-selected="${tab === k}" data-admtab="${k}">${l}</button>`).join('')}
    </div>
    <div id="adminPanel">${adminPanel(tab, d)}</div>`;
}

function adminPanel(tab, d) {
  if (tab === 'orders' || tab === 'all') {
    const list = tab === 'orders' ? d.orders.filter(isActive) : d.orders;
    if (!list.length) return emptyState({ title: 'No orders here', text: 'New orders from every store appear here.' });
    return `<div class="dash-grid">${list.map((o) => dashOrderCard(o, { showStore: true }).replace('<div class="btns">', `<div class="btns">${isActive(o) ? `<button type="button" class="btn btn-sm btn-outline-danger" data-action="admin-cancel" data-oid="${esc(o.id)}">Cancel</button> ` : ''}`)).join('')}</div>`;
  }
  if (tab === 'stores') {
    return `<div class="table-responsive panel p-0"><table class="table align-middle mb-0 dash-table">
      <thead><tr><th>Store</th><th>Type</th><th>Area</th><th>Owner</th><th>Status</th><th></th></tr></thead>
      <tbody>${d.stores.map((s) => `<tr>
        <td>${vendorLogo(s)} <strong class="ms-2">${esc(s.name)}</strong>${s.isDemo ? ' <span class="badge text-bg-light">Demo</span>' : ''}</td>
        <td>${esc(s.kind)}</td><td>${esc(s.area)}</td>
        <td>${s.ownerEmail ? esc(s.ownerEmail) : `<form class="d-flex gap-1 owner-form" data-store="${esc(s.id)}"><input type="email" class="form-control form-control-sm" placeholder="owner@email.com" aria-label="Owner email for ${esc(s.name)}" required><button class="btn btn-sm btn-outline-dark" type="submit">Assign</button></form>`}</td>
        <td><span class="status-tag ${s.status === 'active' ? 'done' : s.status === 'suspended' ? 'stopped' : ''}">${esc(s.status)}</span></td>
        <td class="text-end text-nowrap">
          ${s.status !== 'active' ? `<button type="button" class="btn btn-sm btn-dark" data-action="store-status" data-id="${esc(s.id)}" data-status="active">${s.status === 'pending' ? 'Approve' : 'Reactivate'}</button>` : ''}
          ${s.status === 'active' ? `<button type="button" class="btn btn-sm btn-outline-danger" data-action="store-status" data-id="${esc(s.id)}" data-status="suspended">Suspend</button>` : ''}
        </td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'tickets') {
    if (!d.tickets.length) return emptyState({ title: 'No reports', text: 'Problem reports from customers appear here.' });
    return d.tickets.map((t) => `<article class="order-card">
      <div class="order-top"><div><p class="order-title">${esc(t.id)} · ${esc(t.type)}</p><span class="order-meta">${esc(t.user_name)} (${esc(t.user_email)}) · ${fmtDate(t.created_at)}${t.order_id ? ` · order ${esc(t.order_id)}` : ''}</span></div>
      <span class="status-tag ${t.status === 'resolved' ? 'done' : ''}">${t.status === 'resolved' ? 'Resolved' : 'Open'}</span></div>
      <p class="mt-2 mb-2">${esc(t.description)}</p>
      <form class="ticket-form d-flex gap-2 flex-wrap" data-id="${esc(t.id)}">
        <label class="visually-hidden" for="tr-${esc(t.id)}">Reply</label>
        <input id="tr-${esc(t.id)}" class="form-control flex-grow-1" style="min-width:220px" maxlength="1000" placeholder="Reply to the customer" value="${esc(t.reply)}">
        <button type="submit" class="btn btn-dark" name="resolve">${t.status === 'resolved' ? 'Update reply' : 'Reply and resolve'}</button>
      </form></article>`).join('');
  }
  if (tab === 'messages') {
    const sel = ui.adminThread;
    return `<div class="admin-chat">
      <div class="panel p-0 convo-list">${d.conversations.length ? d.conversations.map((c) => `<button type="button" class="convo ${sel === c.user_id ? 'active' : ''}" data-action="open-thread" data-id="${c.user_id}"><strong>${esc(c.name)}</strong><small>${esc(c.email)}</small><small>${fmtDate(c.last_at)}${c.last_from === 'user' ? ' · <span class="text-danger fw-semibold">waiting for reply</span>' : ''}</small></button>`).join('') : '<p class="p-3 mb-0 text-body-secondary">No conversations yet.</p>'}</div>
      <div class="panel chat-panel admin-thread">${sel ? `<div class="chat-log" id="adminThreadLog">${loadingState()}</div>
        <form class="chat-input" id="adminReplyForm"><label for="adminReply" class="visually-hidden">Reply</label><input id="adminReply" class="form-control" maxlength="1000" placeholder="Write a reply" autocomplete="off"><button type="submit" class="btn btn-mango" aria-label="Send reply"><i class="bi bi-send-fill" aria-hidden="true"></i></button></form>`
        : emptyState({ title: 'Choose a conversation', text: 'Pick a customer on the left to read and reply.' })}</div>
    </div>`;
  }
  return `<div class="table-responsive panel p-0"><table class="table align-middle mb-0 dash-table">
    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
    <tbody>${d.users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${esc(u.role)}${u.store_id ? ` (${esc(u.store_id)})` : ''}</td><td>${fmtDate(u.created_at)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadAdminThread() {
  if (!ui.adminThread) return;
  const res = await tryApi(`/admin/messages/${ui.adminThread}`);
  const log = $('#adminThreadLog');
  if (!res || !log) return;
  log.innerHTML = res.messages.map((m) => `<div class="msg ${m.from_role === 'support' ? 'user' : 'bot'}">${esc(m.body)}<span class="msg-time">${m.from_role === 'support' ? 'Support' : 'Customer'} · ${fmtDate(m.created_at)}</span></div>`).join('');
  log.scrollTop = log.scrollHeight;
}

/* ============================================================= ROUTER */
const VIEW_FOR = { home: 'home', restaurants: 'vendors', shops: 'vendors', vendor: 'vendor', browse: 'browse', checkout: 'checkout', orders: 'orders', track: 'track', favourites: 'favourites', account: 'account', settings: 'settings', help: 'help', login: 'login', partner: 'partner', admin: 'admin', notfound: 'notfound' };
const TAB_FOR = { home: 'home', restaurants: 'home', shops: 'home', vendor: 'home', browse: 'browse', checkout: 'home', orders: 'orders', track: 'orders', favourites: 'favourites', account: 'account', settings: 'account', help: 'account', login: 'account', partner: 'account', admin: 'account' };
const NEEDS_LOGIN = { orders: 'Log in to see your orders.', track: 'Log in to track your order.', favourites: 'Log in to see your favourites.', account: 'Log in to see your account.', partner: 'Log in or create an account to sell on Mangao.', admin: 'Log in as an admin.' };

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

/** Poll the server while a live page is open (tracking, store dashboard, admin, chat). */
function startPolling(r) {
  clearInterval(ui.pollTimer);
  ui.pollTimer = null;
  const every = (ms, fn) => { ui.pollTimer = setInterval(() => { if (!document.hidden) fn(); }, ms); };
  if (r.name === 'track') every(10000, () => refreshOrder(r.params.id));
  else if (r.name === 'orders') every(20000, async () => { await loadOrders(); if (ui.route.name === 'orders') renderOrders(); });
  else if (r.name === 'help' && isLoggedIn()) every(8000, loadMessages);
  else if (r.name === 'partner' && session.user?.role === 'partner') every(15000, async () => {
    const before = session.partner?.orders.filter((o) => o.status === 'placed').length || 0;
    await loadPartner();
    const after = session.partner?.orders.filter((o) => o.status === 'placed').length || 0;
    if (after > before) toast('New order received!', { icon: 'bi-bell-fill', type: 'ok', ms: 6000 });
    if (ui.route.name === 'partner' && !$('#partnerBody').contains(document.activeElement)) renderPartner();
  });
  else if (r.name === 'admin' && session.user?.role === 'admin') every(20000, async () => {
    await loadAdmin();
    if (ui.route.name === 'admin' && !$('#adminBody').contains(document.activeElement)) { renderAdmin(); loadAdminThread(); }
  });
  else if (isLoggedIn() && session.orders.some(isActive)) every(30000, loadOrders);
}

function router() {
  const prev = ui.route.name;
  ui.route = parseHash();
  const r = ui.route;

  // Close any open overlay when navigating.
  ['#productModal', '#addressModal', '#confirmModal'].forEach((s) => bootstrap.Modal.getInstance(s)?.hide());
  bootstrap.Offcanvas.getInstance('#cartPanel')?.hide();

  if (NEEDS_LOGIN[r.name] && !isLoggedIn()) {
    afterLogin = location.hash;
    ui.authReason = NEEDS_LOGIN[r.name];
    location.replace('#/login');
    return;
  }
  if (r.name === 'admin' && session.user.role !== 'admin') { location.replace('#/'); return; }

  if (r.name === 'browse') {
    if ('cat' in r.query) ui.activeCategory = CATEGORIES.some((c) => c.value === r.query.cat) ? r.query.cat : 'all';
    if ('q' in r.query) setSearch(r.query.q, { navigate: false });
  }
  if (r.name === 'vendor' && prev !== 'vendor') ui.vendorSearch = '';
  if (r.name === 'help' && prev !== 'help') ui.lastCase = null;
  if (r.name === 'checkout' && !isLoggedIn() && state.cart.length) {
    afterLogin = '#/checkout';
    ui.authReason = 'Log in or create an account to place your order. Your basket is saved.';
    location.replace('#/login');
    return;
  }

  showView(VIEW_FOR[r.name]);
  ({
    home: renderHome,
    restaurants: () => renderVendors('restaurant'),
    shops: () => renderVendors('shop'),
    vendor: () => renderVendor(r.params.id),
    browse: renderBrowse,
    checkout: () => renderCheckout(true),
    orders: renderOrders,
    track: () => { renderTrack(r.params.id); refreshOrder(r.params.id); },
    favourites: renderFavourites,
    account: renderAccount,
    settings: renderSettings,
    help: renderHelp,
    login: renderLogin,
    partner: () => { if (session.user.role === 'partner') { session.partner = null; } renderPartner(); },
    admin: () => { session.admin = null; renderAdmin(); },
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
  startPolling(r);
  if (prev !== r.name || r.name === 'vendor' || r.name === 'track') {
    window.scrollTo({ top: 0, behavior: 'auto' });
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
        const a = session.addresses.find((x) => String(x.id) === id);
        if (a) { $('#coAddress').value = a.line; $('#coArea').value = a.area; state.selectedAddressId = a.id; saveState(); renderHeaderAddress(); clearErrors($('#deliveryFields')); }
        break;
      }
      case 'focus-field': e.preventDefault(); document.getElementById(el.dataset.target)?.focus(); break;
      case 'reorder': reorder(oid); break;
      case 'cancel-order': {
        confirmDialog('Cancel this order?', 'You can cancel until the store accepts your order.', 'Cancel order', async () => {
          const res = await tryApi(`/orders/${encodeURIComponent(oid)}/cancel`, { method: 'POST' });
          if (!res) return;
          const i = session.orders.findIndex((o) => o.id === oid);
          if (i !== -1) session.orders[i] = res.order;
          updateActiveDot();
          if (ui.route.name === 'track') renderTrack(oid);
          toast(`${oid} cancelled`, { icon: 'bi-x-circle' });
        });
        break;
      }
      case 'rate': {
        tryApi(`/orders/${encodeURIComponent(oid)}/rate`, { method: 'POST', body: { stars: Number(el.dataset.stars) } }).then((res) => {
          if (!res) return;
          const i = session.orders.findIndex((o) => o.id === oid);
          if (i !== -1) session.orders[i] = res.order;
          if (ui.route.name === 'orders') renderOrders();
          if (ui.route.name === 'track') renderTrack(oid);
          toast(`Thanks — you rated this order ${res.order.rating} out of 5`, { icon: 'bi-star-fill' });
        });
        break;
      }
      case 'default-address':
        tryApi(`/addresses/${id}/default`, { method: 'POST' }).then((res) => {
          if (!res) return;
          session.addresses.forEach((a) => { a.is_default = String(a.id) === id; });
          state.selectedAddressId = Number(id);
          saveState(); renderAccount(); renderHeaderAddress();
          toast('Default address updated');
        });
        break;
      case 'delete-address': {
        const a = session.addresses.find((x) => String(x.id) === id);
        if (!a) break;
        confirmDialog('Delete this address?', `${a.label}: ${a.line}, ${a.area}`, 'Delete', async () => {
          if (!(await tryApi(`/addresses/${id}`, { method: 'DELETE' }))) return;
          await loadAddresses();
          renderAccount();
          toast('Address deleted', { icon: 'bi-trash3' });
        });
        break;
      }
      case 'chat-starter': $('#chatInput').value = el.dataset.text; $('#chatInput').focus(); break;
      case 'logout': logout(); break;
      case 'set-status': {
        const refresh = ui.route.name === 'admin'
          ? async () => { await loadAdmin(); renderAdmin(); }
          : async () => { await loadPartner(); renderPartner(); };
        partnerStatus(oid, el.dataset.status, refresh);
        break;
      }
      case 'admin-cancel':
        confirmDialog('Cancel this order?', `Order ${oid} will be cancelled and the customer will see it as cancelled.`, 'Cancel order', () => partnerStatus(oid, 'cancelled', async () => { await loadAdmin(); renderAdmin(); }));
        break;
      case 'admin-refresh': withBusy(el, 'Refreshing…', async () => { await loadAdmin(); }).then(() => { renderAdmin(); loadAdminThread(); }); break;
      case 'store-status':
        tryApi(`/admin/stores/${encodeURIComponent(id)}`, { method: 'POST', body: { status: el.dataset.status } }).then(async (res) => {
          if (!res) return;
          toast(`${res.store.name} is now ${res.store.status}`, { type: 'ok' });
          await loadAdmin(); renderAdmin(); loadCatalog();
        });
        break;
      case 'open-thread': ui.adminThread = Number(id); renderAdmin(); loadAdminThread(); break;
      case 'delete-product':
        confirmDialog('Delete this item?', 'It will be removed from your menu.', 'Delete', async () => {
          if (!(await tryApi(`/partner/products/${encodeURIComponent(id)}`, { method: 'DELETE' }))) return;
          await loadPartner(); renderPartner(); loadCatalog();
          toast('Item deleted', { icon: 'bi-trash3' });
        });
        break;
      default: break;
    }
  });

  // Dashboard tabs
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-ptab]');
    if (p) { ui.partnerTab = p.dataset.ptab; renderPartner(); return; }
    const a = e.target.closest('[data-admtab]');
    if (a) { ui.adminTab = a.dataset.admtab; renderAdmin(); if (ui.adminTab === 'messages') loadAdminThread(); return; }
    const t = e.target.closest('[data-atab]');
    if (t) { ui.authTab = t.dataset.atab; renderLogin(); (ui.authTab === 'login' ? $('#liEmail') : $('#rgName')).focus(); }
  });

  // Dashboard forms and inline edits (delegated, because these are re-rendered)
  document.addEventListener('submit', async (e) => {
    const f = e.target;
    if (f.id === 'partnerApplyForm') {
      e.preventDefault();
      clearErrors(f);
      const fields = { paName: 'Enter your restaurant or shop name.', paKind: 'Enter what you sell.', paArea: 'Choose your area.', paAddress: 'Enter the full address.', paPhone: 'Enter a contact number like 0300 1234567.' };
      const errs = Object.entries(fields).filter(([idf]) => {
        const v = $(`#${idf}`).value.trim();
        if (idf === 'paPhone') return !PHONE_RE.test(normPhone(v));
        if (idf === 'paAddress') return v.length < 8;
        return v.length < 2;
      }).map(([idf, msg]) => ({ el: $(`#${idf}`), msg }));
      if (showFormErrors($('#paErrors'), errs)) return;
      const res = await withBusy(f.querySelector('button[type="submit"]'), 'Submitting…', () => tryApi('/partner/apply', { method: 'POST', body: {
        name: $('#paName').value.trim(), type: $('#paType').value, kind: $('#paKind').value.trim(), area: $('#paArea').value,
        address: $('#paAddress').value.trim(), phone: $('#paPhone').value.trim(),
      } }));
      if (!res) return;
      session.user = res.user;
      renderAuthUI();
      ui.partnerTab = 'menu';
      await loadPartner();
      renderPartner();
      startPolling(ui.route);
      toast('Thanks! Your store was submitted for approval.', { type: 'ok', ms: 5000 });
    } else if (f.id === 'productForm') {
      e.preventDefault();
      const name = $('#prName').value.trim();
      const price = Number($('#prPrice').value);
      const errs = [];
      if (name.length < 2) errs.push({ el: $('#prName'), msg: 'Enter the item name.' });
      if (!Number.isInteger(price) || price < 1) errs.push({ el: $('#prPrice'), msg: 'Enter a price in whole rupees.' });
      if (showFormErrors($('#prErrors'), errs)) return;
      const res = await tryApi('/partner/products', { method: 'POST', body: {
        name, price, section: $('#prSection').value.trim(), category: $('#prCategory').value, description: $('#prDesc').value.trim(), image: $('#prImage').value,
      } });
      if (!res) return;
      await loadPartner(); renderPartner(); loadCatalog();
      toast(`${res.product.name} added to your menu`, { type: 'ok' });
      $('#prName')?.focus();
    } else if (f.id === 'storeSettingsForm') {
      e.preventDefault();
      const res = await tryApi('/partner/store', { method: 'PATCH', body: {
        etaMin: Number($('#ssEtaMin').value), etaMax: Number($('#ssEtaMax').value), deliveryFee: Number($('#ssFee').value), minOrder: Number($('#ssMin').value),
      } });
      if (!res) return;
      session.partner.store = res.store;
      renderPartner(); loadCatalog();
      toast('Store settings saved', { type: 'ok' });
    } else if (f.classList.contains('owner-form')) {
      e.preventDefault();
      const email = f.querySelector('input').value.trim();
      const res = await tryApi(`/admin/stores/${encodeURIComponent(f.dataset.store)}/owner`, { method: 'POST', body: { email } });
      if (!res) return;
      toast(`${email} now manages this store`, { type: 'ok' });
      await loadAdmin(); renderAdmin();
    } else if (f.classList.contains('ticket-form')) {
      e.preventDefault();
      const reply = f.querySelector('input').value.trim();
      const res = await tryApi(`/admin/tickets/${encodeURIComponent(f.dataset.id)}`, { method: 'POST', body: { status: 'resolved', reply } });
      if (!res) return;
      toast(`${res.ticket.id} resolved`, { type: 'ok' });
      await loadAdmin(); renderAdmin();
    } else if (f.id === 'adminReplyForm') {
      e.preventDefault();
      const input = $('#adminReply');
      const text = input.value.trim();
      if (!text) return;
      const res = await tryApi(`/admin/messages/${ui.adminThread}`, { method: 'POST', body: { body: text } });
      if (!res) return;
      input.value = '';
      await loadAdminThread();
      input.focus();
    }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'storeOpen') {
      const res = await tryApi('/partner/store', { method: 'PATCH', body: { isOpen: t.checked } });
      if (!res) { t.checked = !t.checked; return; }
      session.partner.store = res.store;
      renderPartner(); loadCatalog();
      toast(res.store.isOpen ? 'Your store is open for orders' : 'Your store is closed — customers can browse but not order', { icon: 'bi-shop' });
    } else if (t.dataset.actionChange === 'available') {
      const res = await tryApi(`/partner/products/${encodeURIComponent(t.dataset.id)}`, { method: 'PATCH', body: { available: t.checked } });
      if (!res) { t.checked = !t.checked; return; }
      loadCatalog();
      toast(`${res.product.name} ${res.product.available ? 'is available' : 'marked sold out'}`, { icon: 'bi-check2' });
    } else if (t.dataset.actionChange === 'price') {
      const price = Number(t.value);
      if (!Number.isInteger(price) || price < 1) { toast('Enter a price in whole rupees.', { type: 'err', icon: 'bi-exclamation-triangle-fill' }); return; }
      const res = await tryApi(`/partner/products/${encodeURIComponent(t.dataset.id)}`, { method: 'PATCH', body: { price } });
      if (!res) return;
      loadCatalog();
      toast(`${res.product.name} price set to ${rs(res.product.price)}`, { icon: 'bi-check2' });
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

  // Promo input Enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('#cartPromo, #coPromo')) {
      e.preventDefault();
      applyPromo(e.target.value, document.getElementById(`${e.target.id}Msg`));
    }
  });

  // Checkout
  $('#checkoutForm').addEventListener('submit', (e) => { e.preventDefault(); placeOrder(); });
  $('#checkoutForm').addEventListener('input', (e) => {
    clearFieldError(e);
    if (e.target.id === 'coNotes') $('#coNotesCount').textContent = `${e.target.value.length} / 200`;
  });

  // Auth
  $('#loginForm').addEventListener('submit', submitLogin);
  $('#registerForm').addEventListener('submit', submitRegister);
  $('#loginForm').addEventListener('input', clearFieldError);
  $('#registerForm').addEventListener('input', clearFieldError);

  // Account
  $('#profileForm').addEventListener('submit', saveProfile);
  $('#addressForm').addEventListener('submit', saveAddress);
  $('#addAddressToggle').addEventListener('click', () => toggleAddressForm($('#addressForm').hidden));
  $('#cancelAddress').addEventListener('click', () => { $('#addressForm').reset(); clearErrors($('#addressForm')); toggleAddressForm(false); });
  $('#addressModal').addEventListener('change', (e) => {
    if (e.target.name === 'addrPick') {
      state.selectedAddressId = Number(e.target.value);
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
  $('#spDesc').setAttribute('maxlength', '1000');
  $('#spDescCount').textContent = '0 / 1000';
  $('#spDesc').addEventListener('input', (e) => { $('#spDescCount').textContent = `${e.target.value.length} / 1000`; });
  $('#supportForm').addEventListener('input', clearFieldError);
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#chatInput').value; $('#chatInput').value = ''; sendChat(v); });

  // Promo banner copy
  $('#copyPromoBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('MANGO150'); toast('MANGO150 copied — paste it at checkout', { icon: 'bi-clipboard-check' }); }
    catch { toast('Code: MANGO150 — type it at checkout', { icon: 'bi-ticket-perforated' }); }
  });

  window.addEventListener('hashchange', router);
  // Keep other tabs in sync (basket and settings)
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) { state = loadState(); applySettings(); syncModeUI(); refreshCartUI(); } });
}

/* =============================================================== BOOT */
async function loadCatalog() {
  try {
    const data = await api('/catalog');
    setCatalog(data.stores, data.products);
    ui.catalogLoaded = true;
    return true;
  } catch (err) {
    return false;
  }
}

async function boot() {
  applySettings();
  bindEvents();
  bindSettings();
  paintMangi();
  syncModeUI();
  renderAuthUI();
  $('#categoryTiles').innerHTML = loadingState('Loading stores…');

  const [ok] = await Promise.all([loadCatalog(), loadSession()]);
  if (!ok) {
    $('#main').innerHTML = `<div class="container-xl page-pad">${emptyState({ mood: 'sad', title: "We couldn't load Mangao", text: 'Check your internet connection and try again.', actions: '<button type="button" class="btn btn-mango" onclick="location.reload()">Try again</button>' })}</div>`;
    paintMangi();
    return;
  }
  renderAuthUI();
  await loadAccountData();
  router();
}
document.addEventListener('DOMContentLoaded', boot);
