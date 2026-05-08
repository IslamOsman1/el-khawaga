import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups, getSourceCategories } from '../utils/categoryHelpers.js';

export default function OffersPage() {
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
  const allSourceCategories = useMemo(() => getSourceCategories(categoryGroups), [categoryGroups]);
  const [openGroup, setOpenGroup] = useState('');
  const [openSection, setOpenSection] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products?deals=true&limit=100')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const activeGroup = useMemo(
    () => categoryGroups.find((group) => group.title === openGroup) || null,
    [categoryGroups, openGroup]
  );

  const activeSections = useMemo(() => activeGroup?.sections || [], [activeGroup]);

  useEffect(() => {
    if (!activeGroup) {
      setOpenSection('');
      return;
    }

    if (openSection && !activeSections.some((section) => section.title === openSection)) {
      setOpenSection('');
    }
  }, [activeGroup, activeSections, openSection]);

  const visibleCategories = useMemo(() => {
    const productCategories = [...new Set(products.map((product) => product.category).filter(Boolean))];

    if (activeGroup) {
      const groupCategories = [...new Set(activeSections.map((section) => section.sourceCategory).filter(Boolean))];
      return groupCategories.filter((category) => productCategories.includes(category));
    }

    return allSourceCategories.filter((category) => productCategories.includes(category));
  }, [activeGroup, activeSections, allSourceCategories, products]);

  const productSections = useMemo(() => {
    if (openSection && activeGroup) {
      const sectionMeta = activeSections.find((section) => section.title === openSection);
      const sourceCategory = sectionMeta?.sourceCategory;
      if (!sourceCategory) return [];

      const items = products.filter(
        (product) => product.category === sourceCategory && product.subcategory === openSection
      );

      return items.length ? [{ title: openSection, subtitle: activeGroup.title, items }] : [];
    }

    return visibleCategories
      .map((name) => ({
        title: name,
        subtitle: activeGroup?.title || 'العروض',
        items: products.filter((product) => product.category === name)
      }))
      .filter((section) => section.items.length);
  }, [activeGroup, activeSections, openSection, products, visibleCategories]);

  return <main className="app-shell home-screen market-home category-page-shell">
    <section className="primary-category-bar">
      <div className="primary-category-bar-track">
        <button
          type="button"
          className={`primary-category-pill${!openGroup ? ' active' : ''}`}
          onClick={() => {
            setOpenGroup('');
            setOpenSection('');
          }}
        >
          الكل
        </button>

        {categoryGroups.map((group) => (
          <button
            key={group.title}
            type="button"
            className={`primary-category-pill${openGroup === group.title ? ' active' : ''}`}
            onClick={() => {
              setOpenGroup((current) => current === group.title ? '' : group.title);
              setOpenSection('');
            }}
          >
            {group.title}
          </button>
        ))}
      </div>
    </section>

    {activeSections.length ? (
      <section className="secondary-category-bar">
        <div className="secondary-category-bar-track">
          <button
            type="button"
            className={`secondary-category-pill all${!openSection ? ' active' : ''}`}
            onClick={() => setOpenSection('')}
          >
            {`كل ${activeGroup.title}`}
          </button>

          {activeSections.map((section) => (
            <button
              key={section.title}
              type="button"
              className={`secondary-category-pill${openSection === section.title ? ' active' : ''}`}
              onClick={() => setOpenSection(section.title)}
            >
              {section.title}
            </button>
          ))}
        </div>
      </section>
    ) : null}

    <section className="panel-card products-panel category-products-panel">
      <div className="section-head compact">
        <h2>{openSection || openGroup || 'كل العروض'}</h2>
        <span>{loading ? 'جاري التحميل...' : `${products.length} عرض`}</span>
      </div>

      {loading ? (
        <p className="muted">جاري تحميل العروض...</p>
      ) : productSections.length ? (
        <div className="product-sections">
          {productSections.map((section) => (
            <section key={section.title} className="product-section">
              <div className="section-head compact">
                <div>
                  <h3>{section.title}</h3>
                  <span>{section.subtitle}</span>
                </div>
                <span>{section.items.length} منتج</span>
              </div>
              <div className="products-grid">
                {section.items.map((product) => <ProductCard key={`offer-${section.title}-${product._id}`} product={product} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>لا توجد عروض متاحة داخل الفئة الحالية.</p>
          <Link to="/" className="primary-btn">العودة للتسوق</Link>
        </div>
      )}
    </section>
  </main>;
}
