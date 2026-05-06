import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBasket, Star, Truck } from 'lucide-react';
import api from '../api/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups } from '../utils/categoryHelpers.js';

const categoryCards = [
  { title: 'الخضار الطازج', category: 'خضار', subtitle: 'اختيار يومي من السوق', emoji: '🥬' },
  { title: 'الفاكهة', category: 'فاكهه', subtitle: 'جودة ممتازة طوال اليوم', emoji: '🍊' },
  { title: 'الألبان', category: 'ألبان', subtitle: 'منتجات مبردة بعناية', emoji: '🥛' },
  { title: 'البقالة', category: 'بقالة', subtitle: 'كل احتياجات البيت', emoji: '🛒' }
];

const serviceCards = [
  { title: 'توصيل سريع', icon: <Truck size={22} /> },
  { title: 'خدمة موثوقة', icon: <Star size={22} /> },
  { title: 'طلب سهل', icon: <ShoppingBasket size={22} /> }
];

const fallbackSlides = [
  {
    id: 'promo-1',
    title: 'عرض منتج جديد',
    tag: 'جديد',
    note: 'بانر دعائي لمنتج أو حملة جديدة',
    accentClass: 'promo-red'
  },
  {
    id: 'promo-2',
    title: 'خصم لفترة محدودة',
    tag: 'خصم خاص',
    note: 'استخدم السلايدر لعرض منتج مميز أو تخفيض قوي',
    accentClass: 'promo-gold'
  },
  {
    id: 'promo-3',
    title: 'الأكثر طلبًا اليوم',
    tag: 'مميز',
    note: 'مساحة واضحة لعرض صورة المنتج فقط',
    accentClass: 'promo-dark'
  }
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const { settings } = useStoreSettings();
  const categoryGroups = useMemo(() => getCategoryGroups(settings), [settings]);

  useEffect(() => {
    setLoading(true);
    api.get('/products')
      .then(({ data }) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const heroSlides = useMemo(() => {
    const adminSlides = settings?.home?.heroSlides?.filter((slide) => slide?.title || slide?.image);
    if (adminSlides?.length) {
      return adminSlides.map((slide, index) => ({
        id: `admin-slide-${index}`,
        title: slide.title,
        tag: slide.tag || 'مميز',
        note: slide.note,
        image: slide.image,
        link: slide.link || '/offers'
      }));
    }

    const imageProducts = products.filter((product) => product.image?.url).slice(0, 3);
    if (imageProducts.length) {
      return imageProducts.map((product, index) => ({
        id: product._id,
        title: product.name,
        tag: index === 0 ? 'جديد' : index === 1 ? 'عرض خاص' : 'منتج مميز',
        note: product.oldPrice > product.price ? `الآن بسعر ${product.price} ج.م` : product.category,
        image: product.image?.url,
        link: `/product/${product._id}`
      }));
    }

    return fallbackSlides;
  }, [products, settings]);

  useEffect(() => {
    if (!heroSlides.length) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroSlides]);

  useEffect(() => {
    setActiveSlide((current) => (current >= heroSlides.length ? 0 : current));
  }, [heroSlides]);

  const slide = heroSlides[activeSlide] || fallbackSlides[0];
  const bestSellers = products.filter((product) => product.isDeal).slice(0, 8);
  const featuredCategories = settings?.home?.featuredCategories?.length ? settings.home.featuredCategories : categoryCards;
  const exploreCategories = useMemo(() => {
    const featuredLookup = new Map(featuredCategories.map((item) => [item.category || item.title, item]));

    return categoryGroups.map((group) => {
      const sourceCategories = (group.sections || []).map((section) => section.sourceCategory).filter(Boolean);
      const featuredMatch = sourceCategories
        .map((sourceCategory) => featuredLookup.get(sourceCategory))
        .find(Boolean) || featuredLookup.get(group.title);
      const productImage = products.find((product) => sourceCategories.includes(product.category) && product.image?.url)?.image?.url;

      return {
        title: group.title,
        target: group.title,
        image: featuredMatch?.image || productImage || ''
      };
    });
  }, [categoryGroups, featuredCategories, products]);

  return <main className="app-shell home-screen market-home">
    <section className={`market-hero image-promo-hero ${slide.accentClass || ''}`}>
      <button type="button" className="slider-arrow next" onClick={() => setActiveSlide((current) => (current + 1) % heroSlides.length)} aria-label="التالي">
        <ChevronRight size={22} />
      </button>
      <button type="button" className="slider-arrow prev" onClick={() => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length)} aria-label="السابق">
        <ChevronLeft size={22} />
      </button>

      <Link
        to={slide.link || '/offers'}
        className="promo-slide-frame"
        style={slide.image ? { backgroundImage: `linear-gradient(180deg, rgba(9,9,9,.16), rgba(9,9,9,.56)), url(${slide.image})` } : undefined}
      >
        <div className="promo-slide-overlay">
          <span className="promo-slide-tag">{slide.tag}</span>
          <strong>{slide.title}</strong>
          <small>{slide.note}</small>
        </div>
      </Link>

      <div className="slider-dots hero-dots">
        {heroSlides.map((item, index) => <button
          key={item.id}
          type="button"
          className={index === activeSlide ? 'active' : ''}
          onClick={() => setActiveSlide(index)}
          aria-label={`اذهب إلى الشريحة ${index + 1}`}
        />)}
      </div>
    </section>

    <section className="service-strip">
      {serviceCards.map((item) => <div key={item.title}>{item.icon} {item.title}</div>)}
    </section>

    <section className="panel-card market-categories" id="featured">
      <div className="section-head compact">
        <h2>الفئات المميزة</h2>
        <span>ادخل إلى صفحة الفئات لتصفح الأقسام والمنتجات</span>
      </div>
      <div className="market-category-grid">
        {featuredCategories.map((item) => <Link
          to={`/category/${encodeURIComponent(item.category)}`}
          key={item.title}
          className={`market-category-card${item.image ? ' visual' : ''}`}
          style={item.image ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.16), rgba(0,0,0,.72)), url(${item.image})` } : undefined}
        >
          {!item.image && item.emoji ? <span className="market-category-emoji" aria-hidden="true">{item.emoji}</span> : null}
          <strong>{item.title}</strong>
          <small>{item.subtitle}</small>
        </Link>)}
      </div>
    </section>

    <section className="panel-card products-panel" id="products">
      <div className="section-head">
        <div>
          <h2>الأكثر مبيعًا</h2>
          <p>اختيارات مميزة من أكثر المنتجات طلبًا.</p>
        </div>
        <Link to="/categories" className="section-link">اذهب إلى الفئات</Link>
      </div>

      {loading ? <p className="muted">جاري تحميل المنتجات...</p> : <div className="product-sections">
        {!!bestSellers.length && <section className="product-section">
          <div className="products-grid">{bestSellers.map((product) => <ProductCard key={`best-${product._id}`} product={product} />)}</div>
        </section>}
        {!bestSellers.length && <p className="muted">لا توجد منتجات معلمة حاليًا لهذا القسم.</p>}
      </div>}
    </section>

    <section className="panel-card explore-categories-panel" id="explore-categories">
      <div className="explore-categories-head">
        <h2>استكشف فئاتنا</h2>
        <p>تصفح أقسام المتجر بسهولة واختر الفئة التي تناسب طلبك.</p>
      </div>

      <div className="explore-categories-grid">
        {exploreCategories.map((item) => <Link
          to={`/category/${encodeURIComponent(item.target)}`}
          key={item.title}
          className="explore-category-card"
        >
          <strong>{item.title}</strong>
          <div className="explore-category-image-wrap">
            {item.image ? <img src={item.image} alt={item.title} className="explore-category-image" loading="lazy" /> : <span className="explore-category-fallback">{item.title}</span>}
          </div>
        </Link>)}
      </div>
    </section>
  </main>;
}
