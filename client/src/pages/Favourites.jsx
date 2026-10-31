import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { EmptyState } from '../components/Common.jsx';
import { ProductCard } from '../components/ProductParts.jsx';
import StoreCard from '../components/StoreCard.jsx';
import useTitle from '../lib/useTitle.js';

export default function Favourites() {
  useTitle('Favourites — Mangao');
  const { favourites } = useAuth();
  const { productById, vendorById } = useCatalog();
  const [tab, setTab] = useState('items');
  const items = favourites.products.map(productById).filter(Boolean);
  const places = favourites.vendors.map(vendorById).filter(Boolean);
  return (
    <section className="container-xl page-pad" aria-labelledby="favTitle">
      <h1 id="favTitle">Favourites</h1>
      <div className="seg-tabs" role="tablist" aria-label="Favourite lists">
        <button type="button" role="tab" className="seg-tab" id="tabFavItems" aria-selected={tab === 'items'} onClick={() => setTab('items')}>Items <span className="seg-count">{items.length}</span></button>
        <button type="button" role="tab" className="seg-tab" id="tabFavPlaces" aria-selected={tab === 'places'} onClick={() => setTab('places')}>Places <span className="seg-count">{places.length}</span></button>
      </div>
      <div role="tabpanel" aria-labelledby={tab === 'items' ? 'tabFavItems' : 'tabFavPlaces'}>
        {tab === 'items' ? (items.length
          ? <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          : <EmptyState title="No saved items yet" text="Tap the heart on any item to keep it here for next time."><Link to="/browse" className="btn btn-mango">Browse products</Link></EmptyState>)
          : (places.length
            ? <div className="vendor-grid">{places.map((v) => <StoreCard key={v.id} vendor={v} />)}</div>
            : <EmptyState title="No saved places yet" text="Save your go-to restaurants and shops to find them in one tap."><Link to="/restaurants" className="btn btn-mango">See restaurants</Link></EmptyState>)}
      </div>
    </section>
  );
}
