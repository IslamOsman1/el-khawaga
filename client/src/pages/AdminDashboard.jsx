import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FolderTree,
  Package,
  Palette,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Tag,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { getCategoryGroups, getSourceCategories } from '../utils/categoryHelpers.js';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  oldPrice: '',
  category: '',
  subcategory: '',
  unit: 'قطعة',
  countInStock: '',
  featured: false,
  isDeal: false
};

const defaultCategoryGroups = [
  {
    title: '',
    subtitle: '',
    sections: [{ title: '', sourceCategory: '' }]
  }
];

const defaultSettingsForm = {
  storeName: '',
  storeTagline: '',
  supportEmail: '',
  supportPhone: '',
  address: '',
  workingHours: '',
  whatsapp: '',
  about: {
    title: '',
    description: '',
    vision: '',
    mission: '',
    values: ''
  },
  home: {
    heroSlides: [
      { title: '', tag: '', note: '', image: '', link: '' },
      { title: '', tag: '', note: '', image: '', link: '' },
      { title: '', tag: '', note: '', image: '', link: '' }
    ],
    featuredCategories: [
      { title: '', subtitle: '', category: '', image: '' },
      { title: '', subtitle: '', category: '', image: '' },
      { title: '', subtitle: '', category: '', image: '' },
      { title: '', subtitle: '', category: '', image: '' }
    ]
  },
  categoryGroups: defaultCategoryGroups,
  checkout: {
    shippingFee: 35,
    freeShippingThreshold: 500
  },
  payment: {
    cashOnDeliveryEnabled: true,
    onlinePaymentEnabled: false,
    onlineProvider: 'stripe',
    currency: 'egp',
    stripePublishableKey: '',
    stripeSecretKey: ''
  }
};

const dashboardSections = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'categories', label: 'الفئات والأقسام', icon: FolderTree },
  { id: 'store', label: 'إعدادات المتجر', icon: Store },
  { id: 'content', label: 'المحتوى والبنرات', icon: Palette },
  { id: 'payments', label: 'الدفع والتكامل', icon: CreditCard },
  { id: 'orders', label: 'الطلبات', icon: ShoppingBag }
];

const normalizeText = (value) => String(value || '').toLowerCase();

const normalizeSettings = (data) => ({
  ...defaultSettingsForm,
  ...data,
  about: {
    ...defaultSettingsForm.about,
    ...(data.about || {})
  },
  home: {
    heroSlides: [...(data.home?.heroSlides || []), ...defaultSettingsForm.home.heroSlides].slice(0, 3),
    featuredCategories: [...(data.home?.featuredCategories || []), ...defaultSettingsForm.home.featuredCategories].slice(0, 4)
  },
  categoryGroups: data.categoryGroups?.length ? data.categoryGroups : defaultCategoryGroups,
  checkout: {
    ...defaultSettingsForm.checkout,
    ...(data.checkout || {})
  },
  payment: {
    ...defaultSettingsForm.payment,
    ...(data.payment || {})
  }
});

function Field({ label, children }) {
  return <label className="admin-field">
    <span className="admin-field-label">{label}</span>
    {children}
  </label>;
}

function SearchBox({ value, onChange, placeholder }) {
  return <label className="admin-search-box">
    <Search size={18} />
    <input value={value} onChange={onChange} placeholder={placeholder} />
  </label>;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState(null);
  const [uploadingFeaturedCategoryIndex, setUploadingFeaturedCategoryIndex] = useState(null);
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerms, setSearchTerms] = useState({
    products: '',
    categories: '',
    store: '',
    content: '',
    payments: '',
    orders: ''
  });
  const { refresh } = useStoreSettings();

  const categoryGroups = useMemo(() => getCategoryGroups(settingsForm), [settingsForm]);
  const sourceCategories = useMemo(() => getSourceCategories(categoryGroups), [categoryGroups]);

  const availableSections = useMemo(() => {
    if (!productForm.category) return [];
    return categoryGroups
      .flatMap((group) => group.sections || [])
      .filter((section) => section.sourceCategory === productForm.category);
  }, [categoryGroups, productForm.category]);

  const stats = useMemo(() => ({
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.isPaid).length,
    openOrders: orders.filter((order) => order.status !== 'تم التسليم' && order.status !== 'ملغي').length,
    totalProducts: products.length
  }), [orders, products]);

  const filteredProducts = useMemo(() => {
    const term = normalizeText(searchTerms.products);
    return [...products]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((product) => !term || [
        product.name,
        product.description,
        product.category,
        product.subcategory,
        product.unit
      ].some((value) => normalizeText(value).includes(term)));
  }, [products, searchTerms.products]);

  const filteredCategoryGroups = useMemo(() => {
    const term = normalizeText(searchTerms.categories);
    return settingsForm.categoryGroups
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => !term || [
        group.title,
        group.subtitle,
        ...(group.sections || []).flatMap((section) => [section.title, section.sourceCategory])
      ].some((value) => normalizeText(value).includes(term)));
  }, [settingsForm.categoryGroups, searchTerms.categories]);

  const filteredHeroSlides = useMemo(() => {
    const term = normalizeText(searchTerms.content);
    return settingsForm.home.heroSlides
      .map((slide, index) => ({ slide, index }))
      .filter(({ slide }) => !term || [
        slide.title,
        slide.tag,
        slide.note,
        slide.image,
        slide.link
      ].some((value) => normalizeText(value).includes(term)));
  }, [settingsForm.home.heroSlides, searchTerms.content]);

  const filteredFeaturedCategories = useMemo(() => {
    const term = normalizeText(searchTerms.content);
    return settingsForm.home.featuredCategories
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !term || [
        item.title,
        item.subtitle,
        item.category,
        item.image
      ].some((value) => normalizeText(value).includes(term)));
  }, [settingsForm.home.featuredCategories, searchTerms.content]);

  const filteredOrders = useMemo(() => {
    const term = normalizeText(searchTerms.orders);
    return [...orders]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((order) => !term || [
        order.user?.name,
        order.paymentMethod,
        order.status,
        order.totalPrice
      ].some((value) => normalizeText(value).includes(term)));
  }, [orders, searchTerms.orders]);

  const visibleStoreCards = useMemo(() => {
    const term = normalizeText(searchTerms.store);
    return {
      identity: !term || [
        'الهوية الأساسية',
        settingsForm.storeName,
        settingsForm.storeTagline,
        settingsForm.supportPhone,
        settingsForm.supportEmail,
        settingsForm.address,
        settingsForm.workingHours,
        settingsForm.whatsapp
      ].some((value) => normalizeText(value).includes(term)),
      shipping: !term || [
        'الشحن والتوصيل',
        settingsForm.checkout.shippingFee,
        settingsForm.checkout.freeShippingThreshold
      ].some((value) => normalizeText(value).includes(term))
    };
  }, [searchTerms.store, settingsForm]);

  const visiblePaymentCards = useMemo(() => {
    const term = normalizeText(searchTerms.payments);
    return {
      payment: !term || [
        'الدفع',
        settingsForm.payment.currency,
        settingsForm.payment.onlineProvider,
        settingsForm.payment.stripePublishableKey,
        settingsForm.payment.stripeSecretKey
      ].some((value) => normalizeText(value).includes(term))
    };
  }, [searchTerms.payments, settingsForm]);

  const load = async () => {
    const [productsResponse, ordersResponse, settingsResponse] = await Promise.all([
      api.get('/products?limit=100'),
      api.get('/orders'),
      api.get('/settings/admin')
    ]);

    setProducts(productsResponse.data.products || []);
    setOrders(ordersResponse.data || []);
    setSettingsForm(normalizeSettings(settingsResponse.data));
  };

  useEffect(() => {
    load().catch(() => toast.error('تعذر تحميل لوحة التحكم'));
  }, []);

  const changeSearch = (key, value) => {
    setSearchTerms((current) => ({ ...current, [key]: value }));
  };

  const changeProduct = (event) => {
    const { name, value, type, checked } = event.target;
    setProductForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'category') next.subcategory = '';
      return next;
    });
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(productForm).forEach(([key, value]) => formData.append(key, value));
    if (image) formData.append('image', image);

    try {
      if (editing) {
        await api.put(`/products/${editing}`, formData);
      } else {
        await api.post('/products', formData);
      }

      toast.success(editing ? 'تم تعديل المنتج' : 'تمت إضافة المنتج');
      setProductForm(emptyProduct);
      setImage(null);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ المنتج');
    }
  };

  const editProduct = (product) => {
    setEditing(product._id);
    setActiveSection('products');
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      category: product.category,
      subcategory: product.subcategory || '',
      unit: product.unit,
      countInStock: product.countInStock,
      featured: product.featured,
      isDeal: product.isDeal
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeProduct = async (id) => {
    if (!window.confirm('حذف المنتج؟')) return;
    await api.delete(`/products/${id}`);
    toast.success('تم حذف المنتج');
    load();
  };

  const changeStatus = async (id, status) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  const changeSettingsField = (path, value) => {
    setSettingsForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      let ref = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        ref = ref[path[index]];
      }
      ref[path[path.length - 1]] = value;
      return next;
    });
  };

  const addCategoryGroup = () => {
    setSettingsForm((current) => ({
      ...current,
      categoryGroups: [{ title: '', subtitle: '', sections: [{ title: '', sourceCategory: '' }] }, ...current.categoryGroups]
    }));
  };

  const removeCategoryGroup = (groupIndex) => {
    setSettingsForm((current) => ({
      ...current,
      categoryGroups: current.categoryGroups.filter((_, index) => index !== groupIndex)
    }));
  };

  const addSectionToGroup = (groupIndex) => {
    setSettingsForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      next.categoryGroups[groupIndex].sections.unshift({ title: '', sourceCategory: '' });
      return next;
    });
  };

  const removeSectionFromGroup = (groupIndex, sectionIndex) => {
    setSettingsForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      next.categoryGroups[groupIndex].sections = next.categoryGroups[groupIndex].sections.filter((_, index) => index !== sectionIndex);
      return next;
    });
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      await api.put('/settings/admin', settingsForm);
      await refresh();
      toast.success('تم حفظ الإعدادات');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل حفظ الإعدادات');
    } finally {
      setSettingsSaving(false);
    }
  };

  const uploadBanner = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingBannerIndex(index);
    try {
      const { data } = await api.post('/settings/admin/banner-upload', formData);
      changeSettingsField(['home', 'heroSlides', index, 'image'], data.url);
      toast.success('تم رفع صورة البنر');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل رفع صورة البنر');
    } finally {
      setUploadingBannerIndex(null);
    }
  };

  const uploadFeaturedCategoryImage = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingFeaturedCategoryIndex(index);
    try {
      const { data } = await api.post('/settings/admin/banner-upload', formData);
      changeSettingsField(['home', 'featuredCategories', index, 'image'], data.url);
      toast.success('تم رفع صورة الفئة المميزة');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل رفع صورة الفئة المميزة');
    } finally {
      setUploadingFeaturedCategoryIndex(null);
    }
  };

  const sectionClass = (id) => `dashboard-tab-btn${activeSection === id ? ' active' : ''}`;

  return <main className="container page admin-dashboard-page">
    <section className="admin-dashboard-hero">
      <div className="admin-hero-copy">
        <span className="market-pill">لوحة التحكم</span>
        <h1>إدارة المتجر من مكان واحد</h1>
        <p>تحكم في المنتجات، الفئات، الأقسام، المحتوى، الشحن، وطرق الدفع من لوحة واضحة وسهلة الاستخدام.</p>
      </div>
      <div className="admin-hero-stats">
        <article className="admin-kpi-card"><span>إجمالي الطلبات</span><strong>{stats.totalOrders}</strong></article>
        <article className="admin-kpi-card"><span>طلبات مدفوعة</span><strong>{stats.paidOrders}</strong></article>
        <article className="admin-kpi-card"><span>طلبات مفتوحة</span><strong>{stats.openOrders}</strong></article>
        <article className="admin-kpi-card"><span>عدد المنتجات</span><strong>{stats.totalProducts}</strong></article>
      </div>
    </section>

    <nav className="admin-dashboard-tabs">
      {dashboardSections.map((section) => {
        const Icon = section.icon;
        return <button key={section.id} type="button" className={sectionClass(section.id)} onClick={() => setActiveSection(section.id)}>
          <Icon size={18} />
          <span>{section.label}</span>
        </button>;
      })}
    </nav>

    <div className="admin-dashboard-grid">
      <section className={`admin-dashboard-panel${activeSection === 'products' ? ' active' : ''}`}>
        <div className="admin-section-head">
          <div>
            <h2>{editing ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
            <p>أنشئ منتجات جديدة أو عدّل الحالية مع ربطها بالفئات والأقسام الموجودة.</p>
          </div>
        </div>
        <SearchBox value={searchTerms.products} onChange={(event) => changeSearch('products', event.target.value)} placeholder="ابحث عن منتج بالاسم أو الفئة أو القسم..." />

        <form onSubmit={submitProduct} className="admin-dashboard-form">
          <div className="admin-dashboard-form-grid">
            <Field label="اسم المنتج"><input name="name" value={productForm.name} onChange={changeProduct} placeholder="مثال: جبنة قريش" required /></Field>
            <Field label="الوصف"><input name="description" value={productForm.description} onChange={changeProduct} placeholder="وصف مختصر للمنتج" /></Field>
            <Field label="السعر"><input name="price" value={productForm.price} onChange={changeProduct} type="number" placeholder="0" required /></Field>
            <Field label="السعر قبل الخصم"><input name="oldPrice" value={productForm.oldPrice} onChange={changeProduct} type="number" placeholder="0" /></Field>
            <Field label="الفئة المرتبط بها المنتج">
              <select name="category" value={productForm.category} onChange={changeProduct} required>
                <option value="">اختر الفئة الأساسية</option>
                {sourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="القسم الفرعي">
              <select name="subcategory" value={productForm.subcategory} onChange={changeProduct}>
                <option value="">بدون قسم فرعي</option>
                {availableSections.map((section) => <option key={`${section.sourceCategory}-${section.title}`} value={section.title}>{section.title}</option>)}
              </select>
            </Field>
            <Field label="الوحدة"><input name="unit" value={productForm.unit} onChange={changeProduct} placeholder="قطعة / كجم / لتر" /></Field>
            <Field label="المخزون"><input name="countInStock" value={productForm.countInStock} onChange={changeProduct} type="number" placeholder="0" required /></Field>
          </div>

          <div className="admin-toggle-row">
            <label className="admin-toggle-pill"><input type="checkbox" name="featured" checked={productForm.featured} onChange={changeProduct} /> منتج مميز</label>
            <label className="admin-toggle-pill"><input type="checkbox" name="isDeal" checked={productForm.isDeal} onChange={changeProduct} /> ضمن العروض</label>
            <label className="admin-file-pill">
              <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} />
              <span>{image ? image.name : 'اختيار صورة المنتج'}</span>
            </label>
          </div>

          <button className="primary-btn admin-submit-btn">
            <Save size={16} />
            <span>{editing ? 'حفظ التعديل' : 'إضافة المنتج'}</span>
          </button>
        </form>

        <div className="admin-table-card">
          <div className="admin-section-head compact">
            <div>
              <h3>المنتجات الحالية</h3>
              <p>{filteredProducts.length} عنصر</p>
            </div>
          </div>
          <div className="table-wrap admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الفئة</th>
                  <th>القسم</th>
                  <th>السعر</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => <tr key={product._id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.subcategory || '-'}</td>
                  <td>{product.price} ج.م</td>
                  <td>
                    <button type="button" className="table-action-btn" onClick={() => editProduct(product)}>تعديل</button>
                    <button type="button" className="table-action-btn danger" onClick={() => removeProduct(product._id)}>حذف</button>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`admin-dashboard-panel${activeSection === 'categories' ? ' active' : ''}`}>
        <div className="admin-section-head">
          <div>
            <h2>إدارة الفئات والأقسام</h2>
            <p>أنشئ الفئات الرئيسية، ثم أضف بداخل كل فئة الأقسام الفرعية واربطها بالفئة الأساسية للمنتجات.</p>
          </div>
          <button type="button" className="secondary-btn" onClick={addCategoryGroup}>إضافة فئة رئيسية</button>
        </div>
        <SearchBox value={searchTerms.categories} onChange={(event) => changeSearch('categories', event.target.value)} placeholder="ابحث عن فئة أو قسم..." />

        <form className="admin-dashboard-form" onSubmit={saveSettings}>
          <div className="admin-category-groups-stack">
            {filteredCategoryGroups.map(({ group, index: groupIndex }) => <article key={`group-${groupIndex}`} className="admin-setting-card">
              <div className="admin-section-head compact">
                <div>
                  <h3>الفئة الرئيسية {groupIndex + 1}</h3>
                  <p>تحكم في الاسم والوصف والأقسام الفرعية داخل هذه الفئة.</p>
                </div>
                <button type="button" className="table-action-btn danger" onClick={() => removeCategoryGroup(groupIndex)}>حذف الفئة</button>
              </div>

              <div className="admin-dashboard-form-grid two-cols">
                <Field label="اسم الفئة الرئيسية">
                  <input value={group.title} onChange={(event) => changeSettingsField(['categoryGroups', groupIndex, 'title'], event.target.value)} placeholder="مثال: أجبان ولحوم" />
                </Field>
                <Field label="وصف مختصر للفئة">
                  <input value={group.subtitle} onChange={(event) => changeSettingsField(['categoryGroups', groupIndex, 'subtitle'], event.target.value)} placeholder="وصف يظهر في صفحة الفئات" />
                </Field>
              </div>

              <div className="admin-subsections-stack">
                {(group.sections || []).map((section, sectionIndex) => <div key={`section-${groupIndex}-${sectionIndex}`} className="admin-subsection-card">
                  <Field label="اسم القسم">
                    <input value={section.title} onChange={(event) => changeSettingsField(['categoryGroups', groupIndex, 'sections', sectionIndex, 'title'], event.target.value)} placeholder="مثال: جبن قريش" />
                  </Field>
                  <Field label="الفئة الأساسية للمنتجات">
                    <input value={section.sourceCategory} onChange={(event) => changeSettingsField(['categoryGroups', groupIndex, 'sections', sectionIndex, 'sourceCategory'], event.target.value)} placeholder="مثال: ألبان / بقالة / خضار" />
                  </Field>
                  <button type="button" className="table-action-btn danger" onClick={() => removeSectionFromGroup(groupIndex, sectionIndex)}>حذف القسم</button>
                </div>)}
              </div>

              <button type="button" className="secondary-btn" onClick={() => addSectionToGroup(groupIndex)}>إضافة قسم فرعي</button>
            </article>)}
          </div>

          <button className="primary-btn admin-submit-btn" disabled={settingsSaving}>
            <Save size={16} />
            <span>{settingsSaving ? 'جارٍ الحفظ...' : 'حفظ الفئات والأقسام'}</span>
          </button>
        </form>
      </section>

      <section className={`admin-dashboard-panel${activeSection === 'store' ? ' active' : ''}`}>
        <div className="admin-section-head"><div><h2>إعدادات المتجر</h2><p>عدّل بيانات المتجر الأساسية ووسائل التواصل والشحن.</p></div><Store size={18} /></div>
        <SearchBox value={searchTerms.store} onChange={(event) => changeSearch('store', event.target.value)} placeholder="ابحث داخل إعدادات المتجر..." />
        <form className="admin-dashboard-form" onSubmit={saveSettings}>
          <div className="admin-settings-cluster">
            {visibleStoreCards.identity && <article className="admin-setting-card">
              <div className="admin-setting-card-head"><Settings2 size={18} /><strong>الهوية الأساسية</strong></div>
              <div className="admin-dashboard-form-grid">
                <Field label="اسم المتجر"><input value={settingsForm.storeName} onChange={(event) => changeSettingsField(['storeName'], event.target.value)} placeholder="اسم المتجر" /></Field>
                <Field label="وصف قصير"><input value={settingsForm.storeTagline} onChange={(event) => changeSettingsField(['storeTagline'], event.target.value)} placeholder="وصف قصير للمتجر" /></Field>
                <Field label="رقم الدعم"><input value={settingsForm.supportPhone} onChange={(event) => changeSettingsField(['supportPhone'], event.target.value)} placeholder="رقم الدعم" /></Field>
                <Field label="بريد الدعم"><input value={settingsForm.supportEmail} onChange={(event) => changeSettingsField(['supportEmail'], event.target.value)} placeholder="بريد الدعم" /></Field>
                <Field label="العنوان"><input value={settingsForm.address} onChange={(event) => changeSettingsField(['address'], event.target.value)} placeholder="العنوان" /></Field>
                <Field label="مواعيد العمل"><input value={settingsForm.workingHours} onChange={(event) => changeSettingsField(['workingHours'], event.target.value)} placeholder="مواعيد العمل" /></Field>
                <Field label="رقم واتساب"><input value={settingsForm.whatsapp} onChange={(event) => changeSettingsField(['whatsapp'], event.target.value)} placeholder="واتساب" /></Field>
              </div>
            </article>}
            {visibleStoreCards.shipping && <article className="admin-setting-card">
              <div className="admin-setting-card-head"><Truck size={18} /><strong>الشحن والتوصيل</strong></div>
              <div className="admin-dashboard-form-grid two-cols">
                <Field label="رسوم الشحن"><input type="number" value={settingsForm.checkout.shippingFee} onChange={(event) => changeSettingsField(['checkout', 'shippingFee'], Number(event.target.value))} placeholder="رسوم الشحن" /></Field>
                <Field label="حد الشحن المجاني"><input type="number" value={settingsForm.checkout.freeShippingThreshold} onChange={(event) => changeSettingsField(['checkout', 'freeShippingThreshold'], Number(event.target.value))} placeholder="حد الشحن المجاني" /></Field>
              </div>
            </article>}
          </div>
          <button className="primary-btn admin-submit-btn" disabled={settingsSaving}><Save size={16} /><span>{settingsSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات المتجر'}</span></button>
        </form>
      </section>

      <section className={`admin-dashboard-panel${activeSection === 'content' ? ' active' : ''}`}>
        <div className="admin-section-head"><div><h2>المحتوى والبنرات</h2><p>تحكم في محتوى صفحة من نحن وبنرات السلايدر الرئيسية.</p></div><Palette size={18} /></div>
        <SearchBox value={searchTerms.content} onChange={(event) => changeSearch('content', event.target.value)} placeholder="ابحث عن بانر أو فئة مميزة أو نص..." />
        <form className="admin-dashboard-form" onSubmit={saveSettings}>
          <div className="admin-settings-cluster">
            <article className="admin-setting-card">
              <div className="admin-setting-card-head"><Tag size={18} /><strong>محتوى الصفحات</strong></div>
              <div className="admin-text-grid enhanced">
                <Field label="عنوان من نحن"><textarea value={settingsForm.about.title} onChange={(event) => changeSettingsField(['about', 'title'], event.target.value)} placeholder="عنوان من نحن" /></Field>
                <Field label="وصف من نحن"><textarea value={settingsForm.about.description} onChange={(event) => changeSettingsField(['about', 'description'], event.target.value)} placeholder="وصف من نحن" /></Field>
                <Field label="الرؤية"><textarea value={settingsForm.about.vision} onChange={(event) => changeSettingsField(['about', 'vision'], event.target.value)} placeholder="الرؤية" /></Field>
                <Field label="الرسالة"><textarea value={settingsForm.about.mission} onChange={(event) => changeSettingsField(['about', 'mission'], event.target.value)} placeholder="الرسالة" /></Field>
                <Field label="القيم"><textarea value={settingsForm.about.values} onChange={(event) => changeSettingsField(['about', 'values'], event.target.value)} placeholder="القيم" /></Field>
              </div>
            </article>
            <article className="admin-setting-card">
              <div className="admin-setting-card-head"><Palette size={18} /><strong>بنرات الرئيسية</strong></div>
              <div className="admin-slides-grid enhanced">
                {filteredHeroSlides.map(({ slide, index }) => <div key={`slide-${index}`} className="admin-slide-card refined">
                  <strong>بانر {index + 1}</strong>
                  <Field label="العنوان"><input value={slide.title} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'title'], event.target.value)} placeholder="العنوان" /></Field>
                  <Field label="الشارة"><input value={slide.tag} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'tag'], event.target.value)} placeholder="الشارة" /></Field>
                  <Field label="الوصف"><input value={slide.note} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'note'], event.target.value)} placeholder="الوصف" /></Field>
                  <Field label="رابط الصورة"><input value={slide.image} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'image'], event.target.value)} placeholder="رابط الصورة" /></Field>
                  <Field label="الرابط عند الضغط"><input value={slide.link || ''} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'link'], event.target.value)} placeholder="/offers أو /product/123" /></Field>
                  <label className="admin-file-pill admin-banner-upload">
                    <input type="file" accept="image/*" onChange={(event) => uploadBanner(index, event.target.files?.[0] || null)} />
                    <span>{uploadingBannerIndex === index ? 'جارٍ رفع الصورة...' : 'رفع صورة البنر'}</span>
                  </label>
                </div>)}
              </div>
            </article>
            <article className="admin-setting-card">
              <div className="admin-setting-card-head"><FolderTree size={18} /><strong>الفئات المميزة</strong></div>
              <div className="admin-slides-grid enhanced">
                {filteredFeaturedCategories.map(({ item, index }) => <div key={`featured-category-${index}`} className="admin-slide-card refined">
                  <strong>فئة مميزة {index + 1}</strong>
                  <Field label="العنوان"><input value={item.title} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'title'], event.target.value)} placeholder="العنوان" /></Field>
                  <Field label="الوصف المختصر"><input value={item.subtitle} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'subtitle'], event.target.value)} placeholder="الوصف المختصر" /></Field>
                  <Field label="الرابط إلى الفئة">
                    <select value={item.category} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'category'], event.target.value)}>
                      <option value="">اختر فئة</option>
                      {sourceCategories.map((category) => <option key={`featured-${category}`} value={category}>{category}</option>)}
                    </select>
                  </Field>
                  <Field label="رابط الصورة"><input value={item.image} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'image'], event.target.value)} placeholder="رابط الصورة" /></Field>
                  <label className="admin-file-pill admin-banner-upload">
                    <input type="file" accept="image/*" onChange={(event) => uploadFeaturedCategoryImage(index, event.target.files?.[0] || null)} />
                    <span>{uploadingFeaturedCategoryIndex === index ? 'جارٍ رفع الصورة...' : 'رفع صورة الفئة'}</span>
                  </label>
                </div>)}
              </div>
            </article>
          </div>
          <button className="primary-btn admin-submit-btn" disabled={settingsSaving}><Save size={16} /><span>{settingsSaving ? 'جارٍ الحفظ...' : 'حفظ المحتوى والبنرات'}</span></button>
        </form>
      </section>

      <section className={`admin-dashboard-panel${activeSection === 'payments' ? ' active' : ''}`}>
        <div className="admin-section-head"><div><h2>الدفع والتكاملات</h2><p>فعّل طرق الدفع من اللوحة، بينما يعمل Google Login الآن من متغيرات البيئة مباشرة.</p></div><CreditCard size={18} /></div>
        <SearchBox value={searchTerms.payments} onChange={(event) => changeSearch('payments', event.target.value)} placeholder="ابحث داخل إعدادات الدفع..." />
        <form className="admin-dashboard-form" onSubmit={saveSettings}>
          <div className="admin-settings-cluster">
            {visiblePaymentCards.payment && <article className="admin-setting-card">
              <div className="admin-setting-card-head"><CreditCard size={18} /><strong>الدفع</strong></div>
              <div className="admin-dashboard-form-grid">
                <Field label="العملة"><input value={settingsForm.payment.currency} onChange={(event) => changeSettingsField(['payment', 'currency'], event.target.value)} placeholder="العملة" /></Field>
                <Field label="مزود الدفع"><input value={settingsForm.payment.onlineProvider} onChange={(event) => changeSettingsField(['payment', 'onlineProvider'], event.target.value)} placeholder="مزود الدفع" /></Field>
                <Field label="Stripe Publishable Key"><input value={settingsForm.payment.stripePublishableKey} onChange={(event) => changeSettingsField(['payment', 'stripePublishableKey'], event.target.value)} placeholder="Stripe Publishable Key" /></Field>
                <Field label="Stripe Secret Key"><input value={settingsForm.payment.stripeSecretKey} onChange={(event) => changeSettingsField(['payment', 'stripeSecretKey'], event.target.value)} placeholder="Stripe Secret Key" /></Field>
              </div>
              <div className="admin-toggle-row">
                <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.cashOnDeliveryEnabled} onChange={(event) => changeSettingsField(['payment', 'cashOnDeliveryEnabled'], event.target.checked)} /> تفعيل الدفع عند الاستلام</label>
                <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.onlinePaymentEnabled} onChange={(event) => changeSettingsField(['payment', 'onlinePaymentEnabled'], event.target.checked)} /> تفعيل الدفع الأونلاين</label>
              </div>
            </article>}
          </div>
          <button className="primary-btn admin-submit-btn" disabled={settingsSaving}><Save size={16} /><span>{settingsSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الدفع والتكامل'}</span></button>
        </form>
      </section>

      <section className={`admin-dashboard-panel${activeSection === 'orders' ? ' active' : ''}`}>
        <div className="admin-section-head"><div><h2>إدارة الطلبات</h2><p>تابع الطلبات وغيّر حالتها بسرعة من جدول واحد.</p></div><ShoppingBag size={18} /></div>
        <SearchBox value={searchTerms.orders} onChange={(event) => changeSearch('orders', event.target.value)} placeholder="ابحث عن طلب باسم العميل أو الحالة..." />
        <div className="admin-table-card">
          <div className="table-wrap admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الإجمالي</th>
                  <th>الدفع</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => <tr key={order._id}>
                  <td>{order.user?.name}</td>
                  <td>{order.totalPrice} ج.م</td>
                  <td>{order.isPaid ? 'مدفوع' : order.paymentMethod}</td>
                  <td>
                    <select value={order.status} onChange={(event) => changeStatus(order._id, event.target.value)}>
                      {['جديد', 'قيد التجهيز', 'في الطريق', 'تم التسليم', 'ملغي'].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </main>;
}
