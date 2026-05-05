import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups } from '../utils/categoryHelpers.js';

export default function AlWekalaProductsPage() {
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products?agency=true&limit=100')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const groupedProducts = useMemo(() => {
    const sections = [];

    categoryGroups.forEach((group) => {
      (group.sections || []).forEach((section) => {
        const items = products.filter((product) =>
          product.category === section.sourceCategory &&
          (!product.subcategory || product.subcategory === section.title)
        );

        if (items.length) {
          sections.push({
            groupTitle: group.title,
            title: section.title,
            sourceCategory: section.sourceCategory,
            items
          });
        }
      });
    });

    const uncategorized = products.filter((product) => !sections.some((section) =>
      section.items.some((item) => item._id === product._id)
    ));

    if (uncategorized.length) {
      sections.push({
        groupTitle: 'منتجات أخرى',
        title: 'منتجات أخرى',
        sourceCategory: '',
        items: uncategorized
      });
    }

    return sections;
  }, [products, categoryGroups]);

  return <main className="app-shell home-screen market-home category-page-shell">
    <section className="panel-card category-page-hero">
      <div className="section-head">
        <div>
          <span className="market-pill">منتجات الوكالة</span>
          <h1>منتجات الوكالة</h1>
          <p>المنتجات هنا مرتبطة بالفئات والأقسام نفسها، ويتم اختيارها من لوحة التحكم لتظهر في هذا القسم.</p>
        </div>
        <Link to="/" className="secondary-btn">العودة للرئيسية</Link>
      </div>
    </section>

    <section className="panel-card products-panel category-products-panel">
      <div className="section-head compact">
        <h2>الفئات والأقسام</h2>
        <span>{loading ? 'جاري التحميل...' : `${products.length} منتج`}</span>
      </div>

      {loading ? <p className="muted">جاري تحميل المنتجات...</p> : groupedProducts.length ? <div className="product-sections">
        {groupedProducts.map((section) => <section key={`${section.groupTitle}-${section.title}`} className="product-section">
          <div className="section-head compact">
            <div>
              <h3>{section.title}</h3>
              <span>{section.groupTitle}{section.sourceCategory ? ` • ${section.sourceCategory}` : ''}</span>
            </div>
            {section.sourceCategory
              ? <Link to={`/category/${encodeURIComponent(section.title)}`} className="section-link">عرض الكل</Link>
              : null}
          </div>
          <div className="category-products-grid">
            {section.items.map((product) => <ProductCard key={`agency-${section.title}-${product._id}`} product={product} />)}
          </div>
        </section>)}
      </div> : <div className="empty-state">
        <p>لا توجد منتجات متاحة حاليًا في هذا القسم.</p>
        <Link to="/admin" className="primary-btn">اذهب إلى لوحة التحكم</Link>
      </div>}
    </section>
  </main>;
}
