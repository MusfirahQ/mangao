/* =========================================================================
   Mangao — interface data
   Fixed lists used by the interface: images, categories, statuses, areas.
   Stores and products are loaded from the database through the API.
   ========================================================================= */

/* Images: each key has an optional remote photo plus an emoji illustration.
   If the photo is missing, fails to load, or photos are turned off in
   Settings, the card shows the illustrated tile instead. */
const UNSPLASH = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

const IMAGES = {
  pizza:        { photo: UNSPLASH('1513104890138-7c749659a591'), emoji: '🍕' },
  pizza2:       { photo: UNSPLASH('1565299624946-b28f40a0ae38'), emoji: '🍕' },
  burger:       { photo: UNSPLASH('1568901346375-23c9450c58cd'), emoji: '🍔' },
  burger2:      { photo: UNSPLASH('1550547660-d9450f859349'), emoji: '🍔' },
  fries:        { photo: UNSPLASH('1573080496219-bb080dd4f877'), emoji: '🍟' },
  friedChicken: { photo: UNSPLASH('1626082927389-6cd097cdc6ec'), emoji: '🍗' },
  wings:        { photo: null, emoji: '🍗' },
  nuggets:      { photo: null, emoji: '🍗' },
  garlicBread:  { photo: null, emoji: '🥖' },
  wrap:         { photo: null, emoji: '🌯' },
  sandwich:     { photo: UNSPLASH('1528735602780-2552fd46c7af'), emoji: '🥪' },
  biryani:      { photo: UNSPLASH('1563379091339-03b21ab4a4f8'), emoji: '🍛' },
  curry:        { photo: UNSPLASH('1585937421612-70a008356fbe'), emoji: '🍲' },
  bbq:          { photo: UNSPLASH('1555939594-58d7cb561ad1'), emoji: '🍢' },
  naan:         { photo: null, emoji: '🫓' },
  daal:         { photo: null, emoji: '🥣' },
  salad:        { photo: UNSPLASH('1512621776951-a57141f2eefd'), emoji: '🥗' },
  dessert:      { photo: UNSPLASH('1563805042-7684c019e1cb'), emoji: '🍨' },
  cake:         { photo: UNSPLASH('1578985545062-69928b1d9587'), emoji: '🎂' },
  shake:        { photo: UNSPLASH('1572490122747-3968b75cc699'), emoji: '🥤' },
  softDrink:    { photo: null, emoji: '🥤' },
  coffee:       { photo: UNSPLASH('1509042239860-f550ce710b93'), emoji: '☕' },
  coffee2:      { photo: UNSPLASH('1495474472287-4d71bcdd2085'), emoji: '☕' },
  donut:        { photo: UNSPLASH('1551024601-bec78aea704b'), emoji: '🍩' },
  croissant:    { photo: UNSPLASH('1555507036-ab1f4038808a'), emoji: '🥐' },
  patty:        { photo: null, emoji: '🥟' },
  brownie:      { photo: null, emoji: '🍫' },
  milk:         { photo: null, emoji: '🥛' },
  eggs:         { photo: UNSPLASH('1582722872445-44dc5f7e3c8f'), emoji: '🥚' },
  bread:        { photo: UNSPLASH('1509440159596-0249088772ff'), emoji: '🍞' },
  bananas:      { photo: UNSPLASH('1571771894821-ce9b6c11b08e'), emoji: '🍌' },
  vegetables:   { photo: UNSPLASH('1540420773420-3366772f4999'), emoji: '🥬' },
  tomato:       { photo: null, emoji: '🍅' },
  onion:        { photo: null, emoji: '🧅' },
  chicken:      { photo: null, emoji: '🍗' },
  water:        { photo: null, emoji: '💧' },
  rice:         { photo: null, emoji: '🍚' },
  flour:        { photo: null, emoji: '🌾' },
  sugar:        { photo: null, emoji: '🧂' },
  oil:          { photo: null, emoji: '🫗' },
  tea:          { photo: null, emoji: '🍵' },
  yogurt:       { photo: null, emoji: '🥣' },
  ketchup:      { photo: null, emoji: '🥫' },
  spices:       { photo: null, emoji: '🌶️' },
  detergent:    { photo: null, emoji: '🧺' },
  dishLiquid:   { photo: null, emoji: '🧽' },
  soap:         { photo: null, emoji: '🧼' },
  toothpaste:   { photo: null, emoji: '🪥' },
  tissues:      { photo: null, emoji: '🧻' },
  batteries:    { photo: null, emoji: '🔋' },
  shampoo:      { photo: null, emoji: '🧴' },
  sanitizer:    { photo: null, emoji: '🧴' },
  masks:        { photo: null, emoji: '😷' },
  diapers:      { photo: null, emoji: '👶' },
  bulb:         { photo: null, emoji: '💡' },
  /* store covers */
  supermarket:  { photo: UNSPLASH('1542838132-92c53300491e'), emoji: '🛒' },
  supermarket2: { photo: UNSPLASH('1604719312566-8912e9227c6a'), emoji: '🛒' },
  aisle:        { photo: UNSPLASH('1578916171728-46686eac8d58'), emoji: '🛍️' },
  pharmacy:     { photo: null, emoji: '💊' },
  bakery:       { photo: UNSPLASH('1517433670267-08bbd4be890f'), emoji: '🥐' },
};

const CATEGORIES = [
  { value: 'food',       label: 'Food',                emoji: '🍔', blurb: 'Meals from restaurants and bakeries' },
  { value: 'groceries',  label: 'Groceries',           emoji: '🥦', blurb: 'Fresh produce, dairy and pantry' },
  { value: 'essentials', label: 'Everyday Essentials', emoji: '🧴', blurb: 'Home care, personal care and more' },
];

/* Stores and products now come from the server (GET /api/catalog) when the app starts.
   VENDORS = [{ id, name, type, kind, tags, rating, ratings, eta, deliveryFee, freeDeliveryOver,
                minOrder, area, color, cover, featured, isDemo, isOpen }]
   PRODUCTS = [{ id, vendorId, section, name, category, price, image, description, featured, isNew, available }] */
let VENDORS = [];
let PRODUCTS = [];

const SUPPORT_TYPES = [
  'Order or checkout question',
  'Missing or incorrect item',
  'Delivery/pickup question',
  'Payment question',
  'Other',
];

/* Order status flow (same as the server) */
const ORDER_FLOW = {
  delivery: ['placed', 'accepted', 'preparing', 'on_the_way', 'delivered'],
  pickup: ['placed', 'accepted', 'preparing', 'ready', 'collected'],
};
const STATUS_LABEL = {
  placed: 'Order placed', accepted: 'Accepted', preparing: 'Being prepared', on_the_way: 'On the way',
  delivered: 'Delivered', ready: 'Ready for pickup', collected: 'Collected', cancelled: 'Cancelled', rejected: 'Declined by store',
};
const STATUS_TEXT = {
  placed: 'Your order has been sent to the store. It will be accepted shortly.',
  accepted: 'The store has accepted your order.',
  preparing: 'Your items are being prepared and packed.',
  on_the_way: 'A rider is bringing your order to you.',
  delivered: 'Delivered. Enjoy!',
  ready: 'Your order is ready to collect from the store.',
  collected: 'Collected. Enjoy!',
  cancelled: 'This order was cancelled.',
  rejected: 'The store could not take this order. You have not been charged.',
};
const FINAL_STATUSES = ['delivered', 'collected', 'cancelled', 'rejected'];

const LAHORE_AREAS = ['Johar Town', 'DHA', 'Gulberg', 'Model Town', 'Bahria Town', 'Wapda Town', 'Township', 'Garden Town', 'Cantt', 'Iqbal Town'];
