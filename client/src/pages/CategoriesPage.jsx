import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups, getSourceCategories } from '../utils/categoryHelpers.js';

export default function CategoriesPage() {
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);
  const allSourceCategories = useMemo(() => getSourceCategories(categoryGroups), [categoryGroups]);
  const [openGroup, setOpenGroup] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products?limit=100')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleCategories = useMemo(() => {
    if (!openGroup) return allSourceCategories;

    const selectedGroup = categoryGroups.find((group) => group.title === openGroup);
    if (!selectedGroup) return allSourceCategories;

    return [...new Set((selectedGroup.sections || []).map((section) => section.sourceCategory))];
  }, [allSourceCategories, categoryGroups, openGroup]);

  const productSections = useMemo(() => {
    return visibleCategories
      .map((name) => ({
        title: name,
        items: products.filter((product) => product.category === name)
      }))
      .filter((section) => section.items.length);
  }, [products, visibleCategories]);

  return <main className="app-shell home-screen market-home category-page-shell">
    <section className="panel-card category-directory search-style-directory">
      <div className="section-head compact">
        <h2>تصفح الفئات</h2>
        <span>{categoryGroups.length} فئات رئيسية</span>
      </div>

      <button
        type="button"
        className={`mobile-categories-toggle${mobileFiltersOpen ? ' open' : ''}`}
        onClick={() => setMobileFiltersOpen((current) => !current)}
      >
        <span>الفئات</span>
        <ChevronDown size={16} className="mini-category-arrow" />
      </button>

      <div className={`mini-category-row${mobileFiltersOpen ? ' mobile-open' : ''}`}>
        {categoryGroups.map((group) => {
          const isOpen = openGroup === group.title;

          return <div key={group.title} className={`mini-category-item${isOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="mini-category-trigger"
              onClick={() => setOpenGroup((current) => (current === group.title ? '' : group.title))}
            >
              <span className="mini-category-label">
                <span>{group.title}</span>
              </span>
              <ChevronDown size={16} className="mini-category-arrow" />
            </button>

            {isOpen && <div className="mini-category-sections">
              {(group.sections || []).map((section) => <Link
                key={section.title}
                to={`/category/${encodeURIComponent(section.title)}`}
                className="mini-section-link"
              >
                {section.title}
              </Link>)}
            </div>}
          </div>;
        })}
      </div>
    </section>

    <section className="panel-card products-panel">
      <div className="section-head">
        <div>
          <h2>{openGroup || 'كل الفئات'}</h2>
          <p>{openGroup ? 'المنتجات الظاهرة مرتبطة بالفئة المختارة.' : 'جميع الفئات مع المنتجات الموجودة داخلها.'}</p>
        </div>
      </div>

      {loading ? <p className="muted">جاري تحميل المنتجات...</p> : <div className="product-sections">
        {productSections.map((section) => <section key={section.title} className="product-section">
          <div className="section-head compact">
            <h3>{section.title}</h3>
            <Link to={`/category/${encodeURIComponent(section.title)}`} className="section-link">عرض الكل</Link>
          </div>
          <div className="products-grid">
            {section.items.map((product) => <ProductCard key={`${section.title}-${product._id}`} product={product} />)}
          </div>
        </section>)}

        {!productSections.length && <p className="muted">لا توجد منتجات متاحة للفئات الحالية.</p>}
      </div>}
    </section>
  </main>;
}
