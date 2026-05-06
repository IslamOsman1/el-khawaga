import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Heart, Mail, ShieldCheck, ShoppingCart, UserRound, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfilePage() {
  const { user } = useAuth();

  const displayName = user?.name || 'مستخدم الوكالة';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return <main className="app-shell home-screen market-home account-page-shell">
    <section className="panel-card account-hero profile-hero">
      <div className="account-hero-main">
        <div className="profile-avatar-large">{initials}</div>
        <div className="account-copy">
          <span className="market-pill">الملف الشخصي</span>
          <h1>{displayName}</h1>
          <p>لوحة شخصية مختصرة للوصول السريع إلى بياناتك وطلباتك ومفضلاتك ومحفظتك.</p>
        </div>
      </div>
      <div className="account-hero-actions">
        <Link to="/orders" className="secondary-btn">طلباتي</Link>
        <Link to="/wishlist" className="primary-btn">المفضلة</Link>
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
        </div>
      </aside>
    </section>
  </main>;
}
