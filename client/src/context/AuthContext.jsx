import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Who is logged in, plus their favourites and saved addresses (all stored in MongoDB)
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState({ products: [], vendors: [] });
  const [addresses, setAddresses] = useState([]);

  const loadAccount = useCallback(async () => {
    try {
      const [fav, addr] = await Promise.all([api('/me/favourites'), api('/me/addresses')]);
      setFavourites(fav);
      setAddresses(addr.addresses);
    } catch { /* ignore: will retry on next action */ }
  }, []);

  useEffect(() => {
    api('/auth/me')
      .then(async (res) => { setUser(res.user); if (res.user) await loadAccount(); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadAccount]);

  const signIn = async (path, body) => {
    const res = await api(path, { method: 'POST', body });
    setUser(res.user);
    await loadAccount();
    return res.user;
  };

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* still log out locally */ }
    setUser(null);
    setFavourites({ products: [], vendors: [] });
    setAddresses([]);
  };

  const reloadAddresses = async () => {
    const res = await api('/me/addresses');
    setAddresses(res.addresses);
    return res.addresses;
  };

  const value = {
    user, setUser, loading, favourites, setFavourites, addresses, setAddresses, reloadAddresses,
    login: (email, password) => signIn('/auth/login', { email, password }),
    register: (data) => signIn('/auth/register', data),
    logout,
    clearLocal: () => { setUser(null); setFavourites({ products: [], vendors: [] }); setAddresses([]); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
