import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Award,
  ClipboardList,
  Heart,
  LogOut,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  TicketPercent,
  UserRound,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [qrImage, setQrImage] = useState('');

  const displayName = user?.name || 'مستخدم الوكالة';
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const activePrivateCodes = Array.isArray(user?.privateDiscountCodes) ? user.privateDiscountCodes : [];

  useEffect(() => {
    const qrValue = user?.qrCodeValue || user?.customerCode || '';
    if (!qrValue) {
      setQrImage('');
      return;
    }

    QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 220,
      color: {
        dark: '#111111',
        light: '#fffaf2'
      }
    })
      .then(setQrImage)
      .catch(() => setQrImage(''));
  }, [user?.customerCode, user?.qrCodeValue]);

  return (
    <main className="app-shell home-screen market-home account-page-shell">
      <section className="panel-card account-hero profile-hero">
        <div className="account-hero-main">
          <div className="profile-avatar-large">
            {user?.avatar ? <img src={user.avatar} alt={displayName} className="profile-avatar-large-image" /> : initials}
          </div>
          <div className="account-copy">
            <span className="market-pill">الملف الشخصي</span>
            <h1>{displayName}</h1>
            <p>لوحة شخصية مختصرة للوصول السريع إلى بياناتك وطلباتك ومفضلاتك ومحفظتك ونقاطك وكود العميل الخاص بك.</p>
          </div>
        </div>
        <div className="account-hero-actions">
          <Link to="/orders" className="secondary-btn">طلباتي</Link>
          <Link to="/wishlist" className="primary-btn">المفضلة</Link>
          <button type="button" className="secondary-btn profile-logout-btn" onClick={logout}>
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </section>

      <section className="account-info-layout">
        <section className="panel-card account-content-panel">
          <div className="section-head compact">
            <h2>معلومات الحساب</h2>
            <span>بيانات أساسية</span>
          </div>

          <div className="account-info-grid">
            <article className="account-info-card">
              <span className="account-info-icon"><UserRound size={18} /></span>
              <div>
                <strong>الاسم</strong>
                <p>{user?.name || 'غير متوفر'}</p>
              </div>
            </article>
            <article className="account-info-card">
              <span className="account-info-icon"><Mail size={18} /></span>
              <div>
                <strong>البريد الإلكتروني</strong>
                <p>{user?.email || 'غير متوفر'}</p>
              </div>
            </article>
            <article className="account-info-card">
              <span className="account-info-icon"><Phone size={18} /></span>
              <div>
                <strong>رقم الهاتف</strong>
                <p>{user?.phone || 'غير متوفر'}</p>
              </div>
            </article>
            <article className="account-info-card">
              <span className="account-info-icon"><ShieldCheck size={18} /></span>
              <div>
                <strong>نوع الحساب</strong>
                <p>{user?.role === 'admin' ? 'مدير' : user?.role === 'employee' ? 'موظف' : 'عميل'}</p>
              </div>
            </article>
            <article className="account-info-card">
              <span className="account-info-icon"><Wallet size={18} /></span>
              <div>
                <strong>رصيد المحفظة</strong>
                <p>{Number(user?.walletBalance || 0)} ج.م</p>
              </div>
            </article>
            <article className="account-info-card">
              <span className="account-info-icon"><Award size={18} /></span>
              <div>
                <strong>نقاط الولاء</strong>
                <p>{Number(user?.loyaltyPoints || 0)} نقطة</p>
              </div>
            </article>
          </div>

          <div className="profile-identity-grid">
            <article className="profile-qr-card">
              <div className="profile-qr-head">
                <div>
                  <strong>QR العميل</strong>
                  <span>أظهر هذا الرمز عند الكاشير أو للدعم للوصول السريع إلى حسابك.</span>
                </div>
                <span className="account-info-icon"><QrCode size={18} /></span>
              </div>

              <div className="profile-qr-box">
                {qrImage ? <img src={qrImage} alt={`QR ${user?.customerCode || ''}`} /> : <div className="profile-qr-empty">QR</div>}
              </div>

              <div className="profile-customer-code">
                <small>كود العميل</small>
                <strong>{user?.customerCode || 'غير متوفر'}</strong>
              </div>
            </article>

            <article className="profile-discount-card">
              <div className="profile-qr-head">
                <div>
                  <strong>أكوادك الخاصة</strong>
                  <span>أكواد خصم مرتبطة بحسابك ويمكن استخدامها أثناء الشراء.</span>
                </div>
                <span className="account-info-icon"><TicketPercent size={18} /></span>
              </div>

              <div className="profile-private-codes">
                {activePrivateCodes.length ? activePrivateCodes.map((item) => (
                  <article key={item._id || item.code} className="profile-private-code-item">
                    <strong>{item.code}</strong>
                    <p>
                      {item.type === 'percent' ? `${Number(item.value || 0)}% خصم` : `${Number(item.value || 0)} ج.م خصم`}
                      {Number(item.minOrderAmount || 0) > 0 ? ` • حد أدنى ${Number(item.minOrderAmount || 0)} ج.م` : ''}
                    </p>
                  </article>
                )) : (
                  <div className="profile-private-code-empty">لا توجد أكواد خصم خاصة مفعلة حاليًا.</div>
                )}
              </div>
            </article>
          </div>
        </section>

        <aside className="panel-card quick-links-panel">
          <div className="section-head compact">
            <h2>وصول سريع</h2>
            <span>اختصارات مهمة</span>
          </div>

          <div className="quick-links-list">
            <Link to="/orders" className="quick-link-item">
              <ClipboardList size={18} />
              <div>
                <strong>طلباتي</strong>
                <span>راجع الطلبات السابقة والحالية</span>
              </div>
            </Link>
            <Link to="/wishlist" className="quick-link-item">
              <Heart size={18} />
              <div>
                <strong>المفضلة</strong>
                <span>شاهد المنتجات التي قمت بحفظها</span>
              </div>
            </Link>
            <Link to="/cart" className="quick-link-item">
              <ShoppingCart size={18} />
              <div>
                <strong>السلة</strong>
                <span>اكمل المنتجات الجاهزة للشراء</span>
              </div>
            </Link>
            <button type="button" className="quick-link-item quick-link-button" onClick={logout}>
              <LogOut size={18} />
              <div>
                <strong>تسجيل الخروج</strong>
                <span>إنهاء الجلسة الحالية من الحساب</span>
              </div>
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
