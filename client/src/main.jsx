import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { OrdersProvider } from './context/OrdersContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <UIProvider>
          <CatalogProvider>
            <AuthProvider>
              <CartProvider>
                <OrdersProvider>
                  <App />
                </OrdersProvider>
              </CartProvider>
            </AuthProvider>
          </CatalogProvider>
        </UIProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
