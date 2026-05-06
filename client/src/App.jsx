import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppSplash from './components/AppSplash.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import SupportChatWidget from './components/SupportChatWidget.jsx';
import Home from './pages/Home.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import AlWekalaProductsPage from './pages/AlWekalaProductsPage.jsx';
import Cart from './pages/Cart.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Checkout from './pages/Checkout.jsx';
import CheckoutReview from './pages/CheckoutReview.jsx';
import CheckoutSuccess from './pages/CheckoutSuccess.jsx';
import Orders from './pages/Orders.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const canAccessAdmin = user.role === 'admin' || (user.role === 'employee' && (user.permissions || []).length > 0);
  if (adminOnly && !canAccessAdmin) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [bootSplashVisible, setBootSplashVisible] = useState(true);
  const [routeSplashVisible, setRouteSplashVisible] = useState(false);
  const firstPathRef = useRef(location.pathname);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootSplashVisible(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (firstPathRef.current === location.pathname) return;
    setRouteSplashVisible(true);
    const timer = window.setTimeout(() => setRouteSplashVisible(false), 420);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    firstPathRef.current = location.pathname;
  }, [location.pathname]);

  return <div className="app-root">
    <AppSplash visible={bootSplashVisible || routeSplashVisible} routeChanging={!bootSplashVisible && routeSplashVisible} />
    <Header
      theme={theme}
      onToggleTheme={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
    />
    <main className={`app-main-shell${routeSplashVisible ? ' is-transitioning' : ''}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/alwekala-products" element={<AlWekalaProductsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/checkout/review" element={<PrivateRoute><CheckoutReview /></PrivateRoute>} />
        <Route path="/checkout/success" element={<PrivateRoute><CheckoutSuccess /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
      </Routes>
    </main>
    <SupportChatWidget />
    <Footer />
  </div>;
}
