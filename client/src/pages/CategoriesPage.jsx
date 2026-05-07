import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups, getSourceCategories } from '../utils/categoryHelpers.js';

export default function CategoriesPage() {
  const { settings } = useStoreSettings();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search')?.trim() || '';
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
  const allSourceCategories = useMemo(() => getSourceCategories(categoryGroups), [categoryGroups]);
  const [openGroup, setOpenGroup] = useState('');
  const [openSection, setOpenSection] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = searchTerm
      ? `/products?limit=100&keyword=${encodeURIComponent(searchTerm)}`
      : '/products?limit=100';

    api.get(query)
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [searchTerm]);

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
      return searchTerm
        ? groupCategories.filter((category) => productCategories.includes(category))
        : groupCategories;
    }

    return searchTerm ? productCategories : allSourceCategories;
  }, [activeGroup, activeSections, allSourceCategories, products, searchTerm]);

  const productSections = useMemo(() => {
    if (openSection && activeGroup) {
      const sectionMeta = activeSections.find((section) => section.title === openSection);
      const sourceCategory = sectionMeta?.sourceCategory;
      if (!sourceCategory) return [];

      const items = products.filter(
        (product) => product.category === sourceCategory && product.subcategory === openSection
      );

      return items.length ? [{ title: openSection, items }] : [];
    }

    return visibleCategories
      .map((name) => ({
        title: name,
        items: products.filter((product) => product.category === name)
      }))
      .filter((section) => section.items.length);
  }, [activeGroup, activeSections, openSection, products, visibleCategories]);

  const pageTitle = searchTerm
    ? `نتائج البحث: ${searchTerm}`
    : openSection
      ? openSection
      : openGroup || 'كل الفئات';

  const pageDescription = searchTerm
    ? 'المنتجات الظاهرة مطابقة لكلمة البحث الحالية.'
    : openSection
      ? 'المنتجات الظاهرة مرتبطة بالقسم الفرعي المختار، ويمكنك التبديل من الشريط بدون مغادرة الصفحة.'
      : openGroup
        ? 'المنتجات الظاهرة مرتبطة بالفئة المختارة، ويمكنك فتح أي قسم منها مباشرة من الشريط.'
        : 'جميع الفئات مع المنتجات الموجودة داخلها.';

  return (
    <main className="app-shell home-screen market-home category-page-shell">
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

      <section className="panel-card products-panel">
        <div className="section-head">
          <div>
            <h2>{pageTitle}</h2>
            <p>{pageDescription}</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">جاري تحميل المنتجات...</p>
        ) : (
          <div className="product-sections">
            {productSections.map((section) => (
              <section key={section.title} className="product-section">
                <div className="section-head compact">
                  <h3>{section.title}</h3>
                </div>
                <div className="products-grid">
                  {section.items.map((product) => (
                    <ProductCard key={`${section.title}-${product._id}`} product={product} />
                  ))}
                </div>
              </section>
            ))}

            {!productSections.length ? (
              <p className="muted">
                {searchTerm
                  ? 'لا توجد منتجات مطابقة لكلمة البحث الحالية.'
                  : 'لا توجد منتجات متاحة للفئة أو القسم الحالي.'}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
