import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Camera, LayoutDashboard, LogOut, Moon, Search, ShoppingCart, Sun, UserRound, X } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import toast from 'react-hot-toast';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Header({ theme, onToggleTheme }) {
  const { user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');

  const displayName = user?.name || 'User';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => () => {
    scannerControlsRef.current?.stop?.();
    codeReaderRef.current?.reset?.();
  }, []);

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

  const stopScanner = () => {
    scannerControlsRef.current?.stop?.();
    scannerControlsRef.current = null;
    codeReaderRef.current?.reset?.();
  };

  const closeScanner = () => {
    stopScanner();
    setScannerOpen(false);
    setScannerStarting(false);
    setScannerStatus('');
  };

  const openBarcodeResult = (code) => {
    stopScanner();
    setScannerOpen(false);
    setScannerStarting(false);
    setScannerStatus('');
    setSearchTerm(code);
    navigate(`/categories?search=${encodeURIComponent(code)}`);
    toast.success(`تم العثور على الباركود: ${code}`);
  };

  const requestCameraAccess = async () => {
    setScannerStarting(true);
    setScannerStatus('جارٍ تشغيل الكاميرا وبدء قراءة الباركود...');

    if (!window.isSecureContext) {
      setScannerStatus('فتح الكاميرا يتطلب رابط https مباشر للموقع.');
      setScannerStarting(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus('هذا المتصفح لا يدعم فتح الكاميرا.');
      setScannerStarting(false);
      return;
    }

    try {
      stopScanner();

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const controls = await codeReaderRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' }
          },
          audio: false
        },
        videoRef.current,
        (result, error) => {
          const code = result?.getText?.();

          if (code) {
            openBarcodeResult(code);
            return;
          }

          if (!error) {
            setScannerStatus('وجّه الكاميرا نحو الباركود...');
            return;
          }

          if (error.name === 'NotFoundException' || error.name === 'ChecksumException' || error.name === 'FormatException') {
            setScannerStatus('وجّه الكاميرا نحو الباركود...');
            return;
          }

          setScannerStatus('تعذر قراءة الباركود حاليًا، حاول تقريب الكاميرا أو تحسين الإضاءة.');
        }
      );

      scannerControlsRef.current = controls;
      setScannerStatus('وجّه الكاميرا نحو الباركود...');
    } catch {
      setScannerStatus('تعذر تشغيل الكاميرا. تأكد من السماح بالكاميرا وفتح الرابط المباشر للموقع.');
      setScannerStarting(false);
    }
  };

  const openScanner = () => {
    setScannerOpen(true);
    setScannerStarting(false);
    setScannerStatus('للبدء اضغط على زر السماح بالكاميرا.');
  };

  return (
    <>
      <header className="site-header">
        <div className="app-shell header-shell">
          <div className={`header-card${searchOpen ? ' search-active' : ''}`}>
            <Link to="/" className="brand" aria-label="Al Wekala Market">
              <Logo compact />
            </Link>

            <form className={`search-box${searchOpen ? ' mobile-open' : ''}`} onSubmit={submitSearch}>
              <button type="button" className="search-icon-btn" aria-label="مسح الباركود بالكاميرا" onClick={openScanner}>
                <Camera size={18} />
              </button>
              <button type="submit" className="search-submit" aria-label="البحث" onClick={handleMobileSearchOpen}>
                <Search size={22} />
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
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
                aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}
              </button>

              <NavLink to="/cart" className="round-action cart-link" title="السلة" aria-label="السلة">
                <ShoppingCart size={22} />
                {totals.count > 0 && <b>{totals.count}</b>}
              </NavLink>

              {(user?.role === 'admin' || (user?.role === 'employee' && user?.permissions?.length > 0)) && (
                <NavLink to="/admin" className="round-action" title="لوحة التحكم" aria-label="لوحة التحكم">
                  <LayoutDashboard size={22} />
                </NavLink>
              )}

              {user ? (
                <button className="round-action" onClick={logout} title="تسجيل الخروج" aria-label="تسجيل الخروج">
                  <LogOut size={22} />
                </button>
              ) : (
                <NavLink to="/login" className="round-action user-action" title="تسجيل الدخول" aria-label="تسجيل الدخول">
                  <UserRound size={22} />
                </NavLink>
              )}

              {user && (
                <NavLink to="/profile" className="profile-avatar-trigger" title="الملف الشخصي" aria-label="الملف الشخصي">
                  {user.avatar ? <img src={user.avatar} alt={displayName} className="profile-avatar-image" /> : initials}
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </header>

      {scannerOpen ? (
        <div className="barcode-scanner-overlay" onClick={closeScanner}>
          <div className="barcode-scanner-modal" onClick={(event) => event.stopPropagation()}>
            <div className="barcode-scanner-head">
              <div>
                <strong>مسح الباركود بالكاميرا</strong>
                <span>{scannerStatus || 'جارٍ تجهيز الكاميرا...'}</span>
              </div>
              <button type="button" className="barcode-scanner-close" onClick={closeScanner} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="barcode-scanner-frame">
              <video ref={videoRef} className="barcode-scanner-video" playsInline muted autoPlay />
              <div className="barcode-scanner-target" />
            </div>

            {!scannerStarting ? (
              <button type="button" className="primary-btn barcode-scanner-allow" onClick={requestCameraAccess}>
                السماح بالكاميرا
              </button>
            ) : null}

            <button type="button" className="secondary-btn barcode-scanner-cancel" onClick={closeScanner}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
