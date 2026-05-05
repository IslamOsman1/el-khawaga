import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function OffersPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products?deals=true&limit=100')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const offerSections = useMemo(() => {
    const grouped = new Map();

    products.forEach((product) => {
      const key = product.category || 'عروض';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(product);
    });

    return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
  }, [products]);

  return <main className="app-shell home-screen market-home category-page-shell">
    <section className="panel-card category-page-hero">
      <div className="section-head">
        <div>
          <span className="market-pill">العروض</span>
          <h1>عروض اليوم</h1>
          <p>كل المنتجات التي عليها خصومات أو عروض مجمعة في صفحة واحدة، ومقسمة حسب الفئة.</p>
        </div>
        <Link to="/" className="secondary-btn">العودة للرئيسية</Link>
      </div>
    </section>

    <section className="panel-card products-panel category-products-panel">
      <div className="section-head compact">
        <h2>فئات العروض</h2>
        <span>{loading ? 'جاري التحميل...' : `${products.length} عرض`}</span>
      </div>

      {loading ? <p className="muted">جاري تحميل العروض...</p> : offerSections.length ? <div className="product-sections">
        {offerSections.map((section) => <section key={section.title} className="product-section">
          <div className="section-head compact">
            <h3>{section.title}</h3>
            <span>{section.items.length} منتج</span>
          </div>
          <div className="products-grid">
            {section.items.map((product) => <ProductCard key={`offer-${section.title}-${product._id}`} product={product} />)}
          </div>
        </section>)}
      </div> : <div className="empty-state">
        <p>لا توجد عروض متاحة حاليًا.</p>
        <Link to="/" className="primary-btn">العودة للتسوق</Link>
      </div>}
    </section>
  </main>;
}
