import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

// Stores and products from GET /api/catalog
const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const reload = useCallback(async () => {
    try {
      const data = await api('/catalog');
      setStores(data.stores);
      setProducts(data.products);
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(() => {
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    return {
      stores, products, status, reload,
      vendorById: (id) => storeMap.get(id) || null,
      productById: (id) => productMap.get(id) || null,
    };
  }, [stores, products, status, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
