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
  Users,
  Wallet,
  Award,
  QrCode
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
  unit: 'قطعة',
  countInStock: '',
  featured: false,
  inAgencyCollection: false,
  isDeal: false
};

const emptyWalletForm = { amount: '', note: '' };
const emptyPointsForm = { amount: '', note: '' };
const emptyStorePurchaseForm = { amount: '', note: '' };
const emptyDiscountForm = {
  code: '',
  type: 'fixed',
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  usageLimit: '1',
  expiresAt: '',
  note: ''
};

const dashboardSections = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'customer-care', label: 'إرضاء العميل', icon: Gift },
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
const customerCareTypeLabel = (value) => ({
  wallet_credit: 'إضافة للمحفظة',
  points_credit: 'إضافة نقاط',
  discount_code: 'كود خصم خاص',
  store_purchase: 'شراء من المحل'
}[value] || value);

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
          <p>هذا القسم ظاهر الآن بشكل سليم، ويمكننا توسيعه لاحقًا بدون التأثير على الواجهة.</p>
        </div>
      </div>
      <div className="admin-setting-card">
        <p className="muted">القسم ما زال في نسخة مبسطة وآمنة بعد إصلاحات سابقة على اللوحة.</p>
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walletForm, setWalletForm] = useState(emptyWalletForm);
  const [pointsForm, setPointsForm] = useState(emptyPointsForm);
  const [storePurchaseForm, setStorePurchaseForm] = useState(emptyStorePurchaseForm);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);

  const canManageCustomers = user?.role === 'admin' || user?.permissions?.includes('manage_customers');
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
        product.unit
      ].some((value) => normalizeText(value).includes(term)));
  }, [products, searchTerm]);

  const selectedCustomer = useMemo(
    () => customerResults.find((entry) => entry._id === selectedCustomerId) || null,
    [customerResults, selectedCustomerId]
  );

  const loadDashboard = async () => {
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

  const loadCustomerCareUsers = async (query = '') => {
    if (!canManageCustomers) return;
    setCustomerLoading(true);

    try {
      const { data } = await api.get('/users/customer-care', {
        params: { q: query }
      });
      setCustomerResults(Array.isArray(data) ? data : []);
      setSelectedCustomerId((current) => {
        if (current && data.some((item) => item._id === current)) return current;
        return data[0]?._id || '';
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحميل عملاء قسم إرضاء العميل');
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => toast.error('تعذر تحميل لوحة التحكم'));
  }, []);

  useEffect(() => {
    if (activeSection !== 'customer-care' || !canManageCustomers) return undefined;
    const timer = window.setTimeout(() => {
      loadCustomerCareUsers(customerSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeSection, customerSearch, canManageCustomers]);

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
    const payload = { ...productForm };

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
      await loadDashboard();
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
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حذف المنتج');
    }
  };

  const applyCustomerAction = async (actionType, payload) => {
    if (!selectedCustomer) {
      toast.error('اختر عميلًا أولًا');
      return;
    }

    try {
      const { data } = await api.post(`/users/${selectedCustomer._id}/customer-care`, {
        actionType,
        ...payload
      });

      const updatedCustomer = data.user;
      setCustomerResults((current) => {
        const next = current.some((item) => item._id === updatedCustomer._id)
          ? current.map((item) => item._id === updatedCustomer._id ? updatedCustomer : item)
          : [updatedCustomer, ...current];
        return next;
      });
      setSelectedCustomerId(updatedCustomer._id);
      setWalletForm(emptyWalletForm);
      setPointsForm(emptyPointsForm);
      setStorePurchaseForm(emptyStorePurchaseForm);
      setDiscountForm(emptyDiscountForm);
      toast.success(data.message || 'تم تنفيذ العملية');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تنفيذ العملية');
    }
  };

  const sectionClass = (id) => `dashboard-tab-btn${activeSection === id ? ' active' : ''}`;

  if (!user) return null;

  return (
    <main className="container page admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div className="admin-hero-copy">
          <span className="market-pill">لوحة التحكم</span>
          <h1>إدارة المتجر من مكان واحد</h1>
          <p>لوحة تشغيل سريعة لإدارة المنتجات، ومتابعة العملاء، ومنح مزايا مخصصة مثل المحفظة والنقاط وأكواد الخصم الخاصة.</p>
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
              placeholder="ابحث عن منتج بالاسم أو الفئة..."
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
        ) : null}

        {activeSection === 'customer-care' ? (
          canManageCustomers ? (
            <section className="admin-dashboard-panel active">
              <div className="admin-section-head">
                <div>
                  <h2>قسم إرضاء العميل</h2>
                  <p>ابحث عن العميل عبر QR أو رقم الهاتف أو الاسم أو البريد، ثم أضف له مزايا خاصة أو سجّل شراء المحل ونقاطه.</p>
                </div>
              </div>

              <SearchBox
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="ابحث بالـ QR أو رقم الهاتف أو الاسم أو البريد الإلكتروني..."
              />

              <div className="customer-care-layout">
                <section className="customer-care-results">
                  {customerLoading ? <div className="admin-setting-card"><p className="muted">جارٍ تحميل العملاء...</p></div> : null}

                  {!customerLoading && !customerResults.length ? (
                    <div className="admin-setting-card">
                      <p className="muted">لا توجد نتائج مطابقة حاليًا.</p>
                    </div>
                  ) : null}

                  {customerResults.map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      className={`customer-care-user-card${selectedCustomerId === customer._id ? ' active' : ''}`}
                      onClick={() => setSelectedCustomerId(customer._id)}
                    >
                      <div className="customer-care-user-head">
                        <div className="customer-care-user-avatar">
                          {customer.avatar ? <img src={customer.avatar} alt={customer.name} /> : customer.name?.trim()?.slice(0, 2)?.toUpperCase()}
                        </div>
                        <div>
                          <strong>{customer.name}</strong>
                          <span>{customer.customerCode || 'بدون كود'}</span>
                        </div>
                      </div>
                      <p>{customer.email || 'بدون بريد إلكتروني'}</p>
                      <small>{customer.phone || 'بدون رقم هاتف'}</small>
                    </button>
                  ))}
                </section>

                <section className="customer-care-workspace">
                  {selectedCustomer ? (
                    <>
                      <div className="customer-care-summary">
                        <article className="customer-care-summary-card">
                          <div className="customer-care-summary-head">
                            <div className="customer-care-user-avatar large">
                              {selectedCustomer.avatar ? <img src={selectedCustomer.avatar} alt={selectedCustomer.name} /> : selectedCustomer.name?.trim()?.slice(0, 2)?.toUpperCase()}
                            </div>
                            <div>
                              <strong>{selectedCustomer.name}</strong>
                              <span>{selectedCustomer.email || 'بدون بريد'}</span>
                              <small>{selectedCustomer.phone || 'بدون هاتف'}</small>
                            </div>
                          </div>

                          <div className="customer-care-meta-grid">
                            <div><QrCode size={16} /><span>{selectedCustomer.customerCode || 'بدون QR'}</span></div>
                            <div><Wallet size={16} /><span>{Number(selectedCustomer.walletBalance || 0)} ج.م</span></div>
                            <div><Award size={16} /><span>{Number(selectedCustomer.loyaltyPoints || 0)} نقطة</span></div>
                            <div><Store size={16} /><span>{Number(selectedCustomer.inStoreSpentTotal || 0)} ج.م مشتريات محل</span></div>
                          </div>
                        </article>

                        <article className="customer-care-summary-card">
                          <div className="section-head compact customer-care-inline-head">
                            <div>
                              <h3>الأكواد الخاصة النشطة</h3>
                              <span>مرتبطة بحساب العميل</span>
                            </div>
                          </div>
                          <div className="customer-care-discounts">
                            {selectedCustomer.privateDiscountCodes?.length ? selectedCustomer.privateDiscountCodes.map((code) => (
                              <div key={code._id || code.code} className="customer-care-discount-chip">
                                <strong>{code.code}</strong>
                                <span>{code.type === 'percent' ? `${Number(code.value || 0)}% خصم` : `${Number(code.value || 0)} ج.م خصم`}</span>
                              </div>
                            )) : <p className="muted">لا توجد أكواد خصم خاصة مفعلة.</p>}
                          </div>
                        </article>
                      </div>

                      <div className="customer-care-actions-grid">
                        <form
                          className="admin-setting-card customer-care-action-card"
                          onSubmit={(event) => {
                            event.preventDefault();
                            applyCustomerAction('wallet_credit', walletForm);
                          }}
                        >
                          <div className="customer-care-card-head">
                            <Wallet size={18} />
                            <strong>إضافة رصيد للمحفظة</strong>
                          </div>
                          <Field label="المبلغ"><input type="number" value={walletForm.amount} onChange={(event) => setWalletForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" /></Field>
                          <Field label="ملاحظة"><input value={walletForm.note} onChange={(event) => setWalletForm((current) => ({ ...current, note: event.target.value }))} placeholder="مثال: تعويض أو هدية" /></Field>
                          <button type="submit" className="primary-btn admin-inline-save-btn"><Save size={16} /><span>إضافة للمحفظة</span></button>
                        </form>

                        <form
                          className="admin-setting-card customer-care-action-card"
                          onSubmit={(event) => {
                            event.preventDefault();
                            applyCustomerAction('points_credit', { amount: pointsForm.amount, note: pointsForm.note });
                          }}
                        >
                          <div className="customer-care-card-head">
                            <Award size={18} />
                            <strong>إضافة نقاط ولاء</strong>
                          </div>
                          <Field label="عدد النقاط"><input type="number" value={pointsForm.amount} onChange={(event) => setPointsForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" /></Field>
                          <Field label="ملاحظة"><input value={pointsForm.note} onChange={(event) => setPointsForm((current) => ({ ...current, note: event.target.value }))} placeholder="مثال: رضا عميل أو ترقية" /></Field>
                          <button type="submit" className="primary-btn admin-inline-save-btn"><Save size={16} /><span>إضافة النقاط</span></button>
                        </form>

                        <form
                          className="admin-setting-card customer-care-action-card wide"
                          onSubmit={(event) => {
                            event.preventDefault();
                            applyCustomerAction('discount_code', discountForm);
                          }}
                        >
                          <div className="customer-care-card-head">
                            <Gift size={18} />
                            <strong>إنشاء كود خصم خاص</strong>
                          </div>
                          <div className="admin-dashboard-form-grid two-cols">
                            <Field label="الكود الخاص"><input value={discountForm.code} onChange={(event) => setDiscountForm((current) => ({ ...current, code: event.target.value }))} placeholder="اتركه فارغًا للتوليد التلقائي" /></Field>
                            <Field label="نوع الخصم">
                              <select value={discountForm.type} onChange={(event) => setDiscountForm((current) => ({ ...current, type: event.target.value }))}>
                                <option value="fixed">مبلغ ثابت</option>
                                <option value="percent">نسبة مئوية</option>
                              </select>
                            </Field>
                            <Field label="قيمة الخصم"><input type="number" value={discountForm.value} onChange={(event) => setDiscountForm((current) => ({ ...current, value: event.target.value }))} placeholder="0" /></Field>
                            <Field label="الحد الأدنى للطلب"><input type="number" value={discountForm.minOrderAmount} onChange={(event) => setDiscountForm((current) => ({ ...current, minOrderAmount: event.target.value }))} placeholder="0" /></Field>
                            <Field label="الحد الأقصى للخصم"><input type="number" value={discountForm.maxDiscount} onChange={(event) => setDiscountForm((current) => ({ ...current, maxDiscount: event.target.value }))} placeholder="0" /></Field>
                            <Field label="عدد مرات الاستخدام"><input type="number" value={discountForm.usageLimit} onChange={(event) => setDiscountForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="1" /></Field>
                            <Field label="تاريخ الانتهاء"><input type="date" value={discountForm.expiresAt} onChange={(event) => setDiscountForm((current) => ({ ...current, expiresAt: event.target.value }))} /></Field>
                            <Field label="ملاحظة"><input value={discountForm.note} onChange={(event) => setDiscountForm((current) => ({ ...current, note: event.target.value }))} placeholder="مثال: عميل VIP" /></Field>
                          </div>
                          <button type="submit" className="primary-btn admin-inline-save-btn"><Save size={16} /><span>حفظ كود الخصم</span></button>
                        </form>

                        <form
                          className="admin-setting-card customer-care-action-card"
                          onSubmit={(event) => {
                            event.preventDefault();
                            applyCustomerAction('store_purchase', storePurchaseForm);
                          }}
                        >
                          <div className="customer-care-card-head">
                            <Store size={18} />
                            <strong>تسجيل شراء من المحل</strong>
                          </div>
                          <Field label="مبلغ الشراء"><input type="number" value={storePurchaseForm.amount} onChange={(event) => setStorePurchaseForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" /></Field>
                          <Field label="ملاحظة"><input value={storePurchaseForm.note} onChange={(event) => setStorePurchaseForm((current) => ({ ...current, note: event.target.value }))} placeholder="مثال: فاتورة من الفرع" /></Field>
                          <p className="muted">سيتم إضافة نفس قيمة المبلغ كنقاط ولاء تقريبًا بعد التقريب لرقم صحيح.</p>
                          <button type="submit" className="primary-btn admin-inline-save-btn"><Save size={16} /><span>تسجيل الشراء</span></button>
                        </form>
                      </div>

                      <article className="admin-setting-card">
                        <div className="section-head compact customer-care-inline-head">
                          <div>
                            <h3>آخر عمليات إرضاء العميل</h3>
                            <span>سجل مختصر لآخر الإجراءات</span>
                          </div>
                        </div>
                        <div className="customer-care-history">
                          {selectedCustomer.customerCareHistory?.length ? selectedCustomer.customerCareHistory.map((entry) => (
                            <div key={entry._id} className="customer-care-history-item">
                              <strong>{customerCareTypeLabel(entry.type)}</strong>
                              <span>{entry.code || (entry.amount ? `${entry.amount} ج.م` : entry.points ? `${entry.points} نقطة` : '-')}</span>
                              <p>{entry.note || 'بدون ملاحظة'}</p>
                            </div>
                          )) : <p className="muted">لا توجد عمليات مسجلة لهذا العميل حتى الآن.</p>}
                        </div>
                      </article>
                    </>
                  ) : (
                    <div className="admin-setting-card">
                      <p className="muted">اختر عميلًا من القائمة لعرض بياناته ومنحه مزايا خاصة.</p>
                    </div>
                  )}
                </section>
              </div>
            </section>
          ) : (
            <section className="admin-dashboard-panel active">
              <div className="admin-setting-card">
                <p className="muted">ليس لديك صلاحية الوصول إلى قسم إرضاء العميل.</p>
              </div>
            </section>
          )
        ) : null}

        {!['products', 'customer-care'].includes(activeSection) ? (
          <PlaceholderPanel title={dashboardSections.find((section) => section.id === activeSection)?.label || 'القسم'} />
        ) : null}
      </div>
    </main>
  );
}
