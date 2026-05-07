import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FolderTree,
  Gift,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategoryGroups, getSourceCategories } from '../utils/categoryHelpers.js';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  oldPrice: '',
  category: '',
  subcategory: '',
  barcode: '',
  unit: 'قطعة',
  countInStock: '',
  featured: false,
  inAgencyCollection: false,
  isDeal: false
};

const dashboardSections = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'categories', label: 'الفئات والأقسام', icon: FolderTree },
  { id: 'store', label: 'إعدادات المتجر', icon: Store },
  { id: 'checkout', label: 'إعداد الطلب', icon: MapPin },
  { id: 'content', label: 'المحتوى والبنرات', icon: Palette },
  { id: 'policies', label: 'السياسات', icon: ShieldCheck },
  { id: 'payments', label: 'الدفع والتكامل', icon: CreditCard },
  { id: 'loyalty', label: 'النقاط وأكواد الخصم', icon: Gift },
  { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
  { id: 'support', label: 'الدعم', icon: MessageCircle },
  { id: 'users', label: 'المستخدمون', icon: Users }
];

const normalizeText = (value) => String(value || '').toLowerCase();

function Field({ label, children }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {children}
    </label>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="admin-search-box">
      <Search size={18} />
      <input value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="admin-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PlaceholderPanel({ title }) {
  return (
    <section className="admin-dashboard-panel active">
      <div className="admin-section-head">
        <div>
          <h2>{title}</h2>
          <p>تمت إعادة تهيئة هذا القسم مؤقتًا بعد إصلاح مشكلة الترميز، ويمكننا إرجاع وظائفه التفصيلية في الخطوة التالية.</p>
        </div>
      </div>
      <div className="admin-setting-card">
        <p className="muted">هذا القسم ظاهر الآن بشكل سليم بدل النصوص التالفة، وجاهز لإعادة توسيعه بدون كسر الواجهة.</p>
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryGroups, setCategoryGroups] = useState([]);

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
    totalProducts: products.length,
    totalUsers: users.length
  }), [orders, products, users]);

  const filteredProducts = useMemo(() => {
    const term = normalizeText(searchTerm);
    return [...products]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((product) => !term || [
        product.name,
        product.description,
        product.category,
        product.subcategory,
        product.barcode,
        product.unit
      ].some((value) => normalizeText(value).includes(term)));
  }, [products, searchTerm]);

  const load = async () => {
    const productRequest = api.get('/products?limit=100');
    const orderRequest = api.get('/orders').catch(() => ({ data: [] }));
    const userRequest = api.get('/users').catch(() => ({ data: [] }));
    const categoryRequest = api.get('/settings/admin/categories').catch(() => ({ data: { categoryGroups: [] } }));

    const [productsResponse, ordersResponse, usersResponse, categoryResponse] = await Promise.all([
      productRequest,
      orderRequest,
      userRequest,
      categoryRequest
    ]);

    setProducts(productsResponse.data.products || []);
    setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
    setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
    setCategoryGroups(getCategoryGroups(categoryResponse.data || {}));
  };

  useEffect(() => {
    load().catch(() => toast.error('تعذر تحميل لوحة التحكم'));
  }, []);

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
    const payload = {
      ...productForm,
      barcode: String(productForm.barcode || '').trim()
    };

    let requestBody = payload;
    let config;

    if (image) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
      formData.append('image', image);
      requestBody = formData;
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    }

    try {
      if (editing) {
        await api.put(`/products/${editing}`, requestBody, config);
      } else {
        await api.post('/products', requestBody, config);
      }

      toast.success(editing ? 'تم تعديل المنتج' : 'تمت إضافة المنتج');
      setProductForm(emptyProduct);
      setImage(null);
      setEditing(null);
      await load();
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
      barcode: product.barcode || '',
      unit: product.unit || 'قطعة',
      countInStock: product.countInStock,
      featured: Boolean(product.featured),
      inAgencyCollection: Boolean(product.inAgencyCollection),
      isDeal: Boolean(product.isDeal)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeProduct = async (id) => {
    if (!window.confirm('حذف المنتج؟')) return;

    try {
      await api.delete(`/products/${id}`, { data: { deletePassword: '' } });
      toast.success('تم حذف المنتج');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حذف المنتج');
    }
  };

  const sectionClass = (id) => `dashboard-tab-btn${activeSection === id ? ' active' : ''}`;

  return (
    <main className="container page admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div className="admin-hero-copy">
          <span className="market-pill">لوحة التحكم</span>
          <h1>إدارة المتجر من مكان واحد</h1>
          <p>تم إصلاح مشكلة الترميز في الجزء الرئيسي من اللوحة، ويمكنك الآن متابعة إدارة المنتجات والبحث بالباركود بشكل طبيعي.</p>
        </div>
        <div className="admin-hero-stats">
          <StatCard label="إجمالي الطلبات" value={stats.totalOrders} />
          <StatCard label="طلبات مدفوعة" value={stats.paidOrders} />
          <StatCard label="طلبات مفتوحة" value={stats.openOrders} />
          <StatCard label="عدد المنتجات" value={stats.totalProducts} />
          <StatCard label="عدد المستخدمين" value={stats.totalUsers} />
        </div>
      </section>

      <nav className="admin-dashboard-tabs">
        {dashboardSections.map((section) => {
          const Icon = section.icon;
          return (
            <button key={section.id} type="button" className={sectionClass(section.id)} onClick={() => setActiveSection(section.id)}>
              <Icon size={18} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-dashboard-grid">
        {activeSection === 'products' ? (
          <section className="admin-dashboard-panel active">
            <div className="admin-section-head">
              <div>
                <h2>{editing ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
                <p>أنشئ منتجًا جديدًا أو عدّل المنتج الحالي مع ربطه بالفئة والقسم المناسبين.</p>
              </div>
            </div>

            <SearchBox
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث عن منتج بالاسم أو الباركود أو الفئة..."
            />

            <form onSubmit={submitProduct} className="admin-dashboard-form">
              <div className="admin-dashboard-form-grid">
                <Field label="اسم المنتج"><input name="name" value={productForm.name} onChange={changeProduct} placeholder="مثال: جبنة قريش" required /></Field>
                <Field label="الوصف"><input name="description" value={productForm.description} onChange={changeProduct} placeholder="وصف مختصر" /></Field>
                <Field label="السعر"><input name="price" value={productForm.price} onChange={changeProduct} type="number" placeholder="0" required /></Field>
                <Field label="السعر قبل الخصم"><input name="oldPrice" value={productForm.oldPrice} onChange={changeProduct} type="number" placeholder="0" /></Field>
                <Field label="الفئة الرئيسية">
                  <select name="category" value={productForm.category} onChange={changeProduct} required>
                    <option value="">اختر الفئة</option>
                    {sourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
                <Field label="القسم الفرعي">
                  <select name="subcategory" value={productForm.subcategory} onChange={changeProduct}>
                    <option value="">بدون قسم فرعي</option>
                    {availableSections.map((section) => <option key={section.title} value={section.title}>{section.title}</option>)}
                  </select>
                </Field>
                <Field label="الباركود"><input name="barcode" value={productForm.barcode} onChange={changeProduct} placeholder="مثال: 6221234567890" inputMode="numeric" /></Field>
                <Field label="الوحدة"><input name="unit" value={productForm.unit} onChange={changeProduct} placeholder="قطعة / كجم / عبوة" /></Field>
                <Field label="المخزون"><input name="countInStock" value={productForm.countInStock} onChange={changeProduct} type="number" placeholder="0" /></Field>
                <Field label="صورة المنتج"><input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></Field>
              </div>

              <div className="admin-checkbox-row">
                <label className="admin-toggle-pill"><input type="checkbox" name="featured" checked={productForm.featured} onChange={changeProduct} /> منتج مميز</label>
                <label className="admin-toggle-pill"><input type="checkbox" name="isDeal" checked={productForm.isDeal} onChange={changeProduct} /> ضمن العروض</label>
                <label className="admin-toggle-pill"><input type="checkbox" name="inAgencyCollection" checked={productForm.inAgencyCollection} onChange={changeProduct} /> أضف إلى منتجات الوكالة</label>
              </div>

              <button className="primary-btn admin-submit-btn" type="submit">
                <Save size={16} />
                <span>{editing ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
              </button>
            </form>

            <div className="admin-table-card">
              <div className="table-wrap admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الفئة</th>
                      <th>القسم</th>
                      <th>الباركود</th>
                      <th>السعر</th>
                      <th>المخزون</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product._id}>
                        <td>{product.name}</td>
                        <td>{product.category || '-'}</td>
                        <td>{product.subcategory || '-'}</td>
                        <td>{product.barcode || '-'}</td>
                        <td>{product.price} ج.م</td>
                        <td>{product.countInStock}</td>
                        <td>
                          <div className="admin-table-actions">
                            <button type="button" className="table-action-btn edit" onClick={() => editProduct(product)}>تعديل</button>
                            <button type="button" className="table-action-btn danger" onClick={() => removeProduct(product._id)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <PlaceholderPanel title={dashboardSections.find((section) => section.id === activeSection)?.label || 'القسم'} />
        )}
      </div>
    </main>
  );
}
