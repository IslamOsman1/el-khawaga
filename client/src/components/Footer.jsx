import React, { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ClipboardList,
  Facebook,
  Grid2X2,
  Heart,
  Home,
  Info,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Package,
  Phone,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Wallet
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';

const normalizeUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export default function Footer() {
  const { totals } = useCart();
  const { settings } = useStoreSettings();
  const [moreOpen, setMoreOpen] = useState(false);

  const socialLinks = useMemo(() => {
    const whatsappDigits = String(settings?.whatsapp || '').replace(/\D/g, '');

    return [
      { key: 'facebook', label: 'فيس بوك', href: normalizeUrl(settings?.facebookUrl), icon: Facebook },
      { key: 'instagram', label: 'إنستجرام', href: normalizeUrl(settings?.instagramUrl), icon: Instagram },
      { key: 'whatsapp', label: 'واتساب', href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : '', icon: MessageCircle }
    ].filter((item) => item.href);
  }, [settings?.facebookUrl, settings?.instagramUrl, settings?.whatsapp]);

  const quickLinks = [
    { to: '/', label: 'الرئيسية' },
    { to: '/categories', label: 'الفئات' },
    { to: '/alwekala-products', label: 'منتجات الوكالة' },
    { to: '/offers', label: 'العروض' },
    { to: '/contact', label: 'تواصل معنا' },
    { to: '/policies', label: 'السياسات' }
  ];

  const serviceLinks = [
    { to: '/cart', label: totals.count > 0 ? `السلة (${totals.count})` : 'السلة', icon: ShoppingCart },
    { to: '/orders', label: 'طلباتي', icon: ClipboardList },
    { to: '/contact', label: settings?.supportPhone || 'الدعم', icon: Phone },
    { to: '/policies/shipping', label: 'سياسة الشحن', icon: Truck },
    { to: '/policies/refund', label: 'سياسة الاسترجاع', icon: Wallet }
  ];

  return (
    <>
      <nav className="bottom-nav" aria-label="التنقل السريع">
        <NavLink to="/"><Home size={24} /><span>الرئيسية</span></NavLink>
        <NavLink to="/categories"><Grid2X2 size={24} /><span>الفئات</span></NavLink>
        <NavLink to="/alwekala-products"><Package size={24} /><span>منتجات الوكالة</span></NavLink>
        <NavLink to="/offers"><Package size={24} /><span>العروض</span></NavLink>

        <div className={`bottom-more${moreOpen ? ' open' : ''}`}>
          <button type="button" className="bottom-more-trigger" onClick={() => setMoreOpen((current) => !current)}>
            <MoreHorizontal size={24} />
            <span>المزيد</span>
          </button>

          {moreOpen ? (
            <div className="bottom-more-menu">
              <Link to="/cart" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <ShoppingCart size={18} />
                <span>السلة</span>
                {totals.count > 0 ? <b>{totals.count}</b> : null}
              </Link>
              <Link to="/orders" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <ClipboardList size={18} />
                <span>طلباتي</span>
              </Link>
              <Link to="/wishlist" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <Heart size={18} />
                <span>المفضلة</span>
              </Link>
              <Link to="/settings" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <Settings size={18} />
                <span>الإعدادات</span>
              </Link>
              <Link to="/contact" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <Phone size={18} />
                <span>تواصل معنا</span>
              </Link>
              <Link to="/about" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <Info size={18} />
                <span>من نحن</span>
              </Link>
              <Link to="/policies" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
                <ShieldCheck size={18} />
                <span>السياسات</span>
              </Link>
            </div>
          ) : null}
        </div>
      </nav>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand-block">
            <div className="footer-title-row">
              <Store size={20} />
              <strong>{settings?.storeName || 'Al Wekala Market'}</strong>
            </div>
            <p>{settings?.storeTagline || 'متجر إلكتروني سريع لشراء المنتجات اليومية بسهولة.'}</p>
            <div className="footer-contact-list">
              {settings?.supportPhone ? (
                <a href={`tel:${settings.supportPhone}`} className="footer-inline-link">
                  <Phone size={16} />
                  <span>{settings.supportPhone}</span>
                </a>
              ) : null}

              <div className="footer-email-row">
                {settings?.supportEmail ? (
                  <a href={`mailto:${settings.supportEmail}`} className="footer-inline-link footer-email-link">
                    <Info size={16} />
                    <span>{settings.supportEmail}</span>
                  </a>
                ) : null}

                {socialLinks.length ? (
                  <div className="footer-inline-socials" aria-label="روابط التواصل الاجتماعي">
                    {socialLinks.map(({ key, label, href, icon: Icon }) => (
                      <a key={key} href={href} target="_blank" rel="noreferrer" className="footer-social-link inline" aria-label={label} title={label}>
                        <Icon size={16} />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <strong>روابط سريعة</strong>
            <div className="footer-links-list">
              {quickLinks.map((link) => (
                <Link key={link.to} to={link.to} className="footer-text-link">{link.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <strong>الخدمة</strong>
            <div className="footer-links-list">
              {serviceLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="footer-text-link footer-service-link">
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
