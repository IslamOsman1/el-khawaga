import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Camera, LayoutDashboard, Moon, Search, ShoppingCart, Sun, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Header({ theme, onToggleTheme }) {
  const { user } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const qrVideoRef = useRef(null);
  const qrReaderRef = useRef(null);
  const qrControlsRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScannerStarting, setQrScannerStarting] = useState(false);
  const [qrScannerStatus, setQrScannerStatus] = useState('');

  const displayName = user?.name || 'User';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => () => {
    qrControlsRef.current?.stop?.();
    qrReaderRef.current?.reset?.();
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

  const closeQrScanner = () => {
    qrControlsRef.current?.stop?.();
    qrControlsRef.current = null;
    qrReaderRef.current?.reset?.();
    setQrScannerOpen(false);
    setQrScannerStarting(false);
    setQrScannerStatus('');
  };

  const openQrScanner = () => {
    setQrScannerOpen(true);
    setQrScannerStarting(false);
    setQrScannerStatus('للبدء اضغط على زر السماح بالكاميرا.');
  };

  const requestQrScanner = async () => {
    setQrScannerStarting(true);
    setQrScannerStatus('جارٍ تشغيل الكاميرا وقراءة QR...');

    if (!window.isSecureContext) {
      setQrScannerStatus('فتح الكاميرا يتطلب رابط https مباشر للموقع.');
      setQrScannerStarting(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setQrScannerStatus('هذا المتصفح لا يدعم فتح الكاميرا.');
      setQrScannerStarting(false);
      return;
    }

    try {
      qrControlsRef.current?.stop?.();
      qrReaderRef.current?.reset?.();

      if (!qrReaderRef.current) {
        qrReaderRef.current = new BrowserQRCodeReader();
      }

      const controls = await qrReaderRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        qrVideoRef.current,
        (result, error) => {
          const code = result?.getText?.()?.trim();

          if (code) {
            setSearchTerm(code);
            closeQrScanner();
            navigate(`/categories?search=${encodeURIComponent(code)}`);
            toast.success(`تمت قراءة QR: ${code}`);
            return;
          }

          if (!error || ['NotFoundException', 'ChecksumException', 'FormatException'].includes(error.name)) {
            setQrScannerStatus('وجّه رمز QR داخل الإطار وثبّته لثانية واحدة...');
            return;
          }

          setQrScannerStatus('تعذر قراءة QR حاليًا، حاول تقريب الكاميرا أو تحسين الإضاءة.');
        }
      );

      qrControlsRef.current = controls;
      setQrScannerStatus('وجّه رمز QR داخل الإطار وثبّته لثانية واحدة...');
    } catch {
      setQrScannerStatus('تعذر تشغيل الكاميرا. تأكد من السماح بالكاميرا وفتح الرابط المباشر للموقع.');
      setQrScannerStarting(false);
    }
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
                placeholder="ابحث عن منتجات أو عروض أو امسح QR..."
              />
              <button type="button" className="search-icon-btn" aria-label="قراءة QR بالكاميرا" onClick={openQrScanner}>
                <Camera size={20} />
              </button>
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

              {user ? null : (
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

      {qrScannerOpen ? (
        <div className="barcode-scanner-overlay" onClick={closeQrScanner}>
          <div className="barcode-scanner-modal" onClick={(event) => event.stopPropagation()}>
            <div className="barcode-scanner-head">
              <div>
                <strong>قراءة QR بالكاميرا</strong>
                <span>{qrScannerStatus || 'جارٍ تجهيز الكاميرا...'}</span>
              </div>
              <button type="button" className="barcode-scanner-close" onClick={closeQrScanner} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="barcode-scanner-frame">
              <video ref={qrVideoRef} className="barcode-scanner-video" playsInline muted autoPlay />
              <div className="barcode-scanner-target" />
            </div>

            {!qrScannerStarting ? (
              <button type="button" className="primary-btn barcode-scanner-allow" onClick={requestQrScanner}>
                السماح بالكاميرا
              </button>
            ) : null}

            <button type="button" className="secondary-btn barcode-scanner-cancel" onClick={closeQrScanner}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
