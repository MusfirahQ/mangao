/* =========================================================================
   Mangao — sample data
   Everything here is local demo data. Restaurant and shop names are used
   as realistic placeholders for a student project; there is no affiliation,
   live menu, real pricing or real availability behind them.
   The shapes are kept stable so this file can later be swapped for API calls.
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

/* Vendor = { id, name, type, kind, tags, rating, ratings, eta, deliveryFee,
              freeDeliveryOver, minOrder, area, color, cover, featured } */
const VENDORS = [
  // ---- Restaurants ----
  { id: 'pizza-hut',  name: 'Pizza Hut',          type: 'restaurant', kind: 'Pizza',          tags: ['Pizza', 'Fast food'],      rating: 4.5, ratings: 3200, eta: [30, 40], deliveryFee: 129, freeDeliveryOver: 2500, minOrder: 500, area: 'Gulberg III',   color: '#C8102E', cover: 'pizza',        featured: true },
  { id: 'ny212',      name: 'NY212',              type: 'restaurant', kind: 'Burgers',        tags: ['Burgers', 'American'],     rating: 4.7, ratings: 1850, eta: [25, 35], deliveryFee: 149, freeDeliveryOver: 3000, minOrder: 600, area: 'MM Alam Road',  color: '#1F1F1F', cover: 'burger',       featured: true },
  { id: 'kfc',        name: 'KFC',                type: 'restaurant', kind: 'Fried chicken',  tags: ['Fried chicken', 'Burgers'],rating: 4.4, ratings: 5400, eta: [20, 30], deliveryFee: 99,  freeDeliveryOver: 1500, minOrder: 400, area: 'Johar Town',    color: '#A6192E', cover: 'friedChicken', featured: true },
  { id: 'mcdonalds',  name: "McDonald's",         type: 'restaurant', kind: 'Burgers',        tags: ['Burgers', 'Fast food'],    rating: 4.3, ratings: 4700, eta: [20, 30], deliveryFee: 99,  freeDeliveryOver: 1500, minOrder: 400, area: 'Model Town',    color: '#DA291C', cover: 'burger2',      featured: false },
  { id: 'cheezious',  name: 'Cheezious',          type: 'restaurant', kind: 'Pizza',          tags: ['Pizza', 'Local favourite'],rating: 4.6, ratings: 2900, eta: [30, 45], deliveryFee: 0,   freeDeliveryOver: 0,    minOrder: 700, area: 'Wapda Town',    color: '#F2A900', cover: 'pizza2',       featured: true },
  { id: 'johnny-jugnu', name: 'Johnny & Jugnu',   type: 'restaurant', kind: 'Burgers',        tags: ['Burgers', 'Wraps'],        rating: 4.5, ratings: 1400, eta: [25, 35], deliveryFee: 119, freeDeliveryOver: 2000, minOrder: 500, area: 'DHA Phase 5',   color: '#2B2B2B', cover: 'fries',        featured: false },
  { id: 'bundu-khan', name: 'Bundu Khan',         type: 'restaurant', kind: 'Pakistani',      tags: ['BBQ', 'Pakistani'],        rating: 4.6, ratings: 2100, eta: [35, 50], deliveryFee: 149, freeDeliveryOver: 3000, minOrder: 800, area: 'Liberty',       color: '#7A1F1F', cover: 'bbq',          featured: true },
  { id: 'butt-karahi',name: 'Butt Karahi',        type: 'restaurant', kind: 'Pakistani',      tags: ['Karahi', 'Pakistani'],     rating: 4.7, ratings: 2600, eta: [40, 55], deliveryFee: 159, freeDeliveryOver: 3500, minOrder: 900, area: 'Lakshmi Chowk', color: '#8B4513', cover: 'curry',        featured: false },
  { id: 'student-biryani', name: 'Student Biryani', type: 'restaurant', kind: 'Biryani',      tags: ['Biryani', 'Pakistani'],    rating: 4.4, ratings: 1950, eta: [25, 35], deliveryFee: 89,  freeDeliveryOver: 1200, minOrder: 350, area: 'Johar Town',    color: '#B5651D', cover: 'biryani',      featured: false },
  { id: 'optp',       name: 'OPTP',               type: 'restaurant', kind: 'Fast food',      tags: ['Fries', 'Burgers'],        rating: 4.3, ratings: 1700, eta: [20, 30], deliveryFee: 99,  freeDeliveryOver: 1500, minOrder: 400, area: 'Gulberg II',    color: '#E4002B', cover: 'sandwich',     featured: false },
  { id: 'tim-hortons',name: 'Tim Hortons',        type: 'restaurant', kind: 'Coffee & bakery',tags: ['Coffee', 'Donuts'],        rating: 4.6, ratings: 2300, eta: [20, 30], deliveryFee: 119, freeDeliveryOver: 2000, minOrder: 450, area: 'DHA Phase 6',   color: '#C8102E', cover: 'coffee',       featured: true },

  // ---- Shops ----
  { id: 'carrefour',  name: 'Carrefour',          type: 'shop', kind: 'Supermarket',       tags: ['Groceries', 'Household'],   rating: 4.6, ratings: 3900, eta: [30, 45], deliveryFee: 149, freeDeliveryOver: 3000, minOrder: 1000, area: 'Packages Mall',  color: '#004E9F', cover: 'supermarket',  featured: true },
  { id: 'al-fatah',   name: 'Al-Fatah',           type: 'shop', kind: 'Supermarket',       tags: ['Groceries', 'Essentials'],  rating: 4.7, ratings: 3100, eta: [25, 40], deliveryFee: 129, freeDeliveryOver: 2500, minOrder: 800,  area: 'Gulberg',        color: '#0B7A3E', cover: 'supermarket2', featured: true },
  { id: 'imtiaz',     name: 'Imtiaz Super Market',type: 'shop', kind: 'Supermarket',       tags: ['Groceries', 'Fresh'],       rating: 4.5, ratings: 1800, eta: [30, 45], deliveryFee: 99,  freeDeliveryOver: 2000, minOrder: 800,  area: 'Bahria Town',    color: '#E30613', cover: 'vegetables',   featured: false },
  { id: 'metro',      name: 'METRO',              type: 'shop', kind: 'Supermarket',       tags: ['Bulk buys', 'Groceries'],   rating: 4.4, ratings: 1200, eta: [40, 60], deliveryFee: 199, freeDeliveryOver: 5000, minOrder: 1500, area: 'Thokar Niaz Baig', color: '#003D7C', cover: 'aisle',     featured: false },
  { id: 'd-watson',   name: 'D.Watson',           type: 'shop', kind: 'Pharmacy & beauty', tags: ['Personal care', 'Baby'],    rating: 4.6, ratings: 1500, eta: [25, 35], deliveryFee: 99,  freeDeliveryOver: 1500, minOrder: 500,  area: 'Johar Town',     color: '#0067B1', cover: 'pharmacy',     featured: true },
  { id: 'jalal-sons', name: 'Jalal Sons',         type: 'shop', kind: 'Bakery',            tags: ['Bakery', 'Deli'],           rating: 4.7, ratings: 2200, eta: [25, 35], deliveryFee: 119, freeDeliveryOver: 2000, minOrder: 500,  area: 'DHA Phase 3',    color: '#6B2D1F', cover: 'bakery',       featured: false },
  { id: 'gourmet',    name: 'Gourmet Bakers',     type: 'shop', kind: 'Bakery',            tags: ['Bakery', 'Cakes'],          rating: 4.5, ratings: 2800, eta: [20, 30], deliveryFee: 79,  freeDeliveryOver: 1200, minOrder: 300,  area: 'Township',       color: '#D4145A', cover: 'croissant',    featured: false },
];

/* Product = { id, name, category, price, image, description, featured, available,
               vendorId, section, isNew } */
const PRODUCTS = [];
(function buildProducts() {
  const menus = {
    'pizza-hut': [
      ['Pizzas', 'Chicken Supreme Pizza (Medium)', 1899, 'food', 'pizza', 'Chicken, olives, onions, capsicum and mushrooms on pan crust.', { featured: true }],
      ['Pizzas', 'Chicken Tikka Pizza (Medium)', 1799, 'food', 'pizza2', 'Spicy tikka chunks, onions and jalapeños.'],
      ['Pizzas', "Cheese Lover's Pizza (Medium)", 1549, 'food', 'pizza', 'Extra mozzarella on a tomato base.'],
      ['Sides', 'Garlic Bread (4 pcs)', 449, 'food', 'garlicBread', 'Buttery, herby and baked fresh.'],
      ['Sides', 'Oven-baked Wings (6 pcs)', 799, 'food', 'wings', 'Smoky wings with a hot dip.'],
      ['Desserts & drinks', 'Chocolate Lava Cake', 399, 'food', 'cake', 'Warm cake with a molten centre.', { isNew: true }],
      ['Desserts & drinks', 'Soft Drink 1.5 L', 280, 'food', 'softDrink', 'Chilled, for sharing.'],
    ],
    'ny212': [
      ['Burgers', 'Classic Smash Burger', 1150, 'food', 'burger', 'Two smashed beef patties, cheese and house sauce.', { featured: true }],
      ['Burgers', 'Double Smash Deluxe', 1550, 'food', 'burger2', 'Double beef, double cheese, caramelised onions.'],
      ['Burgers', 'Crispy Chicken Burger', 1050, 'food', 'burger', 'Buttermilk fried chicken with slaw and pickles.'],
      ['Mains', 'Philly Cheesesteak', 1450, 'food', 'sandwich', 'Shaved beef, peppers and melted cheese in a hoagie.', { isNew: true }],
      ['Sides', 'Loaded Fries', 750, 'food', 'fries', 'Fries with cheese sauce and jalapeños.'],
      ['Shakes', 'Oreo Shake', 750, 'food', 'shake', 'Thick vanilla shake blended with cookies.'],
    ],
    'kfc': [
      ['Burgers', 'Zinger Burger', 690, 'food', 'burger', 'The crispy, spicy fillet burger.', { featured: true }],
      ['Burgers', 'Mighty Zinger', 990, 'food', 'burger2', 'Two fillets, cheese and extra sauce.'],
      ['Burgers', 'Krunch Burger', 420, 'food', 'burger', 'Crispy fillet, lettuce and mayo.'],
      ['Chicken', 'Hot Wings (10 pcs)', 790, 'food', 'wings', 'Spicy, crunchy wings.'],
      ['Chicken', 'Family Bucket (9 pcs)', 3099, 'food', 'friedChicken', 'Nine pieces of fried chicken for the table.'],
      ['Sides', 'Fries (Large)', 380, 'food', 'fries', 'Golden and lightly salted.'],
    ],
    'mcdonalds': [
      ['Burgers', 'Big Mac', 1050, 'food', 'burger2', 'Two beef patties, special sauce and sesame bun.', { featured: true }],
      ['Burgers', 'McChicken', 690, 'food', 'burger', 'Breaded chicken with lettuce and mayo.'],
      ['Burgers', 'McCrispy', 890, 'food', 'burger', 'Crispy chicken fillet on a potato bun.'],
      ['Sides', 'Chicken McNuggets (6 pcs)', 650, 'food', 'nuggets', 'With your choice of dip.'],
      ['Sides', 'Fries (Medium)', 390, 'food', 'fries', 'The classic.'],
      ['Desserts', 'McFlurry Oreo', 490, 'food', 'dessert', 'Soft serve with cookie pieces.'],
    ],
    'cheezious': [
      ['Pizzas', 'Crown Crust Pizza (Medium)', 2099, 'food', 'pizza2', 'Cheese-filled crown crust with chicken toppings.', { featured: true }],
      ['Pizzas', 'Chicken Fajita Pizza (Medium)', 1449, 'food', 'pizza', 'Fajita chicken, onions and capsicum.'],
      ['Pizzas', 'Behari Kabab Pizza (Medium)', 1549, 'food', 'pizza2', 'Smoky behari kabab with a desi kick.'],
      ['Sides', 'Pizza Fries', 690, 'food', 'fries', 'Fries topped with sauce, chicken and cheese.'],
      ['Sides', 'Oven-baked Wings (6 pcs)', 650, 'food', 'wings', 'Baked, not fried.'],
    ],
    'johnny-jugnu': [
      ['Burgers', 'Wehshi Zinger', 790, 'food', 'burger', 'Loaded zinger with jalapeños and cheese.', { featured: true }],
      ['Burgers', 'Spicy Chicken Burger', 650, 'food', 'burger2', 'Fiery fillet and cool slaw.'],
      ['Wraps', 'Crispy Chicken Wrap', 620, 'food', 'wrap', 'Crispy strips, garlic sauce and salad.'],
      ['Sides', 'Johnny Fries', 550, 'food', 'fries', 'Seasoned fries with house sauce.'],
    ],
    'bundu-khan': [
      ['BBQ', 'Chicken Tikka (Leg)', 750, 'food', 'bbq', 'Charcoal-grilled and well marinated.', { featured: true }],
      ['BBQ', 'Seekh Kabab (4 pcs)', 990, 'food', 'bbq', 'Minced beef kababs off the grill.'],
      ['Karahi', 'Chicken Karahi (Half)', 1650, 'food', 'curry', 'Tomato-rich karahi with green chilli and ginger.'],
      ['Karahi', 'Daal Mash', 650, 'food', 'daal', 'Slow-cooked white lentils with tarka.'],
      ['Breads', 'Roghni Naan', 90, 'food', 'naan', 'Soft naan with sesame.'],
    ],
    'butt-karahi': [
      ['Karahi', 'Chicken Karahi (Full)', 2600, 'food', 'curry', 'The Lakshmi Chowk classic, cooked in desi ghee.', { featured: true }],
      ['Karahi', 'Mutton Karahi (Half)', 2800, 'food', 'curry', 'Tender mutton, black pepper and tomatoes.'],
      ['Sides', 'Raita', 120, 'food', 'yogurt', 'Mint and cucumber yoghurt.'],
      ['Sides', 'Fresh Salad', 150, 'food', 'salad', 'Onions, tomatoes, cucumber and lemon.'],
      ['Breads', 'Tandoori Naan', 60, 'food', 'naan', 'Straight from the tandoor.'],
    ],
    'student-biryani': [
      ['Biryani', 'Chicken Biryani (Single)', 650, 'food', 'biryani', 'Aromatic rice, spiced chicken and potato.', { featured: true }],
      ['Biryani', 'Biryani Special (Double)', 1150, 'food', 'biryani', 'Double portion with extra chicken.'],
      ['Biryani', 'Biryani Bowl with Raita', 520, 'food', 'biryani', 'A lighter single bowl with raita.', { isNew: true }],
      ['Desserts', 'Zarda', 300, 'food', 'dessert', 'Sweet saffron rice with dry fruit.'],
    ],
    'optp': [
      ['Fries', 'Garlic Mayo Fries', 520, 'food', 'fries', 'Thick fries with garlic mayo.', { featured: true }],
      ['Fries', 'Masala Fries (Large)', 450, 'food', 'fries', 'Tossed in OPTP-style masala.'],
      ['Burgers', 'Crispy Chicken Burger', 690, 'food', 'burger', 'Crunchy fillet and lettuce.'],
      ['Wraps', 'Chicken Wrap', 590, 'food', 'wrap', 'Grilled chicken and sauce in a soft wrap.'],
      ['Sandwiches', 'Club Sandwich', 640, 'food', 'sandwich', 'Chicken, egg and cheese with fries.'],
    ],
    'tim-hortons': [
      ['Coffee', 'Iced Capp (Medium)', 650, 'food', 'coffee', 'Frozen blended coffee with cream.', { featured: true }],
      ['Coffee', 'Americano (Medium)', 550, 'food', 'coffee2', 'Espresso and hot water.'],
      ['Coffee', 'Spanish Latte', 690, 'food', 'coffee', 'Sweet, creamy and strong.', { isNew: true }],
      ['Bakery', 'Timbits (10 pcs)', 450, 'food', 'donut', 'Bite-size donut holes, mixed.'],
      ['Bakery', 'Boston Cream Donut', 290, 'food', 'donut', 'Custard-filled with chocolate glaze.'],
      ['Bakery', 'Chicken Wrap', 950, 'food', 'wrap', 'Grilled chicken, lettuce and chipotle sauce.'],
    ],

    'carrefour': [
      ['Dairy & eggs', 'Milkpak UHT Milk 1 L', 300, 'groceries', 'milk', 'Full cream UHT milk.', { featured: true }],
      ['Dairy & eggs', 'Farm Eggs (12 pcs)', 420, 'groceries', 'eggs', 'Brown eggs, one dozen.'],
      ['Bakery', 'Dawn Bread Large', 210, 'groceries', 'bread', 'Soft white sandwich loaf.'],
      ['Fruit & veg', 'Bananas (1 dozen)', 240, 'groceries', 'bananas', 'Ripe and ready to eat.'],
      ['Pantry', 'Super Kernel Basmati Rice 5 kg', 2450, 'groceries', 'rice', 'Long-grain basmati.'],
      ['Pantry', 'Cooking Oil 1 L', 590, 'groceries', 'oil', 'Pouch, refined.'],
      ['Beverages', 'Nestlé Pure Life 1.5 L', 110, 'groceries', 'water', 'Bottled drinking water.'],
      ['Household', 'Surf Excel 1 kg', 720, 'essentials', 'detergent', 'Washing powder.'],
      ['Household', 'Vim Dishwashing Liquid 500 ml', 430, 'essentials', 'dishLiquid', 'Lemon dishwashing liquid.'],
    ],
    'al-fatah': [
      ['Dairy & eggs', "Olper's Milk 1 L", 300, 'groceries', 'milk', 'Full cream UHT milk.'],
      ['Pantry', 'Tapal Danedar 900 g', 1650, 'groceries', 'tea', 'Black tea, granular.', { featured: true }],
      ['Pantry', 'National Ketchup 800 g', 420, 'groceries', 'ketchup', 'Tomato ketchup, family pack.'],
      ['Pantry', 'Shan Biryani Masala', 140, 'groceries', 'spices', 'Spice mix for one pot.'],
      ['Personal care', 'Colgate Toothpaste 150 g', 380, 'essentials', 'toothpaste', 'Cavity protection.', { featured: true }],
      ['Household', 'Rose Petal Tissue Box', 280, 'essentials', 'tissues', 'Soft facial tissues, 150 sheets.'],
      ['Household', 'Energizer AA Batteries (4)', 650, 'essentials', 'batteries', 'Alkaline batteries.'],
      ['Household', 'LED Bulb 12 W', 450, 'essentials', 'bulb', 'Cool white, B22 base.', { available: false }],
    ],
    'imtiaz': [
      ['Fruit & veg', 'Tomatoes 1 kg', 160, 'groceries', 'tomato', 'Fresh, firm tomatoes.'],
      ['Fruit & veg', 'Onions 1 kg', 120, 'groceries', 'onion', 'Red onions.'],
      ['Fruit & veg', 'Mixed Vegetables Pack', 350, 'groceries', 'vegetables', 'Seasonal greens and veg.', { isNew: true }],
      ['Meat', 'Chicken Boneless 1 kg', 1150, 'groceries', 'chicken', 'Cleaned and cut.', { featured: true }],
      ['Pantry', 'Chakki Atta 10 kg', 1350, 'groceries', 'flour', 'Whole wheat flour.'],
      ['Pantry', 'Sugar 1 kg', 155, 'groceries', 'sugar', 'Refined white sugar.'],
      ['Dairy & eggs', 'Plain Yoghurt 500 g', 180, 'groceries', 'yogurt', 'Fresh dahi.'],
    ],
    'metro': [
      ['Bulk beverages', 'Mineral Water 6 × 1.5 L', 650, 'groceries', 'water', 'Six-bottle pack.'],
      ['Bulk pantry', 'Basmati Rice 10 kg', 4700, 'groceries', 'rice', 'Value pack.'],
      ['Bulk household', 'Toilet Tissue (10 rolls)', 990, 'essentials', 'tissues', 'Two-ply, value pack.'],
      ['Bulk household', 'Detergent 3 kg', 1990, 'essentials', 'detergent', 'Family-size washing powder.'],
      ['Bulk household', 'Dishwashing Liquid 1.5 L', 890, 'essentials', 'dishLiquid', 'Refill size.'],
    ],
    'd-watson': [
      ['Personal care', 'Dettol Handwash 200 ml', 380, 'essentials', 'soap', 'Antibacterial liquid handwash.', { featured: true }],
      ['Personal care', 'Sunsilk Shampoo 360 ml', 890, 'essentials', 'shampoo', 'Smooth & manageable.'],
      ['Personal care', 'Hand Sanitizer 100 ml', 290, 'essentials', 'sanitizer', '70% alcohol gel.'],
      ['Personal care', 'Face Masks (50 pcs)', 450, 'essentials', 'masks', '3-ply disposable masks.'],
      ['Baby', 'Baby Diapers Size 4 (40 pcs)', 2650, 'essentials', 'diapers', 'Soft, with wetness indicator.'],
      ['Oral care', 'Sensodyne Toothpaste 100 g', 690, 'essentials', 'toothpaste', 'For sensitive teeth.'],
    ],
    'jalal-sons': [
      ['Bakery', 'Butter Croissant', 220, 'food', 'croissant', 'Flaky and baked this morning.', { featured: true }],
      ['Bakery', 'Chicken Patties (2 pcs)', 260, 'food', 'patty', 'Puff pastry with creamy chicken.'],
      ['Bakery', 'Fudge Brownie Box (6)', 950, 'food', 'brownie', 'Dense, chocolatey squares.'],
      ['Deli', 'Club Sandwich', 590, 'food', 'sandwich', 'Triple-layer with chicken and egg.'],
      ['Bread', 'Multigrain Loaf', 320, 'groceries', 'bread', 'Seeded, freshly baked.'],
    ],
    'gourmet': [
      ['Cakes', 'Chocolate Fudge Cake (1 lb)', 1250, 'food', 'cake', 'Rich sponge with fudge frosting.', { featured: true }],
      ['Bakery', 'Chicken Patties (2 pcs)', 180, 'food', 'patty', 'A tea-time favourite.'],
      ['Bakery', 'Cream Roll (4 pcs)', 240, 'food', 'croissant', 'Crisp pastry with whipped cream.'],
      ['Bread', 'Sandwich Bread Large', 200, 'groceries', 'bread', 'Soft white loaf.'],
      ['Bakery', 'Fruit Cake Slice Box', 450, 'food', 'cake', 'Classic plum cake, sliced.'],
    ],
  };

  Object.entries(menus).forEach(([vendorId, rows]) => {
    rows.forEach(([section, name, price, category, image, description, flags = {}], i) => {
      PRODUCTS.push({
        id: `${vendorId}-${i + 1}`,
        vendorId,
        section,
        name,
        category,
        price,
        image,
        description,
        featured: Boolean(flags.featured),
        isNew: Boolean(flags.isNew),
        available: flags.available !== false,
      });
    });
  });
})();

const PROMO_CODES = {
  MANGO150: { type: 'flat', amount: 150, label: 'Rs. 150 off your subtotal (demo code)' },
};

const SUPPORT_TYPES = [
  'Order or checkout question',
  'Missing or incorrect item',
  'Delivery/pickup question',
  'Payment question (demo only)',
  'Other',
];

const TRACKING_STAGES = {
  delivery: ['Order received', 'Being prepared', 'On the way', 'Completed'],
  pickup:   ['Order received', 'Being prepared', 'Ready for pickup', 'Completed'],
};

const LAHORE_AREAS = ['Johar Town', 'DHA', 'Gulberg', 'Model Town', 'Bahria Town', 'Wapda Town', 'Township', 'Garden Town', 'Cantt', 'Iqbal Town'];
