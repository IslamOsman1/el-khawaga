import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

  const visibleCategories = useMemo(() => {
    const productCategories = [...new Set(products.map((product) => product.category).filter(Boolean))];

    if (openGroup) {
      const selectedGroup = categoryGroups.find((group) => group.title === openGroup);
      if (!selectedGroup) return searchTerm ? productCategories : allSourceCategories;

      const groupCategories = [...new Set((selectedGroup.sections || []).map((section) => section.sourceCategory))];
      return searchTerm
        ? groupCategories.filter((category) => productCategories.includes(category))
        : groupCategories;
    }

    return searchTerm ? productCategories : allSourceCategories;
  }, [allSourceCategories, categoryGroups, openGroup, products, searchTerm]);

  const productSections = useMemo(() => {
    return visibleCategories
      .map((name) => ({
        title: name,
        items: products.filter((product) => product.category === name)
      }))
      .filter((section) => section.items.length);
  }, [products, visibleCategories]);

  const activeGroup = categoryGroups.find((group) => group.title === openGroup);

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
        <Link to={`/category/${encodeURIComponent(activeGroup.title)}`} className="secondary-category-pill all">
          {`كل ${activeGroup.title}`}
        </Link>

        {activeGroup.sections.map((section) => <Link
          key={section.title}
          to={`/category/${encodeURIComponent(section.title)}`}
          className="secondary-category-pill"
        >
          {section.title}
        </Link>)}
      </div>
    </section>}

    <section className="panel-card products-panel">
      <div className="section-head">
        <div>
          <h2>{searchTerm ? `نتائج البحث: ${searchTerm}` : openGroup || 'كل الفئات'}</h2>
          <p>{searchTerm ? 'المنتجات الظاهرة مطابقة لكلمة البحث الحالية.' : openGroup ? 'المنتجات الظاهرة مرتبطة بالفئة المختارة.' : 'جميع الفئات مع المنتجات الموجودة داخلها.'}</p>
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

        {!productSections.length && <p className="muted">{searchTerm ? 'لا توجد منتجات مطابقة لكلمة البحث الحالية.' : 'لا توجد منتجات متاحة للفئات الحالية.'}</p>}
      </div>}
    </section>
  </main>;
}
