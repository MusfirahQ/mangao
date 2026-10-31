import { useState } from 'react';
import { plural } from '../lib/format.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import StoreCard from '../components/StoreCard.jsx';
import { EmptyState, Loading } from '../components/Common.jsx';
import useTitle from '../lib/useTitle.js';

const SORTERS = {
  recommended: (a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.featured) - Number(a.featured) || b.rating - a.rating,
  fastest: (a, b) => a.eta[0] - b.eta[0],
  rating: (a, b) => b.rating - a.rating || b.ratings - a.ratings,
  fee: (a, b) => a.deliveryFee - b.deliveryFee,
};
const BLANK = { kind: 'All', lowFee: false, topRated: false, fast: false, sort: 'recommended' };

export default function StoreList({ type }) {
  const isRest = type === 'restaurant';
  useTitle(`${isRest ? 'Restaurants' : 'Shops'} — Mangao`);
  const { stores, status } = useCatalog();
  const [f, setF] = useState(BLANK);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const all = stores.filter((v) => v.type === type);
  const kinds = ['All', ...new Set(all.map((v) => v.kind))];
  const kind = kinds.includes(f.kind) ? f.kind : 'All';
  const list = all
    .filter((v) => (kind === 'All' || v.kind === kind) && (!f.lowFee || v.deliveryFee < 100) && (!f.topRated || v.rating >= 4.5) && (!f.fast || v.eta[0] < 30))
    .sort(SORTERS[f.sort]);

  return (
    <section aria-labelledby="vendorsTitle">
      <div className="container-xl page-pad">
        <div className="page-head">
          <div>
            <h1 id="vendorsTitle">{isRest ? 'Restaurants' : 'Shops and supermarkets'}</h1>
            <p className="page-sub">{isRest ? 'Burgers, pizza, karahi, biryani and coffee from around Lahore.' : 'Supermarkets, pharmacies and bakeries for your weekly shop.'}</p>
          </div>
          <div className="sort-wrap">
            <label htmlFor="vendorSort" className="form-label small mb-1">Sort by</label>
            <select id="vendorSort" className="form-select" value={f.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="fastest">Fastest delivery</option>
              <option value="rating">Top rated</option>
              <option value="fee">Lowest delivery fee</option>
            </select>
          </div>
        </div>
        {status === 'loading' ? <Loading /> : (
          <>
            <div className="chip-row" role="group" aria-label="Filter by type">
              {kinds.map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => set('kind', k)}>
                  {k} <span className="chip-n">{k === 'All' ? all.length : all.filter((v) => v.kind === k).length}</span>
                </button>
              ))}
            </div>
            <div className="toggle-row" role="group" aria-label="More filters">
              {[['lowFee', 'bi-truck', 'Delivery under Rs. 100'], ['topRated', 'bi-star', 'Rated 4.5+'], ['fast', 'bi-lightning', 'Under 30 min']].map(([k, icon, label]) => (
                <button key={k} type="button" className="toggle-chip" aria-pressed={f[k]} onClick={() => set(k, !f[k])}><i className={`bi ${icon}`} aria-hidden="true" />{label}</button>
              ))}
            </div>
            <p className="result-count" aria-live="polite">{plural(list.length, isRest ? 'restaurant' : 'shop')}</p>
            <div className="vendor-grid">
              {list.length ? list.map((v) => <StoreCard key={v.id} vendor={v} />) : (
                <div style={{ gridColumn: '1/-1' }}>
                  <EmptyState mood="sad" title="Nothing matches these filters" text="Try removing a filter to see more places.">
                    <button type="button" className="btn btn-mango" onClick={() => setF(BLANK)}>Clear filters</button>
                  </EmptyState>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
