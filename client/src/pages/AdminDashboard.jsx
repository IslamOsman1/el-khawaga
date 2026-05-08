import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CreditCard,
  FileText,
  FolderTree,
  Gift,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Printer,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Undo2,
  Users,
  Wallet,
  Award,
  QrCode,
  X
} from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
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
  facebookUrl: '',
  instagramUrl: '',
  about: {
    title: '',
    description: '',
    vision: '',
    mission: '',
    values: ''
  },
  policies: {
    privacy: { title: 'سياسة الخصوصية', description: '', sections: [{ title: '', body: '' }] },
    terms: { title: 'الشروط والأحكام', description: '', sections: [{ title: '', body: '' }] },
    shipping: { title: 'سياسة الشحن والتوصيل', description: '', sections: [{ title: '', body: '' }] },
    refund: { title: 'سياسة الاسترجاع والاستبدال', description: '', sections: [{ title: '', body: '' }] }
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
    freeShippingThreshold: 500,
    notesEnabled: true,
    notesRequired: false,
    governorates: [
      { name: '', shippingFee: 35, cities: [''] }
    ]
  },
  payment: {
    cashOnDeliveryEnabled: true,
    onlinePaymentEnabled: false,
    onlineProvider: 'stripe',
    currency: 'egp',
    stripePublishableKey: '',
    stripeSecretKey: ''
  },
  loyalty: {
    enabled: true,
    pointsPerPoint: 10,
    pointValue: 0.1,
    minRedeemPoints: 50,
    discountCodes: [
      {
        code: '',
        type: 'fixed',
        value: '',
        minOrderAmount: '',
        maxDiscount: '',
        usageLimit: '',
        usedCount: 0,
        active: true,
        expiresAt: ''
      }
    ]
  },
  adminControls: {
    deleteConfirmationEnabled: false,
    deletePassword: '',
    hasDeletePassword: false
  }
};

const dashboardSections = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'customer-care', label: 'إرضاء العميل', icon: Gift },
  { id: 'store-purchases', label: 'تسجيل الشراء من المحل', icon: Store },
  { id: 'accounts', label: 'الحسابات', icon: Wallet },
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

const permissionOptions = [
  { key: 'manage_products', label: 'إدارة المنتجات' },
  { key: 'manage_orders', label: 'إدارة الطلبات' },
  { key: 'manage_support', label: 'إدارة الدعم' },
  { key: 'manage_store_purchases', label: 'تسجيل الشراء من المحل' },
  { key: 'manage_loyalty', label: 'النقاط وأكواد الخصم' },
  { key: 'manage_customer_care', label: 'إرضاء العميل' }
];

const policyDefinitions = [
  { key: 'privacy', label: 'سياسة الخصوصية', icon: ShieldCheck },
  { key: 'terms', label: 'الشروط والأحكام', icon: FileText },
  { key: 'shipping', label: 'سياسة الشحن والتوصيل', icon: Truck },
  { key: 'refund', label: 'سياسة الاسترجاع والاستبدال', icon: Undo2 }
];

const orderStatuses = ['جديد', 'قيد التجهيز', 'في الطريق', 'تم التسليم', 'ملغي'];

const normalizeText = (value) => String(value || '').toLowerCase();
const generateProductBarcode = () => `PRD-${Date.now().toString(36).toUpperCase()}`;
const startOfDay = (value = new Date()) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const shiftDays = (value, days) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};
const isOnOrAfter = (value, start) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time >= start.getTime();
};
const customerCareTypeLabel = (value) => ({
  wallet_credit: 'إضافة للمحفظة',
  points_credit: 'إضافة نقاط',
  discount_code: 'كود خصم خاص',
  store_purchase: 'شراء من المحل'
}[value] || value);

const normalizeSettings = (data) => ({
  ...defaultSettingsForm,
  ...data,
  about: {
    ...defaultSettingsForm.about,
    ...(data.about || {})
  },
  policies: {
    privacy: {
      ...defaultSettingsForm.policies.privacy,
      ...(data.policies?.privacy || {}),
      sections: data.policies?.privacy?.sections?.length ? data.policies.privacy.sections : defaultSettingsForm.policies.privacy.sections
    },
    terms: {
      ...defaultSettingsForm.policies.terms,
      ...(data.policies?.terms || {}),
      sections: data.policies?.terms?.sections?.length ? data.policies.terms.sections : defaultSettingsForm.policies.terms.sections
    },
    shipping: {
      ...defaultSettingsForm.policies.shipping,
      ...(data.policies?.shipping || {}),
      sections: data.policies?.shipping?.sections?.length ? data.policies.shipping.sections : defaultSettingsForm.policies.shipping.sections
    },
    refund: {
      ...defaultSettingsForm.policies.refund,
      ...(data.policies?.refund || {}),
      sections: data.policies?.refund?.sections?.length ? data.policies.refund.sections : defaultSettingsForm.policies.refund.sections
    }
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
  },
  loyalty: {
    ...defaultSettingsForm.loyalty,
    ...(data.loyalty || {}),
    discountCodes: data.loyalty?.discountCodes?.length
      ? data.loyalty.discountCodes.map((item) => ({
        ...item,
        expiresAt: item.expiresAt ? String(item.expiresAt).slice(0, 10) : ''
      }))
      : defaultSettingsForm.loyalty.discountCodes
  },
  adminControls: {
    ...defaultSettingsForm.adminControls,
    ...(data.adminControls || {}),
    deletePassword: ''
  }
});

function Field({ label, children }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {children}
    </label>
  );
}

function SearchBox({ value, onChange, placeholder, onCameraClick }) {
  return (
    <label className="admin-search-box">
      {onCameraClick ? (
        <button type="button" className="admin-search-camera" onClick={onCameraClick} aria-label="قراءة QR بالكاميرا">
          <Camera size={18} />
        </button>
      ) : null}
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

function SaveSectionButton({ saving, label }) {
  return (
    <button className="primary-btn admin-inline-save-btn" type="submit" disabled={saving}>
      <Save size={16} />
      <span>{saving ? 'جارٍ الحفظ...' : label}</span>
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportConversations, setSupportConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productQrImage, setProductQrImage] = useState('');
  const [productQrPreview, setProductQrPreview] = useState({ open: false, product: null, image: '' });
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState(null);
  const [uploadingFeaturedCategoryIndex, setUploadingFeaturedCategoryIndex] = useState(null);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState({});
  const [activeSection, setActiveSection] = useState('products');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walletForm, setWalletForm] = useState(emptyWalletForm);
  const [pointsForm, setPointsForm] = useState(emptyPointsForm);
  const [storePurchaseForm, setStorePurchaseForm] = useState(emptyStorePurchaseForm);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScannerStarting, setQrScannerStarting] = useState(false);
  const [qrScannerStatus, setQrScannerStatus] = useState('');
  const [searchTerms, setSearchTerms] = useState({
    products: '',
    accounts: '',
    categories: '',
    store: '',
    content: '',
    policies: '',
    checkout: '',
    payments: '',
    loyalty: '',
    orders: '',
    support: '',
    users: ''
  });

  const { user } = useAuth();
  const { refresh } = useStoreSettings();
  const isEmployee = user?.role === 'employee';
  const canManageSupport = user?.role === 'admin' || user?.permissions?.includes('manage_support');
  const canManageCustomerCare = user?.role === 'admin' || user?.permissions?.includes('manage_customers') || user?.permissions?.includes('manage_customer_care');
  const canManageStorePurchases = user?.role === 'admin' || user?.permissions?.includes('manage_customers') || user?.permissions?.includes('manage_store_purchases');
  const canManageLoyalty = user?.role === 'admin' || user?.permissions?.includes('manage_loyalty');
  const canSearchCustomerAccounts = canManageCustomerCare || canManageStorePurchases;
  const qrVideoRef = React.useRef(null);
  const qrReaderRef = React.useRef(null);
  const qrControlsRef = React.useRef(null);

  const visibleDashboardSections = useMemo(
    () => isEmployee
      ? dashboardSections.filter((section) =>
        (section.id === 'products' && user?.permissions?.includes('manage_products')) ||
        (section.id === 'customer-care' && (user?.permissions?.includes('manage_customers') || user?.permissions?.includes('manage_customer_care'))) ||
        (section.id === 'store-purchases' && (user?.permissions?.includes('manage_customers') || user?.permissions?.includes('manage_store_purchases'))) ||
        (section.id === 'categories' && user?.permissions?.includes('manage_products')) ||
        (section.id === 'loyalty' && user?.permissions?.includes('manage_loyalty')) ||
        (section.id === 'orders' && user?.permissions?.includes('manage_orders')) ||
        (section.id === 'support' && user?.permissions?.includes('manage_support'))
      )
      : dashboardSections,
    [isEmployee, user?.permissions]
  );

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
    totalProducts: products.length,
    totalUsers: users.length
  }), [orders, products, users]);

  const accountingData = useMemo(() => {
    const todayStart = startOfDay();
    const weeklyStart = shiftDays(todayStart, -6);
    const monthlyStart = shiftDays(todayStart, -29);

    const customerTransactions = users.flatMap((member) => (
      Array.isArray(member.customerCareHistory)
        ? member.customerCareHistory.map((entry, index) => ({
          id: `${member._id}-care-${entry._id || index}`,
          kind: entry.type || 'customer-care',
          label: customerCareTypeLabel(entry.type),
          customerName: member.name || '-',
          customerCode: member.customerCode || '',
          amount: Number(entry.amount || 0),
          points: Number(entry.points || entry.amount || 0),
          note: entry.note || '',
          code: entry.code || '',
          paymentLabel: '',
          statusLabel: '',
          createdAt: entry.createdAt || member.createdAt,
          searchable: [
            member.name,
            member.email,
            member.phone,
            member.customerCode,
            entry.type,
            entry.note,
            entry.code,
            entry.amount,
            entry.points
          ].join(' ')
        }))
        : []
    ));

    const orderTransactions = orders.flatMap((order) => {
      const baseEntry = {
        id: `order-${order._id}`,
        kind: 'order',
        label: 'طلب موقع',
        customerName: order.user?.name || '-',
        customerCode: order.user?.customerCode || '',
        amount: Number(order.totalPrice || 0),
        points: Number(order.loyaltyPointsUsed || 0),
        note: order.discountCode ? `كود خصم: ${order.discountCode}` : '',
        code: order.discountCode || '',
        paymentLabel: order.isPaid ? 'مدفوع' : (order.paymentMethod || ''),
        statusLabel: order.status || '',
        createdAt: order.createdAt,
        searchable: [
          order.user?.name,
          order.user?.email,
          order.user?.phone,
          order.paymentMethod,
          order.status,
          order.totalPrice,
          order.discountCode
        ].join(' ')
      };

      const refundEntry = order.refundedToWallet && Number(order.refundedAmount || 0) > 0
        ? {
          id: `refund-${order._id}`,
          kind: 'refund',
          label: 'استرجاع للمحفظة',
          customerName: order.user?.name || '-',
          customerCode: order.user?.customerCode || '',
          amount: Number(order.refundedAmount || 0),
          points: 0,
          note: 'استرجاع مبلغ طلب ملغي',
          code: '',
          paymentLabel: 'محفظة',
          statusLabel: 'مرتجع',
          createdAt: order.refundedAt || order.updatedAt || order.createdAt,
          searchable: [
            order.user?.name,
            order.paymentMethod,
            order.status,
            order.refundedAmount,
            'refund'
          ].join(' ')
        }
        : null;

      return refundEntry ? [baseEntry, refundEntry] : [baseEntry];
    });

    const transactions = [...orderTransactions, ...customerTransactions]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const buildSummary = (start) => {
      const ordersInRange = orders.filter((order) => isOnOrAfter(order.createdAt, start));
      const validOrders = ordersInRange.filter((order) => order.status !== 'ملغي');
      const careInRange = customerTransactions.filter((entry) => isOnOrAfter(entry.createdAt, start));
      const refundsInRange = transactions.filter((entry) => entry.kind === 'refund' && isOnOrAfter(entry.createdAt, start));

      return {
        ordersRevenue: validOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
        onlineRevenue: validOrders
          .filter((order) => order.paymentMethod === 'دفع أونلاين')
          .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
        storePurchases: careInRange
          .filter((entry) => entry.kind === 'store_purchase')
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        walletCredits: careInRange
          .filter((entry) => entry.kind === 'wallet_credit')
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        pointsCredits: careInRange
          .filter((entry) => entry.kind === 'points_credit')
          .reduce((sum, entry) => sum + Number(entry.points || 0), 0),
        discountsIssued: careInRange.filter((entry) => entry.kind === 'discount_code').length,
        refundsAmount: refundsInRange.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        ordersCount: validOrders.length,
        transactionsCount: transactions.filter((entry) => isOnOrAfter(entry.createdAt, start)).length
      };
    };

    return {
      summaries: [
        { key: 'daily', label: 'يومي', note: 'من بداية اليوم', values: buildSummary(todayStart) },
        { key: 'weekly', label: 'أسبوعي', note: 'آخر 7 أيام', values: buildSummary(weeklyStart) },
        { key: 'monthly', label: 'شهري', note: 'آخر 30 يومًا', values: buildSummary(monthlyStart) }
      ],
      transactions
    };
  }, [orders, users]);

  const filteredAccountingTransactions = useMemo(() => {
    const term = normalizeText(searchTerms.accounts);
    return accountingData.transactions.filter((entry) => !term || normalizeText(entry.searchable).includes(term));
  }, [accountingData.transactions, searchTerms.accounts]);

  const filteredProducts = useMemo(() => {
    const term = normalizeText(searchTerms.products);
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

  const filteredPolicies = useMemo(() => {
    const term = normalizeText(searchTerms.policies);
    return policyDefinitions.filter(({ key, label }) => {
      const policy = settingsForm.policies?.[key];
      return !term || [
        label,
        policy?.title,
        policy?.description,
        ...(policy?.sections || []).flatMap((section) => [section.title, section.body])
      ].some((value) => normalizeText(value).includes(term));
    });
  }, [searchTerms.policies, settingsForm.policies]);

  const filteredCheckoutGovernorates = useMemo(() => {
    const term = normalizeText(searchTerms.checkout);
    return (settingsForm.checkout.governorates || [])
      .map((governorate, index) => ({ governorate, index }))
      .filter(({ governorate }) => !term || [
        governorate.name,
        ...(governorate.cities || [])
      ].some((value) => normalizeText(value).includes(term)));
  }, [settingsForm.checkout.governorates, searchTerms.checkout]);

  const filteredDiscountCodes = useMemo(() => {
    const term = normalizeText(searchTerms.loyalty);
    return (settingsForm.loyalty?.discountCodes || [])
      .map((code, index) => ({ code, index }))
      .filter(({ code }) => !term || [
        code.code,
        code.type,
        code.value,
        code.minOrderAmount,
        code.maxDiscount,
        code.usageLimit
      ].some((value) => normalizeText(value).includes(term)));
  }, [searchTerms.loyalty, settingsForm.loyalty?.discountCodes]);

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

  const filteredUsers = useMemo(() => {
    const term = normalizeText(searchTerms.users);
    return [...users]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((member) => !term || [
        member.name,
        member.email,
        member.phone,
        member.role,
        member.walletBalance,
        member.loyaltyPoints,
        member.hasManualPassword ? 'manual' : 'google'
      ].some((value) => normalizeText(value).includes(term)));
  }, [users, searchTerms.users]);

  const filteredSupportConversations = useMemo(() => {
    const term = normalizeText(searchTerms.support);
    return [...supportConversations]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .filter((conversation) => !term || [
        conversation.customer?.name,
        conversation.customer?.email,
        conversation.assignedEmployee?.name,
        conversation.status,
        conversation.messages?.[conversation.messages.length - 1]?.text
      ].some((value) => normalizeText(value).includes(term)));
  }, [supportConversations, searchTerms.support]);

  useEffect(() => {
    const qrValue = String(productForm.barcode || '').trim();
    if (!qrValue) {
      setProductQrImage('');
      return;
    }

    QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 220,
      color: {
        dark: '#111111',
        light: '#FFF7EA'
      }
    })
      .then(setProductQrImage)
      .catch(() => setProductQrImage(''));
  }, [productForm.barcode]);

  const totalSupportUnread = useMemo(
    () => supportConversations.reduce((sum, conversation) => sum + Number(conversation.supportUnreadCount || 0), 0),
    [supportConversations]
  );

  const selectedCustomer = useMemo(
    () => customerResults.find((entry) => entry._id === selectedCustomerId) || null,
    [customerResults, selectedCustomerId]
  );

  const load = async () => {
    const [productsResponse, ordersResponse] = await Promise.all([
      api.get('/products?limit=100'),
      api.get('/orders')
    ]);

    setProducts(productsResponse.data.products || []);
    setOrders(ordersResponse.data || []);

    if (isEmployee) {
      const employeeSettings = JSON.parse(JSON.stringify(defaultSettingsForm));
      setUsers([]);
      if (user?.permissions?.includes('manage_products')) {
        const { data: categorySettings } = await api.get('/settings/admin/categories');
        employeeSettings.categoryGroups = categorySettings?.categoryGroups?.length
          ? categorySettings.categoryGroups
          : defaultCategoryGroups;
      }
      if (user?.permissions?.includes('manage_loyalty')) {
        const { data: loyaltySettings } = await api.get('/settings/admin/loyalty');
        employeeSettings.loyalty = {
          ...employeeSettings.loyalty,
          ...(loyaltySettings?.loyalty || {})
        };
      }
      setSettingsForm(employeeSettings);
      if (canManageSupport) {
        const { data: supportData } = await api.get('/support/inbox');
        setSupportConversations(supportData || []);
      } else {
        setSupportConversations([]);
      }
      return;
    }

    const requests = [
      api.get('/settings/admin'),
      api.get('/users')
    ];

    if (canManageSupport) {
      requests.push(api.get('/support/inbox'));
    }

    const [settingsResponse, usersResponse, supportResponse] = await Promise.all(requests);

    setSettingsForm(normalizeSettings(settingsResponse.data));
    setUsers(usersResponse.data || []);
    setSupportConversations(supportResponse?.data || []);
  };

  useEffect(() => {
    load().catch(() => toast.error('تعذر تحميل لوحة التحكم'));
  }, [isEmployee, canManageSupport]);

  useEffect(() => () => {
    qrControlsRef.current?.stop?.();
    qrReaderRef.current?.reset?.();
  }, []);

  const loadSupportInbox = async () => {
    if (!canManageSupport) return;
    const { data } = await api.get('/support/inbox');
    setSupportConversations(data || []);
  };

  const loadCustomerCareUsers = async (query = '') => {
    if (!canSearchCustomerAccounts) return;
    if (!query.trim()) {
      setCustomerResults([]);
      setSelectedCustomerId('');
      setCustomerLoading(false);
      return;
    }

    setCustomerLoading(true);

    try {
      const { data } = await api.get('/users/customer-care', {
        params: { q: query }
      });
      const nextResults = Array.isArray(data) ? data : [];
      setCustomerResults(nextResults);
      setSelectedCustomerId((current) => {
        if (current && nextResults.some((item) => item._id === current)) return current;
        return nextResults[0]?._id || '';
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحميل عملاء قسم إرضاء العميل');
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection !== 'support' || !canManageSupport) return undefined;
    loadSupportInbox().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadSupportInbox().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [activeSection, canManageSupport]);

  useEffect(() => {
    if (!['customer-care', 'store-purchases'].includes(activeSection) || !canSearchCustomerAccounts) return undefined;
    const timer = window.setTimeout(() => {
      loadCustomerCareUsers(customerSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeSection, customerSearch, canSearchCustomerAccounts]);

  useEffect(() => {
    if (!visibleDashboardSections.some((section) => section.id === activeSection)) {
      setActiveSection(visibleDashboardSections[0]?.id || 'products');
    }
  }, [activeSection, visibleDashboardSections]);

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

  const ensureProductBarcode = () => {
    setProductForm((current) => {
      if (String(current.barcode || '').trim()) return current;
      return { ...current, barcode: generateProductBarcode() };
    });
  };

  const buildQrImage = async (value) => {
    const code = String(value || '').trim();
    if (!code) return '';
    return QRCode.toDataURL(code, {
      margin: 1,
      width: 280,
      color: {
        dark: '#111111',
        light: '#FFF7EA'
      }
    });
  };

  const openProductQrPreview = async (product) => {
    const barcode = String(product?.barcode || '').trim();
    if (!barcode) {
      toast.error('هذا المنتج لا يحتوي على QR بعد');
      return;
    }

    try {
      const image = await buildQrImage(barcode);
      setProductQrPreview({ open: true, product, image });
    } catch {
      toast.error('تعذر تجهيز QR للعرض');
    }
  };

  const closeProductQrPreview = () => {
    setProductQrPreview({ open: false, product: null, image: '' });
  };

  const printProductQr = async (product) => {
    const barcode = String(product?.barcode || '').trim();
    if (!barcode) {
      toast.error('هذا المنتج لا يحتوي على QR للطباعة');
      return;
    }

    try {
      const image = productQrPreview.product?._id === product._id && productQrPreview.image
        ? productQrPreview.image
        : await buildQrImage(barcode);
      const printWindow = window.open('', '_blank', 'width=520,height=720');
      if (!printWindow) {
        toast.error('المتصفح منع نافذة الطباعة');
        return;
      }

      printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>طباعة QR - ${product.name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;margin:0;color:#111;text-align:center}
      .sheet{max-width:360px;margin:0 auto;border:1px solid #ddd;border-radius:18px;padding:24px}
      img{width:240px;height:240px;display:block;margin:0 auto 18px}
      h1{font-size:24px;margin:0 0 10px}
      p{margin:6px 0;font-size:16px}
      .code{font-weight:700;letter-spacing:.08em}
    </style>
  </head>
  <body>
    <div class="sheet">
      <img src="${image}" alt="QR ${barcode}" />
      <h1>${product.name}</h1>
      <p>${product.category || ''}${product.subcategory ? ` - ${product.subcategory}` : ''}</p>
      <p class="code">${barcode}</p>
    </div>
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`);
      printWindow.document.close();
    } catch {
      toast.error('تعذر تجهيز QR للطباعة');
    }
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
      setProductQrImage('');
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
      barcode: product.barcode || '',
      unit: product.unit,
      countInStock: product.countInStock,
      featured: product.featured,
      inAgencyCollection: product.inAgencyCollection,
      isDeal: product.isDeal
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeProduct = async (id) => {
    if (!window.confirm('حذف المنتج؟')) return;
    const deletePassword = await requestDeletePassword();
    if (deletePassword === null) return;
    await api.delete(`/products/${id}`, { data: { deletePassword } });
    toast.success('تم حذف المنتج');
    load();
  };

  const changeStatus = async (id, status) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  const changeUserRole = async (member, role) => {
    if (member.role === role) return;

    const roleLabel = role === 'admin' ? 'مدير' : role === 'employee' ? 'موظف' : 'عميل';
    const confirmed = window.confirm(`هل أنت متأكد من تغيير نوع حساب ${member.name || member.email} إلى ${roleLabel}؟`);
    if (!confirmed) return;

    try {
      const nextPermissions = role === 'employee' ? (member.permissions?.length ? member.permissions : ['manage_orders']) : [];
      await api.put(`/users/${member._id}/role`, { role, permissions: nextPermissions });
      toast.success('تم تحديث نوع الحساب');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث نوع الحساب');
    }
  };

  const toggleUserPermission = async (targetUser, permission) => {
    const currentPermissions = Array.isArray(targetUser.permissions) ? targetUser.permissions : [];
    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];

    const permissionLabel = permissionOptions.find((item) => item.key === permission)?.label || permission;
    const confirmed = window.confirm(`هل أنت متأكد من ${currentPermissions.includes(permission) ? 'إزالة' : 'منح'} صلاحية ${permissionLabel} للمستخدم ${targetUser.name || targetUser.email}؟`);
    if (!confirmed) return;

    try {
      await api.put(`/users/${targetUser._id}/role`, {
        role: targetUser.role,
        permissions: nextPermissions
      });
      toast.success('تم تحديث الصلاحيات');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث الصلاحيات');
    }
  };

  const sendSupportReply = async (conversationId) => {
    const text = String(supportReplyDrafts[conversationId] || '').trim();
    if (!text) return;

    try {
      await api.post(`/support/${conversationId}/reply`, { text });
      toast.success('تم إرسال الرد');
      setSupportReplyDrafts((current) => ({ ...current, [conversationId]: '' }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إرسال الرد');
    }
  };

  const markSupportAsRead = async (conversationId) => {
    try {
      await api.put(`/support/${conversationId}/read`);
      setSupportConversations((current) => current.map((conversation) =>
        conversation._id === conversationId
          ? { ...conversation, supportUnreadCount: 0 }
          : conversation
      ));
      toast.success('تم تحديث حالة القراءة');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث حالة القراءة');
    }
  };

  const toggleSupportConversationStatus = async (conversation) => {
    const nextStatus = conversation.status === 'closed' ? 'open' : 'closed';

    try {
      const { data } = await api.put(`/support/${conversation._id}/status`, { status: nextStatus });
      setSupportConversations((current) => current.map((item) => item._id === conversation._id ? data : item));
      toast.success(nextStatus === 'closed' ? 'تم إغلاق المحادثة' : 'تمت إعادة فتح المحادثة');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث حالة المحادثة');
    }
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
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => ({
        ...current,
        categoryGroups: current.categoryGroups.filter((_, index) => index !== groupIndex)
      }));
    });
  };

  const addSectionToGroup = (groupIndex) => {
    setSettingsForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      next.categoryGroups[groupIndex].sections.unshift({ title: '', sourceCategory: '' });
      return next;
    });
  };

  const removeSectionFromGroup = (groupIndex, sectionIndex) => {
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => {
        const next = JSON.parse(JSON.stringify(current));
        next.categoryGroups[groupIndex].sections = next.categoryGroups[groupIndex].sections.filter((_, index) => index !== sectionIndex);
        return next;
      });
    });
  };

  const addGovernorate = () => {
    setSettingsForm((current) => ({
      ...current,
      checkout: {
        ...current.checkout,
        governorates: [{ name: '', shippingFee: 35, cities: [''] }, ...(current.checkout.governorates || [])]
      }
    }));
  };

  const removeGovernorate = (governorateIndex) => {
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => ({
        ...current,
        checkout: {
          ...current.checkout,
          governorates: (current.checkout.governorates || []).filter((_, index) => index !== governorateIndex)
        }
      }));
    });
  };

  const addCityToGovernorate = (governorateIndex) => {
    setSettingsForm((current) => {
      const next = JSON.parse(JSON.stringify(current));
      next.checkout.governorates[governorateIndex].cities.unshift('');
      return next;
    });
  };

  const removeCityFromGovernorate = (governorateIndex, cityIndex) => {
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => {
        const next = JSON.parse(JSON.stringify(current));
        next.checkout.governorates[governorateIndex].cities = next.checkout.governorates[governorateIndex].cities
          .filter((_, index) => index !== cityIndex);
        if (!next.checkout.governorates[governorateIndex].cities.length) {
          next.checkout.governorates[governorateIndex].cities = [''];
        }
        return next;
      });
    });
  };

  const addDiscountCode = () => {
    setSettingsForm((current) => ({
      ...current,
      loyalty: {
        ...current.loyalty,
        discountCodes: [
          {
            code: '',
            type: 'fixed',
            value: '',
            minOrderAmount: '',
            maxDiscount: '',
            usageLimit: '',
            usedCount: 0,
            active: true,
            expiresAt: ''
          },
          ...(current.loyalty?.discountCodes || [])
        ]
      }
    }));
  };

  const removeDiscountCode = (discountIndex) => {
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => ({
        ...current,
        loyalty: {
          ...current.loyalty,
          discountCodes: (current.loyalty?.discountCodes || []).filter((_, index) => index !== discountIndex)
        }
      }));
    });
  };

  const addPolicySection = (policyKey) => {
    setSettingsForm((current) => ({
      ...current,
      policies: {
        ...current.policies,
        [policyKey]: {
          ...current.policies[policyKey],
          sections: [{ title: '', body: '' }, ...(current.policies?.[policyKey]?.sections || [])]
        }
      }
    }));
  };

  const removePolicySection = (policyKey, sectionIndex) => {
    requestDeletePassword().then((deletePassword) => {
      if (deletePassword === null) return;
      setSettingsForm((current) => {
        const nextSections = (current.policies?.[policyKey]?.sections || []).filter((_, index) => index !== sectionIndex);
        return {
          ...current,
          policies: {
            ...current.policies,
            [policyKey]: {
              ...current.policies[policyKey],
              sections: nextSections.length ? nextSections : [{ title: '', body: '' }]
            }
          }
        };
      });
    });
  };

  const requestDeletePassword = async () => {
    if (!settingsForm.adminControls?.deleteConfirmationEnabled) return '';

    if (!settingsForm.adminControls?.hasDeletePassword) {
      toast.error('فعّل كلمة مرور الحذف أولًا من إعدادات المتجر');
      return null;
    }

    const password = window.prompt('أدخل كلمة مرور تأكيد الحذف');
    if (!password) return null;

    try {
      await api.post('/settings/admin/verify-delete-password', { password });
      return password;
    } catch (error) {
      toast.error(error.response?.data?.message || 'كلمة مرور الحذف غير صحيحة');
      return null;
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      if (isEmployee) {
        if (activeSection === 'categories') {
          await api.put('/settings/admin/categories', { categoryGroups: settingsForm.categoryGroups });
        } else if (activeSection === 'loyalty') {
          await api.put('/settings/admin/loyalty', { loyalty: settingsForm.loyalty });
        } else {
          throw new Error('EMPLOYEE_SECTION_NOT_ALLOWED');
        }
      } else {
        await api.put('/settings/admin', settingsForm);
        await refresh();
      }
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

  const closeQrScanner = () => {
    qrControlsRef.current?.stop?.();
    qrControlsRef.current = null;
    qrReaderRef.current?.reset?.();
    setQrScannerOpen(false);
    setQrScannerStarting(false);
    setQrScannerStatus('');
  };

  const openQrScanner = () => {
    setQrScannerOpen(true);
    setQrScannerStarting(false);
    setQrScannerStatus('للبدء اضغط على زر السماح بالكاميرا.');
  };

  const requestQrScanner = async () => {
    setQrScannerStarting(true);
    setQrScannerStatus('جارٍ تشغيل الكاميرا وقراءة QR...');

    if (!window.isSecureContext) {
      setQrScannerStatus('فتح الكاميرا يتطلب رابط https مباشر للموقع.');
      setQrScannerStarting(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setQrScannerStatus('هذا المتصفح لا يدعم فتح الكاميرا.');
      setQrScannerStarting(false);
      return;
    }

    try {
      qrControlsRef.current?.stop?.();
      qrReaderRef.current?.reset?.();

      if (!qrReaderRef.current) {
        qrReaderRef.current = new BrowserQRCodeReader();
      }

      const controls = await qrReaderRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        qrVideoRef.current,
        (result, error) => {
          const code = result?.getText?.();

          if (code) {
            setCustomerSearch(code);
            closeQrScanner();
            toast.success(`تمت قراءة QR: ${code}`);
            return;
          }

          if (!error || ['NotFoundException', 'ChecksumException', 'FormatException'].includes(error.name)) {
            setQrScannerStatus('وجّه رمز QR داخل الإطار وثبّته لثانية واحدة...');
            return;
          }

          setQrScannerStatus('تعذر قراءة QR حاليًا، حاول تقريب الكاميرا أو تحسين الإضاءة.');
        }
      );

      qrControlsRef.current = controls;
      setQrScannerStatus('وجّه رمز QR داخل الإطار وثبّته لثانية واحدة...');
    } catch {
      setQrScannerStatus('تعذر تشغيل الكاميرا. تأكد من السماح بالكاميرا وفتح الرابط المباشر للموقع.');
      setQrScannerStarting(false);
    }
  };

  const sectionClass = (id) => `dashboard-tab-btn${activeSection === id ? ' active' : ''}`;
  const handleSectionChange = (sectionId) => {
    if (sectionId === 'store-purchases' && window.matchMedia('(max-width: 760px)').matches) {
      navigate('/admin/store-purchases');
      return;
    }

    setActiveSection(sectionId);
  };

  return (
    <main className="container page admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div className="admin-hero-copy">
          <span className="market-pill">لوحة التحكم</span>
          <h1>إدارة المتجر من مكان واحد</h1>
          <p>تحكم في المنتجات والفئات والمحتوى والطلبات والدفع والدعم من واجهة أوضح وأسهل في الاستخدام.</p>
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
        {visibleDashboardSections.map((section) => {
          const Icon = section.icon;
          return (
            <button key={section.id} type="button" className={sectionClass(section.id)} onClick={() => handleSectionChange(section.id)}>
              <Icon size={18} />
              <span>{section.label}</span>
              {section.id === 'support' && totalSupportUnread > 0 ? <b>{totalSupportUnread}</b> : null}
            </button>
          );
        })}
      </nav>

      <div className="admin-dashboard-grid">
        <section className={`admin-dashboard-panel${activeSection === 'products' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>{editing ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
              <p>أنشئ منتجًا جديدًا أو عدّل المنتج الحالي مع ربطه بالفئة والقسم المناسبين.</p>
            </div>
          </div>
          <SearchBox value={searchTerms.products} onChange={(event) => changeSearch('products', event.target.value)} placeholder="ابحث عن منتج بالاسم أو الفئة..." />

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

            <Field label="QR / Barcode المنتج">
              <div className="admin-qr-field">
                <input
                  name="barcode"
                  value={productForm.barcode}
                  onChange={changeProduct}
                  onBlur={ensureProductBarcode}
                  placeholder="سيتم توليده تلقائيًا إذا تُرك فارغًا"
                />
                <button type="button" className="secondary-btn" onClick={ensureProductBarcode}>توليد QR</button>
              </div>
            </Field>

            <div className="admin-product-qr-preview">
              <div className="admin-product-qr-copy">
                <strong>معاينة QR المنتج</strong>
                <span>{productForm.barcode ? `سيُحفظ هذا الكود مع المنتج: ${productForm.barcode}` : 'اكتب كود المنتج أو اضغط توليد QR لإنشاء كود تلقائي.'}</span>
              </div>
              <div className="admin-product-qr-box">
                {productQrImage ? <img src={productQrImage} alt={`QR ${productForm.barcode}`} /> : <div className="admin-product-qr-empty">QR</div>}
              </div>
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
                    <th>QR</th>
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
                          <button type="button" className="table-action-btn" onClick={() => openProductQrPreview(product)}>QR</button>
                          <button type="button" className="table-action-btn" onClick={() => printProductQr(product)}>
                            <Printer size={14} />
                            <span>طباعة</span>
                          </button>
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

        <section className={`admin-dashboard-panel${activeSection === 'customer-care' ? ' active' : ''}`}>
          {canManageCustomerCare ? (
            <>
              <div className="admin-section-head">
                <div>
                  <h2>قسم إرضاء العميل</h2>
                  <p>ابحث عن العميل عبر QR أو رقم الهاتف أو الاسم أو البريد، ثم أضف له مزايا خاصة مثل المحفظة أو النقاط أو كود الخصم.</p>
                </div>
              </div>

              <SearchBox
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="ابحث بالـ QR أو رقم الهاتف أو الاسم أو البريد الإلكتروني..."
                onCameraClick={openQrScanner}
              />

              <div className="customer-care-layout">
                <section className="customer-care-results">
                  {customerLoading ? <div className="admin-setting-card"><p className="muted">جارٍ تحميل العملاء...</p></div> : null}

                  {!customerLoading && customerSearch.trim() && !customerResults.length ? (
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
            </>
          ) : (
            <div className="admin-setting-card">
              <p className="muted">ليس لديك صلاحية الوصول إلى قسم إرضاء العميل.</p>
            </div>
          )}
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'store-purchases' ? ' active' : ''}`}>
          {canManageStorePurchases ? (
            <>
              <div className="admin-section-head">
                <div>
                  <h2>تسجيل الشراء من المحل</h2>
                  <p>ابحث عن العميل عبر QR أو رقم الهاتف أو الاسم أو البريد، ثم سجّل مبلغ شراء المحل ليُضاف إلى إجمالي مشترياته ونقاطه مباشرة.</p>
                </div>
              </div>

              <SearchBox
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="ابحث بالـ QR أو رقم الهاتف أو الاسم أو البريد الإلكتروني..."
                onCameraClick={openQrScanner}
              />

              <div className="customer-care-layout">
                <section className="customer-care-results">
                  {customerLoading ? <div className="admin-setting-card"><p className="muted">جارٍ تحميل العملاء...</p></div> : null}

                  {!customerLoading && customerSearch.trim() && !customerResults.length ? (
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

                        <article className="admin-setting-card customer-care-action-card">
                          <div className="customer-care-card-head">
                            <Store size={18} />
                            <strong>تسجيل شراء جديد من المحل</strong>
                          </div>
                          <Field label="مبلغ الشراء"><input type="number" value={storePurchaseForm.amount} onChange={(event) => setStorePurchaseForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" /></Field>
                          <Field label="ملاحظة"><input value={storePurchaseForm.note} onChange={(event) => setStorePurchaseForm((current) => ({ ...current, note: event.target.value }))} placeholder="مثال: فاتورة من الفرع" /></Field>
                          <p className="muted">سيتم إضافة نفس قيمة المبلغ كنقاط ولاء تقريبًا بعد التقريب لرقم صحيح.</p>
                          <button
                            type="button"
                            className="primary-btn admin-inline-save-btn"
                            onClick={() => applyCustomerAction('store_purchase', storePurchaseForm)}
                          >
                            <Save size={16} />
                            <span>تسجيل الشراء</span>
                          </button>
                        </article>
                      </div>

                      <article className="admin-setting-card">
                        <div className="section-head compact customer-care-inline-head">
                          <div>
                            <h3>آخر عمليات الشراء المسجلة من المحل</h3>
                            <span>سجل مختصر لعمليات هذا العميل داخل الفرع</span>
                          </div>
                        </div>
                        <div className="customer-care-history">
                          {selectedCustomer.customerCareHistory?.filter((entry) => entry.type === 'store_purchase').length ? selectedCustomer.customerCareHistory
                            .filter((entry) => entry.type === 'store_purchase')
                            .map((entry) => (
                              <div key={entry._id} className="customer-care-history-item">
                                <strong>{customerCareTypeLabel(entry.type)}</strong>
                                <span>{entry.amount ? `${entry.amount} ج.م` : '-'}</span>
                                <p>{entry.note || 'بدون ملاحظة'}</p>
                              </div>
                            )) : <p className="muted">لا توجد عمليات شراء محل مسجلة لهذا العميل حتى الآن.</p>}
                        </div>
                      </article>
                    </>
                  ) : (
                    <div className="admin-setting-card">
                      <p className="muted">اختر عميلًا من القائمة لتسجيل شراء جديد من المحل.</p>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="admin-setting-card">
              <p className="muted">ليس لديك صلاحية الوصول إلى قسم تسجيل الشراء من المحل.</p>
            </div>
          )}
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'categories' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>إدارة الفئات والأقسام</h2>
              <p>أنشئ الفئات الرئيسية والأقسام الفرعية التي يرتبط بها عرض الموقع والمنتجات.</p>
            </div>
            <FolderTree size={18} />
          </div>
          <SearchBox value={searchTerms.categories} onChange={(event) => changeSearch('categories', event.target.value)} placeholder="ابحث عن فئة أو قسم..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-category-groups-stack">
              <button type="button" className="table-action-btn edit" onClick={addCategoryGroup}>إضافة فئة رئيسية</button>
              {filteredCategoryGroups.map(({ group, index }) => (
                <article key={`group-${index}`} className="admin-setting-card">
                  <div className="admin-category-inventory">
                    <div className="admin-category-inventory-head">
                      <div>
                        <strong>{group.title || `فئة رئيسية ${index + 1}`}</strong>
                        <span>{group.subtitle || 'أضف وصفًا مختصرًا لهذه الفئة ليسهل تمييزها داخل لوحة التحكم.'}</span>
                      </div>
                      <b>{(group.sections || []).filter((section) => section?.title).length} قسم</b>
                    </div>
                    {(group.sections || []).length ? (
                      <div className="admin-category-inventory-list">
                        {(group.sections || []).map((section, sectionIndex) => (
                          <div key={`inventory-${index}-${sectionIndex}`} className="admin-category-chip">
                            <strong>{section.title || `قسم ${sectionIndex + 1}`}</strong>
                            <span>{section.sourceCategory || group.title || 'بدون فئة مصدر'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">لا توجد أقسام بعد. أضف أول قسم وسيظهر هنا كجرد سريع.</p>
                    )}
                  </div>
                  <div className="admin-dashboard-form-grid two-cols">
                    <Field label="اسم الفئة"><input value={group.title} onChange={(event) => changeSettingsField(['categoryGroups', index, 'title'], event.target.value)} placeholder="اسم الفئة" /></Field>
                    <Field label="وصف مختصر"><input value={group.subtitle} onChange={(event) => changeSettingsField(['categoryGroups', index, 'subtitle'], event.target.value)} placeholder="وصف مختصر" /></Field>
                  </div>
                  <div className="admin-subsections-stack">
                    {(group.sections || []).map((section, sectionIndex) => (
                      <div key={`section-${index}-${sectionIndex}`} className="admin-subsection-card">
                        <Field label="اسم القسم"><input value={section.title} onChange={(event) => changeSettingsField(['categoryGroups', index, 'sections', sectionIndex, 'title'], event.target.value)} placeholder="اسم القسم" /></Field>
                        <Field label="الفئة المصدر">
                          <input value={section.sourceCategory} onChange={(event) => changeSettingsField(['categoryGroups', index, 'sections', sectionIndex, 'sourceCategory'], event.target.value)} placeholder="الفئة المصدر" />
                        </Field>
                        <button type="button" className="table-action-btn danger" onClick={() => removeSectionFromGroup(index, sectionIndex)}>حذف القسم</button>
                      </div>
                    ))}
                  </div>
                  <div className="admin-table-actions">
                    <button type="button" className="table-action-btn edit" onClick={() => addSectionToGroup(index)}>إضافة قسم</button>
                    <button type="button" className="table-action-btn danger" onClick={() => removeCategoryGroup(index)}>حذف الفئة</button>
                  </div>
                  <SaveSectionButton saving={settingsSaving} label="حفظ الفئة والأقسام" />
                </article>
              ))}
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'store' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>إعدادات المتجر</h2>
              <p>حدّث بيانات المتجر العامة وبيانات الشحن والتواصل.</p>
            </div>
            <Store size={18} />
          </div>
          <SearchBox value={searchTerms.store} onChange={(event) => changeSearch('store', event.target.value)} placeholder="ابحث داخل إعدادات المتجر..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Store size={18} /><strong>الهوية الأساسية</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="اسم المتجر"><input value={settingsForm.storeName} onChange={(event) => changeSettingsField(['storeName'], event.target.value)} placeholder="اسم المتجر" /></Field>
                  <Field label="الوصف المختصر"><input value={settingsForm.storeTagline} onChange={(event) => changeSettingsField(['storeTagline'], event.target.value)} placeholder="وصف مختصر" /></Field>
                  <Field label="رقم الدعم"><input value={settingsForm.supportPhone} onChange={(event) => changeSettingsField(['supportPhone'], event.target.value)} placeholder="رقم الدعم" /></Field>
                  <Field label="بريد الدعم"><input value={settingsForm.supportEmail} onChange={(event) => changeSettingsField(['supportEmail'], event.target.value)} placeholder="البريد الإلكتروني" /></Field>
                  <Field label="العنوان"><input value={settingsForm.address} onChange={(event) => changeSettingsField(['address'], event.target.value)} placeholder="العنوان" /></Field>
                  <Field label="مواعيد العمل"><input value={settingsForm.workingHours} onChange={(event) => changeSettingsField(['workingHours'], event.target.value)} placeholder="مواعيد العمل" /></Field>
                  <Field label="واتساب"><input value={settingsForm.whatsapp} onChange={(event) => changeSettingsField(['whatsapp'], event.target.value)} placeholder="رقم واتساب" /></Field>
                  <Field label="رابط فيس بوك"><input value={settingsForm.facebookUrl} onChange={(event) => changeSettingsField(['facebookUrl'], event.target.value)} placeholder="https://facebook.com/your-page" /></Field>
                  <Field label="رابط إنستجرام"><input value={settingsForm.instagramUrl} onChange={(event) => changeSettingsField(['instagramUrl'], event.target.value)} placeholder="https://instagram.com/your-page" /></Field>
                </div>
                <div className="admin-category-inventory">
                  <div className="admin-category-inventory-head">
                    <div>
                      <strong>حماية الحذف</strong>
                      <span>اضبط كلمة مرور خاصة لتأكيد أي عملية حذف داخل لوحة التحكم.</span>
                    </div>
                    <b>{settingsForm.adminControls?.hasDeletePassword ? 'مفعلة' : 'بدون كلمة مرور'}</b>
                  </div>
                  <div className="admin-dashboard-form-grid two-cols">
                    <Field label="كلمة مرور الحذف الجديدة">
                      <input
                        type="password"
                        value={settingsForm.adminControls?.deletePassword || ''}
                        onChange={(event) => changeSettingsField(['adminControls', 'deletePassword'], event.target.value)}
                        placeholder="اتركها فارغة إذا لا تريد التغيير"
                      />
                    </Field>
                  </div>
                  <div className="admin-toggle-row">
                    <label className="admin-toggle-pill">
                      <input
                        type="checkbox"
                        checked={Boolean(settingsForm.adminControls?.deleteConfirmationEnabled)}
                        onChange={(event) => changeSettingsField(['adminControls', 'deleteConfirmationEnabled'], event.target.checked)}
                      />
                      تفعيل طلب كلمة مرور قبل الحذف
                    </label>
                  </div>
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ إعدادات المتجر" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'checkout' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>إعداد الطلب</h2>
              <p>تحكم في بيانات فورم إتمام الطلب والمحافظات والمدن المتاحة للعميل أثناء الشراء.</p>
            </div>
            <MapPin size={18} />
          </div>
          <SearchBox value={searchTerms.checkout} onChange={(event) => changeSearch('checkout', event.target.value)} placeholder="ابحث عن محافظة أو مدينة..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>إعدادات الشحن والنموذج</strong></div>
                <div className="admin-dashboard-form-grid two-cols">
                  <Field label="رسوم الشحن"><input type="number" value={settingsForm.checkout.shippingFee} onChange={(event) => changeSettingsField(['checkout', 'shippingFee'], Number(event.target.value))} placeholder="0" /></Field>
                  <Field label="حد الشحن المجاني"><input type="number" value={settingsForm.checkout.freeShippingThreshold} onChange={(event) => changeSettingsField(['checkout', 'freeShippingThreshold'], Number(event.target.value))} placeholder="0" /></Field>
                </div>
                <div className="admin-toggle-row">
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.checkout.notesEnabled} onChange={(event) => changeSettingsField(['checkout', 'notesEnabled'], event.target.checked)} /> إظهار حقل الملاحظات</label>
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.checkout.notesRequired} onChange={(event) => changeSettingsField(['checkout', 'notesRequired'], event.target.checked)} disabled={!settingsForm.checkout.notesEnabled} /> جعل الملاحظات مطلوبة</label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ إعدادات الطلب" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><FolderTree size={18} /><strong>المحافظات والمدن المتاحة</strong></div>
                <div className="admin-category-groups-stack">
                  <button type="button" className="table-action-btn edit" onClick={addGovernorate}>إضافة محافظة</button>
                  {filteredCheckoutGovernorates.map(({ governorate, index }) => (
                    <article key={`governorate-${index}`} className="admin-setting-card nested">
                      <div className="admin-category-inventory">
                        <div className="admin-category-inventory-head">
                          <div>
                            <strong>{governorate.name || `محافظة ${index + 1}`}</strong>
                            <span>{Number(governorate.shippingFee ?? settingsForm.checkout.shippingFee)} ج.م رسوم شحن لهذه المحافظة</span>
                          </div>
                          <b>{(governorate.cities || []).filter(Boolean).length} مدينة</b>
                        </div>
                        {(governorate.cities || []).length ? (
                          <div className="admin-category-inventory-list">
                            {(governorate.cities || []).map((city, cityIndex) => (
                              <div key={`governorate-inventory-${index}-${cityIndex}`} className="admin-category-chip">
                                <strong>{city || `مدينة ${cityIndex + 1}`}</strong>
                                <span>{governorate.name || 'محافظة بدون اسم'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">لا توجد مدن بعد. أضف أول مدينة وستظهر هنا كجرد سريع.</p>
                        )}
                      </div>
                      <div className="admin-dashboard-form-grid two-cols">
                        <Field label="اسم المحافظة">
                          <input
                            value={governorate.name}
                            onChange={(event) => changeSettingsField(['checkout', 'governorates', index, 'name'], event.target.value)}
                            placeholder="اسم المحافظة"
                          />
                        </Field>
                        <Field label="رسوم شحن المحافظة">
                          <input
                            type="number"
                            value={governorate.shippingFee ?? settingsForm.checkout.shippingFee}
                            onChange={(event) => changeSettingsField(['checkout', 'governorates', index, 'shippingFee'], Number(event.target.value))}
                            placeholder="0"
                          />
                        </Field>
                      </div>
                      <div className="admin-subsections-stack">
                        {(governorate.cities || []).map((city, cityIndex) => (
                          <div key={`city-${index}-${cityIndex}`} className="admin-subsection-card">
                            <Field label="اسم المدينة">
                              <input
                                value={city}
                                onChange={(event) => changeSettingsField(['checkout', 'governorates', index, 'cities', cityIndex], event.target.value)}
                                placeholder="اسم المدينة"
                              />
                            </Field>
                            <button type="button" className="table-action-btn danger" onClick={() => removeCityFromGovernorate(index, cityIndex)}>حذف المدينة</button>
                          </div>
                        ))}
                      </div>
                      <div className="admin-table-actions">
                        <button type="button" className="table-action-btn edit" onClick={() => addCityToGovernorate(index)}>إضافة مدينة</button>
                        <button type="button" className="table-action-btn danger" onClick={() => removeGovernorate(index)}>حذف المحافظة</button>
                      </div>
                      <SaveSectionButton saving={settingsSaving} label="حفظ المحافظة والمدن" />
                    </article>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ المحافظات" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'content' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>المحتوى والبنرات</h2>
              <p>تحكم في صفحة من نحن والبنرات والفئات المميزة في الرئيسية.</p>
            </div>
            <Palette size={18} />
          </div>
          <SearchBox value={searchTerms.content} onChange={(event) => changeSearch('content', event.target.value)} placeholder="ابحث عن بانر أو فئة مميزة..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>صفحة من نحن</strong></div>
                <div className="admin-text-grid enhanced">
                  <Field label="العنوان"><textarea value={settingsForm.about.title} onChange={(event) => changeSettingsField(['about', 'title'], event.target.value)} /></Field>
                  <Field label="الوصف"><textarea value={settingsForm.about.description} onChange={(event) => changeSettingsField(['about', 'description'], event.target.value)} /></Field>
                  <Field label="الرؤية"><textarea value={settingsForm.about.vision} onChange={(event) => changeSettingsField(['about', 'vision'], event.target.value)} /></Field>
                  <Field label="الرسالة"><textarea value={settingsForm.about.mission} onChange={(event) => changeSettingsField(['about', 'mission'], event.target.value)} /></Field>
                  <Field label="القيم"><textarea value={settingsForm.about.values} onChange={(event) => changeSettingsField(['about', 'values'], event.target.value)} /></Field>
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ صفحة من نحن" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Palette size={18} /><strong>بنرات الرئيسية</strong></div>
                <div className="admin-slides-grid enhanced">
                  {filteredHeroSlides.map(({ slide, index }) => (
                    <div key={`slide-${index}`} className="admin-slide-card refined">
                      <strong>بانر {index + 1}</strong>
                      <Field label="العنوان"><input value={slide.title} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'title'], event.target.value)} /></Field>
                      <Field label="شارة صغيرة"><input value={slide.tag} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'tag'], event.target.value)} /></Field>
                      <Field label="وصف مختصر"><input value={slide.note} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'note'], event.target.value)} /></Field>
                      <Field label="رابط الصورة"><input value={slide.image} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'image'], event.target.value)} /></Field>
                      <Field label="رابط عند الضغط"><input value={slide.link || ''} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'link'], event.target.value)} /></Field>
                      <label className="admin-file-pill admin-banner-upload">
                        <input type="file" accept="image/*" onChange={(event) => uploadBanner(index, event.target.files?.[0] || null)} />
                        <span>{uploadingBannerIndex === index ? 'جارٍ رفع الصورة...' : 'رفع صورة البنر'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ البنرات" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><FolderTree size={18} /><strong>الفئات المميزة</strong></div>
                <div className="admin-slides-grid enhanced">
                  {filteredFeaturedCategories.map(({ item, index }) => (
                    <div key={`featured-${index}`} className="admin-slide-card refined">
                      <strong>فئة مميزة {index + 1}</strong>
                      <Field label="العنوان"><input value={item.title} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'title'], event.target.value)} /></Field>
                      <Field label="وصف مختصر"><input value={item.subtitle} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'subtitle'], event.target.value)} /></Field>
                      <Field label="الفئة المرتبطة">
                        <select value={item.category} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'category'], event.target.value)}>
                          <option value="">اختر فئة</option>
                          {sourceCategories.map((category) => <option key={`featured-${category}`} value={category}>{category}</option>)}
                        </select>
                      </Field>
                      <Field label="رابط الصورة"><input value={item.image} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'image'], event.target.value)} /></Field>
                      <label className="admin-file-pill admin-banner-upload">
                        <input type="file" accept="image/*" onChange={(event) => uploadFeaturedCategoryImage(index, event.target.files?.[0] || null)} />
                        <span>{uploadingFeaturedCategoryIndex === index ? 'جارٍ رفع الصورة...' : 'رفع صورة الفئة'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ الفئات المميزة" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'policies' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>السياسات</h2>
              <p>تحكم في صفحات الخصوصية والشروط والشحن والاسترجاع من مكان واحد.</p>
            </div>
            <ShieldCheck size={18} />
          </div>
          <SearchBox value={searchTerms.policies} onChange={(event) => changeSearch('policies', event.target.value)} placeholder="ابحث داخل صفحات السياسات..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              {filteredPolicies.map(({ key, label, icon: Icon }) => {
                const policy = settingsForm.policies?.[key] || { title: '', description: '', sections: [{ title: '', body: '' }] };
                return (
                  <article key={key} className="admin-setting-card">
                    <div className="admin-setting-card-head"><Icon size={18} /><strong>{label}</strong></div>
                    <div className="admin-text-grid enhanced">
                      <Field label="عنوان الصفحة">
                        <input value={policy.title} onChange={(event) => changeSettingsField(['policies', key, 'title'], event.target.value)} />
                      </Field>
                      <Field label="وصف مختصر">
                        <textarea value={policy.description} onChange={(event) => changeSettingsField(['policies', key, 'description'], event.target.value)} />
                      </Field>
                    </div>

                    <div className="admin-category-inventory">
                      <div className="admin-category-inventory-head">
                        <strong>بنود الصفحة</strong>
                        <button type="button" className="table-action-btn edit" onClick={() => addPolicySection(key)}>إضافة بند</button>
                      </div>

                      <div className="admin-slides-grid enhanced">
                        {(policy.sections || []).map((section, sectionIndex) => (
                          <div key={`${key}-section-${sectionIndex}`} className="admin-slide-card refined">
                            <strong>بند {sectionIndex + 1}</strong>
                            <Field label="عنوان البند">
                              <input
                                value={section.title}
                                onChange={(event) => changeSettingsField(['policies', key, 'sections', sectionIndex, 'title'], event.target.value)}
                              />
                            </Field>
                            <Field label="محتوى البند">
                              <textarea
                                value={section.body}
                                onChange={(event) => changeSettingsField(['policies', key, 'sections', sectionIndex, 'body'], event.target.value)}
                              />
                            </Field>
                            <button type="button" className="table-action-btn danger" onClick={() => removePolicySection(key, sectionIndex)}>حذف البند</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <SaveSectionButton saving={settingsSaving} label={`حفظ ${label}`} />
                  </article>
                );
              })}
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'payments' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>الدفع والتكامل</h2>
              <p>اضبط بوابات الدفع ورسوم الشراء وخيارات التفعيل.</p>
            </div>
            <CreditCard size={18} />
          </div>
          <SearchBox value={searchTerms.payments} onChange={(event) => changeSearch('payments', event.target.value)} placeholder="ابحث داخل إعدادات الدفع..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><CreditCard size={18} /><strong>إعدادات الدفع</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="العملة"><input value={settingsForm.payment.currency} onChange={(event) => changeSettingsField(['payment', 'currency'], event.target.value)} placeholder="egp" /></Field>
                  <Field label="مزود الدفع"><input value={settingsForm.payment.onlineProvider} onChange={(event) => changeSettingsField(['payment', 'onlineProvider'], event.target.value)} placeholder="stripe" /></Field>
                  <Field label="Stripe Publishable Key"><input value={settingsForm.payment.stripePublishableKey} onChange={(event) => changeSettingsField(['payment', 'stripePublishableKey'], event.target.value)} /></Field>
                  <Field label="Stripe Secret Key"><input value={settingsForm.payment.stripeSecretKey} onChange={(event) => changeSettingsField(['payment', 'stripeSecretKey'], event.target.value)} /></Field>
                </div>
                <div className="admin-toggle-row">
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.cashOnDeliveryEnabled} onChange={(event) => changeSettingsField(['payment', 'cashOnDeliveryEnabled'], event.target.checked)} /> تفعيل الدفع عند الاستلام</label>
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.onlinePaymentEnabled} onChange={(event) => changeSettingsField(['payment', 'onlinePaymentEnabled'], event.target.checked)} /> تفعيل الدفع أونلاين</label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ إعدادات الدفع" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'loyalty' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>النقاط وأكواد الخصم</h2>
              <p>تحكم في قيمة نقاط الولاء، معدل احتسابها، وأنشئ أكواد خصم فعالة للموقع.</p>
            </div>
            <Gift size={18} />
          </div>
          <SearchBox value={searchTerms.loyalty} onChange={(event) => changeSearch('loyalty', event.target.value)} placeholder="ابحث عن كود خصم أو إعداد نقاط..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Gift size={18} /><strong>إعدادات نقاط الولاء</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="كل كام جنيه = نقطة واحدة">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.loyalty.pointsPerPoint}
                      onChange={(event) => changeSettingsField(['loyalty', 'pointsPerPoint'], Number(event.target.value))}
                    />
                  </Field>
                  <Field label="قيمة النقطة بالجنيه">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settingsForm.loyalty.pointValue}
                      onChange={(event) => changeSettingsField(['loyalty', 'pointValue'], Number(event.target.value))}
                    />
                  </Field>
                  <Field label="أقل عدد نقاط للاستبدال">
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.loyalty.minRedeemPoints}
                      onChange={(event) => changeSettingsField(['loyalty', 'minRedeemPoints'], Number(event.target.value))}
                    />
                  </Field>
                </div>
                <div className="admin-toggle-row">
                  <label className="admin-toggle-pill">
                    <input
                      type="checkbox"
                      checked={settingsForm.loyalty.enabled}
                      onChange={(event) => changeSettingsField(['loyalty', 'enabled'], event.target.checked)}
                    />
                    تفعيل نقاط الولاء
                  </label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ إعدادات النقاط" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>أكواد الخصم</strong></div>
                <button type="button" className="secondary-btn" onClick={addDiscountCode}>إضافة كود خصم</button>
                <div className="admin-slides-grid enhanced">
                  {filteredDiscountCodes.map(({ code, index }) => (
                    <div key={`discount-${index}`} className="admin-slide-card refined">
                      <strong>كود خصم {index + 1}</strong>
                      <Field label="الكود">
                        <input
                          value={code.code}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'code'], event.target.value.toUpperCase())}
                          placeholder="SAVE10"
                        />
                      </Field>
                      <Field label="نوع الخصم">
                        <select value={code.type} onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'type'], event.target.value)}>
                          <option value="fixed">مبلغ ثابت</option>
                          <option value="percent">نسبة مئوية</option>
                        </select>
                      </Field>
                      <Field label="قيمة الخصم">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.value}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'value'], event.target.value)}
                        />
                      </Field>
                      <Field label="الحد الأدنى للطلب">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.minOrderAmount}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'minOrderAmount'], event.target.value)}
                        />
                      </Field>
                      <Field label="أقصى خصم">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.maxDiscount}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'maxDiscount'], event.target.value)}
                        />
                      </Field>
                      <Field label="حد الاستخدام">
                        <input
                          type="number"
                          min="0"
                          value={code.usageLimit}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'usageLimit'], event.target.value)}
                        />
                      </Field>
                      <Field label="عدد مرات الاستخدام">
                        <input value={code.usedCount || 0} readOnly />
                      </Field>
                      <Field label="تاريخ الانتهاء">
                        <input
                          type="date"
                          value={code.expiresAt || ''}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'expiresAt'], event.target.value)}
                        />
                      </Field>
                      <div className="admin-toggle-row">
                        <label className="admin-toggle-pill">
                          <input
                            type="checkbox"
                            checked={code.active !== false}
                            onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'active'], event.target.checked)}
                          />
                          الكود مفعل
                        </label>
                      </div>
                      <button type="button" className="table-action-btn delete" onClick={() => removeDiscountCode(index)}>حذف الكود</button>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="حفظ أكواد الخصم" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'accounts' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>قسم الحسابات</h2>
              <p>تابع معاملات اليوم والأسبوع والشهر من الطلبات وشراء المحل والمحفظة والنقاط والمرتجعات.</p>
            </div>
            <Wallet size={18} />
          </div>
          <SearchBox value={searchTerms.accounts} onChange={(event) => changeSearch('accounts', event.target.value)} placeholder="ابحث في المعاملات بالعميل أو النوع أو الملاحظة أو الكود..." />

          <div className="accounts-period-grid">
            {accountingData.summaries.map((period) => (
              <article key={period.key} className="admin-setting-card accounts-period-card">
                <div className="admin-setting-card-head">
                  <Wallet size={18} />
                  <strong>{period.label}</strong>
                </div>
                <p className="muted">{period.note}</p>
                <div className="accounts-kpi-grid">
                  <div className="accounts-kpi-card"><span>إيراد الطلبات</span><strong>{period.values.ordersRevenue.toFixed(2)} ج.م</strong></div>
                  <div className="accounts-kpi-card"><span>الدفع الأونلاين</span><strong>{period.values.onlineRevenue.toFixed(2)} ج.م</strong></div>
                  <div className="accounts-kpi-card"><span>شراء المحل</span><strong>{period.values.storePurchases.toFixed(2)} ج.م</strong></div>
                  <div className="accounts-kpi-card"><span>إضافات المحفظة</span><strong>{period.values.walletCredits.toFixed(2)} ج.م</strong></div>
                  <div className="accounts-kpi-card"><span>المرتجعات</span><strong>{period.values.refundsAmount.toFixed(2)} ج.م</strong></div>
                  <div className="accounts-kpi-card"><span>النقاط المضافة</span><strong>{period.values.pointsCredits} نقطة</strong></div>
                  <div className="accounts-kpi-card"><span>أكواد الخصم</span><strong>{period.values.discountsIssued}</strong></div>
                  <div className="accounts-kpi-card"><span>عدد المعاملات</span><strong>{period.values.transactionsCount}</strong></div>
                </div>
              </article>
            ))}
          </div>

          <div className="admin-table-card">
            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>العميل</th>
                    <th>القيمة</th>
                    <th>التفاصيل</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccountingTransactions.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.createdAt).toLocaleString('ar-EG')}</td>
                      <td>{entry.label}</td>
                      <td>{entry.customerName || '-'}</td>
                      <td>{entry.amount ? `${Number(entry.amount || 0).toFixed(2)} ج.م` : `${Number(entry.points || 0)} نقطة`}</td>
                      <td>{[entry.paymentLabel, entry.statusLabel, entry.code].filter(Boolean).join(' • ') || '-'}</td>
                      <td>{entry.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'orders' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>إدارة الطلبات</h2>
              <p>راجع الطلبات وغيّر حالتها بسرعة.</p>
            </div>
            <ShoppingBag size={18} />
          </div>
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
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.user?.name || '-'}</td>
                      <td>{order.totalPrice} ج.م</td>
                      <td>{order.isPaid ? 'مدفوع' : order.paymentMethod}</td>
                      <td>
                        <select value={order.status} onChange={(event) => changeStatus(order._id, event.target.value)}>
                          {orderStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'support' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>دعم العملاء</h2>
              <p>راجع المحادثات، أرسل الردود، وتحكم في حالة المحادثة وحالة القراءة.</p>
            </div>
            <MessageCircle size={18} />
          </div>
          <SearchBox value={searchTerms.support} onChange={(event) => changeSearch('support', event.target.value)} placeholder="ابحث عن محادثة باسم العميل أو آخر رسالة..." />
          <div className="admin-settings-cluster">
            {filteredSupportConversations.length ? filteredSupportConversations.map((conversation) => (
              <article key={conversation._id} className="admin-setting-card">
                <div className="admin-section-head compact">
                  <div>
                    <h3>{conversation.customer?.name || 'عميل'}</h3>
                    <p>
                      {conversation.customer?.email || '-'}
                      {conversation.assignedEmployee?.name ? ` • ${conversation.assignedEmployee.name}` : ''}
                    </p>
                  </div>
                  <div className="support-admin-header-tools">
                    {conversation.supportUnreadCount > 0 ? <span className="support-admin-unread-badge">{conversation.supportUnreadCount}</span> : null}
                    <span className={`admin-toggle-pill support-status-pill${conversation.status === 'closed' ? ' is-closed' : ''}`}>
                      {conversation.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                    </span>
                  </div>
                </div>

                <div className="support-admin-toolbar">
                  <button type="button" className="table-action-btn edit" onClick={() => markSupportAsRead(conversation._id)} disabled={!conversation.supportUnreadCount}>تمت القراءة</button>
                  <button type="button" className="table-action-btn" onClick={() => toggleSupportConversationStatus(conversation)}>
                    {conversation.status === 'closed' ? 'إعادة فتح' : 'إغلاق المحادثة'}
                  </button>
                </div>

                <div className="support-admin-thread">
                  {(conversation.messages || []).map((message) => (
                    <div key={message._id} className={`support-admin-message${message.senderRole === 'support' ? ' mine' : ''}`}>
                      <strong>{message.senderRole === 'support' ? 'الدعم' : (conversation.customer?.name || 'العميل')}</strong>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>

                <div className="support-admin-reply">
                  <input
                    value={supportReplyDrafts[conversation._id] || ''}
                    onChange={(event) => setSupportReplyDrafts((current) => ({ ...current, [conversation._id]: event.target.value }))}
                    placeholder={conversation.status === 'closed' ? 'أعد فتح المحادثة أولًا...' : 'اكتب ردك هنا...'}
                    disabled={conversation.status === 'closed'}
                  />
                  <button type="button" className="primary-btn" onClick={() => sendSupportReply(conversation._id)} disabled={conversation.status === 'closed'}>إرسال الرد</button>
                </div>
              </article>
            )) : <p className="muted">لا توجد محادثات دعم حاليًا.</p>}
          </div>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'users' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>إدارة المستخدمين</h2>
              <p>استعرض المستخدمين، غيّر نوع الحساب، وعدّل صلاحيات الموظفين.</p>
            </div>
            <Users size={18} />
          </div>
          <SearchBox value={searchTerms.users} onChange={(event) => changeSearch('users', event.target.value)} placeholder="ابحث عن مستخدم بالاسم أو البريد أو الهاتف..." />
          <div className="admin-table-card">
            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>الهاتف</th>
                    <th>النوع</th>
                    <th>الصلاحيات</th>
                    <th>التسجيل</th>
                    <th>المحفظة</th>
                    <th>النقاط</th>
                    <th>تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((member) => (
                    <tr key={member._id}>
                      <td>{member.name || '-'}</td>
                      <td>{member.email || '-'}</td>
                      <td>{member.phone || '-'}</td>
                      <td>
                        <select value={member.role} onChange={(event) => changeUserRole(member, event.target.value)}>
                          <option value="admin">مدير</option>
                          <option value="user">عميل</option>
                          <option value="employee">موظف</option>
                        </select>
                      </td>
                      <td>
                        {member.role === 'employee'
                          ? (
                            <div className="admin-table-actions">
                              {permissionOptions.map((permission) => (
                                <label key={`${member._id}-${permission.key}`} className="admin-toggle-pill">
                                  <input type="checkbox" checked={member.permissions?.includes(permission.key)} onChange={() => toggleUserPermission(member, permission.key)} />
                                  {permission.label}
                                </label>
                              ))}
                            </div>
                            )
                          : '-'}
                      </td>
                      <td>{member.hasManualPassword ? 'يدوي' : member.googleId ? 'Google' : '-'}</td>
                      <td>{Number(member.walletBalance || 0)} ج.م</td>
                      <td>{Number(member.loyaltyPoints || 0)} نقطة</td>
                      <td>{new Date(member.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {productQrPreview.open && productQrPreview.product ? (
        <div className="barcode-scanner-overlay" onClick={closeProductQrPreview}>
          <div className="barcode-scanner-modal product-qr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="barcode-scanner-head">
              <div>
                <strong>QR المنتج</strong>
                <span>{productQrPreview.product.name}</span>
              </div>
              <button type="button" className="barcode-scanner-close" onClick={closeProductQrPreview} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="product-qr-modal-card">
              <div className="product-qr-modal-image">
                {productQrPreview.image ? <img src={productQrPreview.image} alt={`QR ${productQrPreview.product.barcode}`} /> : <div className="admin-product-qr-empty">QR</div>}
              </div>
              <strong>{productQrPreview.product.name}</strong>
              <span>{productQrPreview.product.category || '-'}</span>
              <code>{productQrPreview.product.barcode}</code>
            </div>

            <div className="product-qr-modal-actions">
              <button type="button" className="primary-btn" onClick={() => printProductQr(productQrPreview.product)}>
                <Printer size={16} />
                <span>طباعة QR</span>
              </button>
              <button type="button" className="secondary-btn" onClick={closeProductQrPreview}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {qrScannerOpen ? (
        <div className="barcode-scanner-overlay" onClick={closeQrScanner}>
          <div className="barcode-scanner-modal" onClick={(event) => event.stopPropagation()}>
            <div className="barcode-scanner-head">
              <div>
                <strong>قراءة QR بالكاميرا</strong>
                <span>{qrScannerStatus || 'جارٍ تجهيز الكاميرا...'}</span>
              </div>
              <button type="button" className="barcode-scanner-close" onClick={closeQrScanner} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="barcode-scanner-frame">
              <video ref={qrVideoRef} className="barcode-scanner-video" playsInline muted autoPlay />
              <div className="barcode-scanner-target" />
            </div>

            {!qrScannerStarting ? (
              <button type="button" className="primary-btn barcode-scanner-allow" onClick={requestQrScanner}>
                السماح بالكاميرا
              </button>
            ) : null}

            <button type="button" className="secondary-btn barcode-scanner-cancel" onClick={closeQrScanner}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

