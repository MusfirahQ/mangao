import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../lib/data.js';
import { plural } from '../lib/format.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import StoreCard from '../components/StoreCard.jsx';
import { ProductCard, categoryLabel } from '../components/ProductParts.jsx';
import { EmptyState, Loading } from '../components/Common.jsx';
import useTitle from '../lib/useTitle.js';

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const cat = CATEGORIES.some((c) => c.value === params.get('cat')) ? params.get('cat') : 'all';
  const [sort, setSort] = useState('relevance');
  const { stores, products, status, vendorById } = useCatalog();
  useTitle(q ? `“${q}” — Mangao` : 'Browse — Mangao');

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const needle = q.trim().toLowerCase();
  const sorters = {
    relevance: (a, b) => (needle ? Number(b.name.toLowerCase().includes(needle)) - Number(a.name.toLowerCase().includes(needle)) : 0)
      || Number(b.available) - Number(a.available) || Number(b.featured) - Number(a.featured),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  const list = products.filter((p) => {
    if (cat !== 'all' && p.category !== cat) return false;
    if (!needle) return true;
    const v = vendorById(p.vendorId);
    return [p.name, categoryLabel(p.category), p.category, p.section, p.description, v?.name, v?.kind].join(' ').toLowerCase().includes(needle);
  }).sort(sorters[sort]);
  const places = needle ? stores.filter((v) => `${v.name} ${v.kind} ${(v.tags || []).join(' ')}`.toLowerCase().includes(needle)) : [];
  const catTxt = cat === 'all' ? '' : ` in ${categoryLabel(cat)}`;

  return (
    <section aria-labelledby="browseTitle">
      <div className="container-xl page-pad">
        <div className="page-head">
          <div>
            <h1 id="browseTitle">Browse everything</h1>
            <p className="page-sub">Search across every restaurant and shop at once.</p>
          </div>
          <div className="sort-wrap">
            <label htmlFor="productSort" className="form-label small mb-1">Sort by</label>
            <select id="productSort" className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <form className="browse-search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="browseSearch" className="form-label">Search products, categories and places</label>
          <div className="browse-search-field">
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" id="browseSearch" className="form-control form-control-lg" placeholder="e.g. zinger, eggs, shampoo" autoComplete="off" value={q} onChange={(e) => setParam('q', e.target.value)} />
            {q && <button type="button" className="btn btn-link search-clear-lg" onClick={() => setParam('q', '')}>Clear</button>}
          </div>
        </form>
        <div className="chip-row" role="group" aria-label="Filter by category">
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button key={c.value} type="button" className="chip" aria-pressed={cat === c.value} onClick={() => setParam('cat', c.value)}>{c.label}</button>
          ))}
        </div>
        {status === 'loading' ? <Loading /> : (
          <>
            {places.length > 0 && (
              <div>
                <h2 className="h6 mt-3 mb-2">Matching places</h2>
                <div className="h-scroll compact">{places.map((v) => <StoreCard key={v.id} vendor={v} />)}</div>
              </div>
            )}
            <p className="result-count" aria-live="polite">{plural(list.length, 'item')}{q && ` for “${q}”`}{catTxt}</p>
            <div className="product-grid">
              {list.length ? list.map((p) => <ProductCard key={p.id} product={p} />) : (
                <div style={{ gridColumn: '1/-1' }}>
                  <EmptyState mood="sad" title={q ? `No items match “${q}”${catTxt}` : 'Nothing here yet'} text="Check the spelling, try a broader word like “burger” or “milk”, or look in another category.">
                    {q && <button type="button" className="btn btn-mango me-2" onClick={() => setParam('q', '')}>Clear search</button>}
                    {cat !== 'all' && <button type="button" className="btn btn-outline-dark" onClick={() => setParam('cat', 'all')}>Search all categories</button>}
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
