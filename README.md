# Mangao — *Order it. Get it.*

Frontend prototype for a multi-category ordering app (food, groceries and everyday essentials) built for the **Web Technologies** course midterm. The backend will be added for the final; for now every order, payment, tracking update and support reply is **simulated locally**.

> Restaurant and shop names (Pizza Hut, NY212, KFC, Carrefour, Al-Fatah, etc.), menus and prices are **sample data only**. There is no affiliation, partnership, live menu or real availability.

## Run it

1. Unzip the folder. Keep all files together.
2. Open the folder in **VS Code** and start **Live Server** on `index.html`, **or** just double-click `index.html` to open it in Chrome/Edge/Firefox.
3. No build step, no API keys, no `npm install`.

Bootstrap, Bootstrap Icons and the fonts are bundled in `vendor/`, so the app works **offline** (e.g. in a lab with no internet). Product photos load from Unsplash when online; offline, or with *Settings → Show product photos* turned off, each item shows an illustrated tile instead.

## Demo details

| Thing | Value |
|---|---|
| Promo code | `MANGO150` — Rs. 150 off the subtotal (never below Rs. 0). Once per basket, and once per user across demo orders. Reset demo data in Settings to test it again. |
| Phone format | Pakistani mobile, e.g. `0300 1234567` or `+923001234567` |
| Delivery minimums | Each place has a minimum for delivery; Pickup has none |
| Tracking | Advances automatically (≈10s → 20s → 25s), or press **Skip to next step (demo)** |
| Sample history | Two orders marked “Sample” are pre-loaded so the history screen isn't empty |

## Features

- **Home** — hero search, category tiles (Food / Groceries / Everyday Essentials), Order again, promo banner, restaurant and shop rows, popular items with category chips
- **Restaurants** and **Shops** — 11 restaurants and 7 shops with type chips, filters (delivery under Rs. 100, rated 4.5+, under 30 min) and sorting
- **Store pages** — cover, rating, ETA, fee, minimum order, menu sections with jump chips, in-menu search, side basket summary
- **Search / Browse** — live, case-insensitive search across name, category, section, description and store, combined with category filter and sorting; friendly no-results state with *Clear search*
- **Product detail** modal with quantity selector
- **Basket** — one basket across several places, grouped by place, quantity steppers, remove + undo, per-place delivery fee, minimum-order warnings, promo code, itemised totals (subtotal, delivery, discount, service fee Rs. 0, total)
- **Delivery / Pickup** toggle that updates fees, minimums, ETAs and checkout fields everywhere
- **Checkout** — validation with inline errors and an error summary, saved-address chips, area select, schedule time, payment choice (not processed), rider tip, order notes with character count
- **Order tracking** — 4-step simulated stepper, cancel while “Order received”, help shortcut, full order breakdown
- **Orders** — Active and History tabs, progress bars, reorder, 1–5 star rating, clear history
- **Favourites** — saved items and saved places
- **Account** — profile form with validation, saved addresses (add, delete, set default), stats
- **Settings** — light/dark/system theme, photos on/off, reduce motion, default order mode and tip, notification preferences, download my data (JSON), reset demo data
- **Help** — issue report form (5 issue types, optional related order) with demo case reference, FAQ, simulated chat with Mangi
- **Mobile** — bottom tab bar, floating “View basket” bar, full-width basket panel; no horizontal scroll at 360px
- **Accessibility** — semantic landmarks, labelled inputs, visible focus ring, skip link, `aria-live` updates for basket and forms, keyboard-operable toggles and tabs, focus kept in place when buttons change, reduced-motion support
- **Persistence** — basket, favourites, profile, addresses, orders, reports and settings are stored in `localStorage` (corrupted data is ignored safely)

## Folder structure

```
mangao/
├── index.html        App shell: header, all views, basket panel, modals, footer
├── style.css         Brand tokens, layout, components, responsive rules, dark theme
├── data.js           Sample stores, products, categories, promo codes, support types
├── app.js            State, rendering, search/filter, cart maths, promo, validation,
│                     demo orders + tracking, favourites, account, settings, help/chat, router
├── assets/mangi.svg  Mascot / favicon
└── vendor/           Bootstrap 5.3, Bootstrap Icons, Inter + Plus Jakarta Sans fonts
```

`data.js` uses the same shapes an API would return (`product = { id, name, category, price, image, description, featured, available, vendorId, section }`), so it can be swapped for `fetch()` calls when the backend is added.

## Known limitations

- No real accounts, backend, database, payments, vendors, riders, GPS or support agents.
- Data lives in one browser only (localStorage).
- Product photos need an internet connection; illustrations are used otherwise.
