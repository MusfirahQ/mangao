import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/Common.jsx';
import Home from './pages/Home.jsx';
import StoreList from './pages/StoreList.jsx';
import StorePage from './pages/StorePage.jsx';
import Browse from './pages/Browse.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import Track from './pages/Track.jsx';
import Favourites from './pages/Favourites.jsx';
import Account from './pages/Account.jsx';
import Settings from './pages/Settings.jsx';
import Help from './pages/Help.jsx';
import Login from './pages/Login.jsx';
import Partner from './pages/Partner.jsx';
import Admin from './pages/Admin.jsx';
import Rider from './pages/Rider.jsx';
import NotFound from './pages/NotFound.jsx';

/** Sends logged-out visitors to /login and back again afterwards. */
function RequireAuth({ children, role, reason }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, reason }} />;
  if (role && user.role !== role) return <NotFound />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="restaurants" element={<StoreList type="restaurant" />} />
        <Route path="shops" element={<StoreList type="shop" />} />
        <Route path="store/:id" element={<StorePage />} />
        <Route path="browse" element={<Browse />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<RequireAuth reason="Log in to see your orders."><Orders /></RequireAuth>} />
        <Route path="track/:id" element={<RequireAuth reason="Log in to track your order."><Track /></RequireAuth>} />
        <Route path="favourites" element={<RequireAuth reason="Log in to see your favourites."><Favourites /></RequireAuth>} />
        <Route path="account" element={<RequireAuth reason="Log in to see your account."><Account /></RequireAuth>} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="login" element={<Login />} />
        <Route path="partner" element={<Partner />} />
        <Route path="admin" element={<RequireAuth role="admin" reason="Log in as an admin."><Admin /></RequireAuth>} />
        <Route path="rider/:token" element={<Rider />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
