import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, UserRound, LayoutDashboard, LogOut, Search, Moon, Sun } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Header({ theme, onToggleTheme }) {
  const { user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const displayName = user?.name || 'User';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = searchTerm.trim();

    if (!term && window.innerWidth <= 640 && !searchOpen) {
      setSearchOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    navigate(term ? `/categories?search=${encodeURIComponent(term)}` : '/categories');
  };

  const handleMobileSearchOpen = (event) => {
    if (window.innerWidth > 640 || searchOpen) return;
    event.preventDefault();
    setSearchOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  };

  return <header className="site-header">
    <div className="app-shell header-shell">
      <div className={`header-card${searchOpen ? ' search-active' : ''}`}>
        <Link to="/" className="brand" aria-label="Al Wekala Market">
          <Logo compact />
        </Link>

        <form className={`search-box${searchOpen ? ' mobile-open' : ''}`} onSubmit={submitSearch}>
          <button type="submit" className="search-submit" aria-label="Ø§Ù„Ø¨Ø­Ø«" onClick={handleMobileSearchOpen}>
            <Search size={24} />
          </button>
          <input
            ref={inputRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => {
              if (window.innerWidth <= 640) setSearchOpen(true);
            }}
            placeholder="ابحث عن منتجات، باركود، عروض..."
          />
        </form>

        <div className="header-actions">
          <button
            type="button"
            className="round-action theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„ÙØ§ØªØ­' : 'Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø¯Ø§ÙƒÙ†'}
            aria-label={theme === 'dark' ? 'Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„ÙØ§ØªØ­' : 'Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø¯Ø§ÙƒÙ†'}
          >
            {theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}
          </button>

          <NavLink to="/cart" className="round-action cart-link" title="Ø§Ù„Ø³Ù„Ø©" aria-label="Ø§Ù„Ø³Ù„Ø©">
            <ShoppingCart size={22} />
            {totals.count > 0 && <b>{totals.count}</b>}
          </NavLink>

          {(user?.role === 'admin' || (user?.role === 'employee' && user?.permissions?.length > 0)) && <NavLink to="/admin" className="round-action" title="Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…">
            <LayoutDashboard size={22} />
          </NavLink>}

          {user
            ? <button className="round-action" onClick={logout} title="ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬"><LogOut size={22} /></button>
            : <NavLink to="/login" className="round-action user-action" title="ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„"><UserRound size={22} /></NavLink>}

          {user && <NavLink to="/profile" className="profile-avatar-trigger" title="Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ" aria-label="Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ">
            {user.avatar ? <img src={user.avatar} alt={displayName} className="profile-avatar-image" /> : initials}
          </NavLink>}
        </div>
      </div>
    </div>
  </header>;
}


