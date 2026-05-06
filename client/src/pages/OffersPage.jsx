import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups } from '../utils/categoryHelpers.js';

export default function OffersPage() {
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
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

  useEffect(() => {
    setOpenSection('');
  }, [openGroup]);

  const activeGroup = categoryGroups.find((group) => group.title === openGroup);

  const visibleSections = useMemo(() => {
    const groupsToUse = activeGroup ? [activeGroup] : categoryGroups;
    const sections = [];

    groupsToUse.forEach((group) => {
      (group.sections || []).forEach((section) => {
        const items = products.filter((product) =>
          product.category === section.sourceCategory &&
          (!product.subcategory || product.subcategory === section.title)
        );

        if (items.length && (!openSection || openSection === section.title)) {
          sections.push({
            groupTitle: group.title,
            title: section.title,
            items
          });
        }
      });
    });

    if (!activeGroup && !openSection) {
      const uncategorized = products.filter((product) => !sections.some((section) =>
        section.items.some((item) => item._id === product._id)
      ));

      if (uncategorized.length) {
        sections.push({
          groupTitle: 'عروض أخرى',
          title: 'عروض أخرى',
          items: uncategorized
        });
      }
    }

    return sections;
  }, [activeGroup, categoryGroups, openSection, products]);

  return <main className="app-shell home-screen market-home category-page-shell">
    <section className="primary-category-bar">
      <div className="primary-category-bar-track">
        <button
          type="button"
          className={`primary-category-pill${!openGroup ? ' active' : ''}`}
          onClick={() => setOpenGroup('')}
        >
          الكل
        </button>

        {categoryGroups.map((group) => <button
          key={group.title}
          type="button"
          className={`primary-category-pill${openGroup === group.title ? ' active' : ''}`}
          onClick={() => setOpenGroup((current) => (current === group.title ? '' : group.title))}
        >
          {group.title}
        </button>)}
      </div>
    </section>

    {!!activeGroup?.sections?.length && <section className="secondary-category-bar">
      <div className="secondary-category-bar-track">
        <button
          type="button"
          className={`secondary-category-pill all${!openSection ? ' active' : ''}`}
          onClick={() => setOpenSection('')}
        >
          {`كل ${activeGroup.title}`}
        </button>

        {activeGroup.sections.map((section) => <button
          key={section.title}
          type="button"
          className={`secondary-category-pill${openSection === section.title ? ' active' : ''}`}
          onClick={() => setOpenSection((current) => (current === section.title ? '' : section.title))}
        >
          {section.title}
        </button>)}
      </div>
    </section>}
    <section className="panel-card products-panel category-products-panel">
      <div className="section-head compact">
        <h2>{openSection || openGroup || 'كل العروض'}</h2>
        <span>{loading ? 'جاري التحميل...' : `${products.length} عرض`}</span>
      </div>

      {loading ? <p className="muted">جاري تحميل العروض...</p> : visibleSections.length ? <div className="product-sections">
        {visibleSections.map((section) => <section key={`${section.groupTitle}-${section.title}`} className="product-section">
          <div className="section-head compact">
            <div>
              <h3>{section.title}</h3>
              <span>{section.groupTitle}</span>
            </div>
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
