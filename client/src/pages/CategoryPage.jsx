import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups, getSourceCategories, resolveCategoryTargetFromGroups } from '../utils/categoryHelpers.js';

export default function CategoryPage() {
  const { name = '' } = useParams();
  const categoryName = useMemo(() => decodeURIComponent(name), [name]);
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
  const allSourceCategories = useMemo(() => getSourceCategories(categoryGroups), [categoryGroups]);
  const resolvedTarget = useMemo(() => resolveCategoryTargetFromGroups(categoryGroups, categoryName), [categoryGroups, categoryName]);
  const [openGroup, setOpenGroup] = useState('');
  const [openSection, setOpenSection] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products?limit=100')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!resolvedTarget) {
      setOpenGroup('');
      setOpenSection('');
      return;
    }

    if (resolvedTarget.parentTitle) {
      setOpenGroup(resolvedTarget.parentTitle);
      setOpenSection(resolvedTarget.title);
      return;
    }

    setOpenGroup(resolvedTarget.title);
    setOpenSection('');
  }, [resolvedTarget]);

  const activeGroup = useMemo(
    () => categoryGroups.find((group) => group.title === openGroup) || null,
    [categoryGroups, openGroup]
  );

  const activeSections = useMemo(() => activeGroup?.sections || [], [activeGroup]);

  useEffect(() => {
    if (!activeGroup) {
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

      return items.length ? [{ title: openSection, items }] : [];
    }

    if (activeGroup) {
      return visibleCategories
        .map((name) => ({
          title: name,
          items: products.filter((product) => product.category === name)
        }))
        .filter((section) => section.items.length);
    }

    if (resolvedTarget?.sourceCategory) {
      const items = products.filter((product) => product.category === resolvedTarget.sourceCategory);
      return items.length ? [{ title: resolvedTarget.title || categoryName, items }] : [];
    }

    const directItems = products.filter((product) => product.category === categoryName || product.subcategory === categoryName);
    return directItems.length ? [{ title: categoryName, items: directItems }] : [];
  }, [activeGroup, activeSections, categoryName, openSection, products, resolvedTarget, visibleCategories]);

  const pageTitle = openSection
    ? openSection
    : openGroup || resolvedTarget?.title || categoryName;

  const pageDescription = openSection
    ? 'المنتجات الظاهرة مرتبطة بالقسم الفرعي المختار داخل هذه الفئة.'
    : openGroup
      ? 'تصفح نفس تصميم صفحة الفئات مع منتجات وأقسام الفئة المختارة.'
      : 'تصفح المنتجات المتاحة داخل هذه الفئة.';

  return (
    <main className="app-shell home-screen market-home category-page-shell">
      {activeGroup ? (
        <>
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
        </>
      ) : null}

      <section className="panel-card products-panel category-products-panel">
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
              <p className="muted">لا توجد منتجات متاحة لهذه الفئة حاليًا.</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
