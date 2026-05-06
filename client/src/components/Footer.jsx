import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Grid2X2, Package, ShoppingCart, MoreHorizontal, ClipboardList, Heart, Phone, Info, Settings } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function Footer() {
  const { totals } = useCart();
  const [moreOpen, setMoreOpen] = useState(false);

  return <>
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

        {moreOpen && <div className="bottom-more-menu">
          <Link to="/cart" className="bottom-more-item" onClick={() => setMoreOpen(false)}>
            <ShoppingCart size={18} />
            <span>السلة</span>
            {totals.count > 0 && <b>{totals.count}</b>}
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
        </div>}
      </div>
    </nav>

    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>Al Wekala Market</strong>
          <p>متجر إلكتروني سريع لشراء البقالة والمنتجات اليومية الطازجة مع عروض مستمرة وتجربة استخدام بسيطة.</p>
        </div>
        <div>
          <strong>روابط سريعة</strong>
          <p>الرئيسية • الفئات • منتجات الوكالة • العروض</p>
        </div>
        <div>
          <strong>الخدمة</strong>
          <p>توصيل سريع • دفع عند الاستلام • دعم مستمر • إدارة المنتجات والطلبات</p>
        </div>
      </div>
    </footer>
  </>;
}
