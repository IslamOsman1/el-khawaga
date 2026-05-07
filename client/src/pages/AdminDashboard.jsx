import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
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
  Tag,
  Truck,
  Undo2,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  unit: 'Ù‚Ø·Ø¹Ø©',
  countInStock: '',
  featured: false,
  inAgencyCollection: false,
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
    privacy: { title: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©', description: '', sections: [{ title: '', body: '' }] },
    terms: { title: 'Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…', description: '', sections: [{ title: '', body: '' }] },
    shipping: { title: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„ØªÙˆØµÙŠÙ„', description: '', sections: [{ title: '', body: '' }] },
    refund: { title: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ÙˆØ§Ù„Ø§Ø³ØªØ¨Ø¯Ø§Ù„', description: '', sections: [{ title: '', body: '' }] }
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
  { id: 'products', label: 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', icon: Package },
  { id: 'categories', label: 'Ø§Ù„ÙØ¦Ø§Øª ÙˆØ§Ù„Ø£Ù‚Ø³Ø§Ù…', icon: FolderTree },
  { id: 'store', label: 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±', icon: Store },
  { id: 'checkout', label: 'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨', icon: MapPin },
  { id: 'content', label: 'Ø§Ù„Ù…Ø­ØªÙˆÙ‰ ÙˆØ§Ù„Ø¨Ù†Ø±Ø§Øª', icon: Palette },
  { id: 'policies', label: 'Ø§Ù„Ø³ÙŠØ§Ø³Ø§Øª', icon: ShieldCheck },
  { id: 'payments', label: 'Ø§Ù„Ø¯ÙØ¹ ÙˆØ§Ù„ØªÙƒØ§Ù…Ù„', icon: CreditCard },
  { id: 'loyalty', label: 'Ø§Ù„Ù†Ù‚Ø§Ø· ÙˆØ£ÙƒÙˆØ§Ø¯ Ø§Ù„Ø®ØµÙ…', icon: Gift },
  { id: 'orders', label: 'Ø§Ù„Ø·Ù„Ø¨Ø§Øª', icon: ShoppingBag },
  { id: 'support', label: 'Ø§Ù„Ø¯Ø¹Ù…', icon: MessageCircle },
  { id: 'users', label: 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†', icon: Users }
];

const permissionOptions = [
  { key: 'manage_products', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª' },
  { key: 'manage_orders', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø·Ù„Ø¨Ø§Øª' },
  { key: 'manage_support', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¯Ø¹Ù…' }
];

const policyDefinitions = [
  { key: 'privacy', label: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©', icon: ShieldCheck },
  { key: 'terms', label: 'Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…', icon: FileText },
  { key: 'shipping', label: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„ØªÙˆØµÙŠÙ„', icon: Truck },
  { key: 'refund', label: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ÙˆØ§Ù„Ø§Ø³ØªØ¨Ø¯Ø§Ù„', icon: Undo2 }
];

const orderStatuses = ['Ø¬Ø¯ÙŠØ¯', 'Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²', 'ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚', 'ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ…', 'Ù…Ù„ØºÙŠ'];

const normalizeText = (value) => String(value || '').toLowerCase();

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

function SaveSectionButton({ saving, label }) {
  return (
    <button className="primary-btn admin-inline-save-btn" type="submit" disabled={saving}>
      <Save size={16} />
      <span>{saving ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸...' : label}</span>
    </button>
  );
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportConversations, setSupportConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState(null);
  const [uploadingFeaturedCategoryIndex, setUploadingFeaturedCategoryIndex] = useState(null);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState({});
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerms, setSearchTerms] = useState({
    products: '',
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

  const visibleDashboardSections = useMemo(
    () => isEmployee
      ? dashboardSections.filter((section) =>
        (section.id === 'products' && user?.permissions?.includes('manage_products')) ||
        (section.id === 'categories' && user?.permissions?.includes('manage_products')) ||
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
    openOrders: orders.filter((order) => order.status !== 'ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ…' && order.status !== 'Ù…Ù„ØºÙŠ').length,
    totalProducts: products.length,
    totalUsers: users.length
  }), [orders, products, users]);

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

  const totalSupportUnread = useMemo(
    () => supportConversations.reduce((sum, conversation) => sum + Number(conversation.supportUnreadCount || 0), 0),
    [supportConversations]
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
    load().catch(() => toast.error('ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…'));
  }, [isEmployee, canManageSupport]);

  const loadSupportInbox = async () => {
    if (!canManageSupport) return;
    const { data } = await api.get('/support/inbox');
    setSupportConversations(data || []);
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

      toast.success(editing ? 'ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬' : 'ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ù†ØªØ¬');
      setProductForm(emptyProduct);
      setImage(null);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ù…Ù†ØªØ¬');
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
    if (!window.confirm('Ø­Ø°Ù Ø§Ù„Ù…Ù†ØªØ¬ØŸ')) return;
    const deletePassword = await requestDeletePassword();
    if (deletePassword === null) return;
    await api.delete(`/products/${id}`, { data: { deletePassword } });
    toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ù†ØªØ¬');
    load();
  };

  const changeStatus = async (id, status) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  const changeUserRole = async (member, role) => {
    if (member.role === role) return;

    const roleLabel = role === 'admin' ? 'Ù…Ø¯ÙŠØ±' : role === 'employee' ? 'Ù…ÙˆØ¸Ù' : 'Ø¹Ù…ÙŠÙ„';
    const confirmed = window.confirm(`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ØªØºÙŠÙŠØ± Ù†ÙˆØ¹ Ø­Ø³Ø§Ø¨ ${member.name || member.email} Ø¥Ù„Ù‰ ${roleLabel}ØŸ`);
    if (!confirmed) return;

    try {
      const nextPermissions = role === 'employee' ? (member.permissions?.length ? member.permissions : ['manage_orders']) : [];
      await api.put(`/users/${member._id}/role`, { role, permissions: nextPermissions });
      toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨');
    }
  };

  const toggleUserPermission = async (targetUser, permission) => {
    const currentPermissions = Array.isArray(targetUser.permissions) ? targetUser.permissions : [];
    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];

    const permissionLabel = permissionOptions.find((item) => item.key === permission)?.label || permission;
    const confirmed = window.confirm(`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ${currentPermissions.includes(permission) ? 'Ø¥Ø²Ø§Ù„Ø©' : 'Ù…Ù†Ø­'} ØµÙ„Ø§Ø­ÙŠØ© ${permissionLabel} Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… ${targetUser.name || targetUser.email}ØŸ`);
    if (!confirmed) return;

    try {
      await api.put(`/users/${targetUser._id}/role`, {
        role: targetUser.role,
        permissions: nextPermissions
      });
      toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª');
    }
  };

  const sendSupportReply = async (conversationId) => {
    const text = String(supportReplyDrafts[conversationId] || '').trim();
    if (!text) return;

    try {
      await api.post(`/support/${conversationId}/reply`, { text });
      toast.success('ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø¯');
      setSupportReplyDrafts((current) => ({ ...current, [conversationId]: '' }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ØªØ¹Ø°Ø± Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø¯');
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
      toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©');
    } catch (error) {
      toast.error(error.response?.data?.message || 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©');
    }
  };

  const toggleSupportConversationStatus = async (conversation) => {
    const nextStatus = conversation.status === 'closed' ? 'open' : 'closed';

    try {
      const { data } = await api.put(`/support/${conversation._id}/status`, { status: nextStatus });
      setSupportConversations((current) => current.map((item) => item._id === conversation._id ? data : item));
      toast.success(nextStatus === 'closed' ? 'ØªÙ… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©' : 'ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©');
    } catch (error) {
      toast.error(error.response?.data?.message || 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©');
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
      toast.error('ÙØ¹Ù‘Ù„ ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø°Ù Ø£ÙˆÙ„Ù‹Ø§ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±');
      return null;
    }

    const password = window.prompt('Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù');
    if (!password) return null;

    try {
      await api.post('/settings/admin/verify-delete-password', { password });
      return password;
    } catch (error) {
      toast.error(error.response?.data?.message || 'ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø°Ù ØºÙŠØ± ØµØ­ÙŠØ­Ø©');
      return null;
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      if (isEmployee) {
        await api.put('/settings/admin/categories', { categoryGroups: settingsForm.categoryGroups });
      } else {
        await api.put('/settings/admin', settingsForm);
        await refresh();
      }
      toast.success('ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª');
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
      toast.success('ØªÙ… Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„Ø¨Ù†Ø±');
    } catch (error) {
      toast.error(error.response?.data?.message || 'ÙØ´Ù„ Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„Ø¨Ù†Ø±');
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
      toast.success('ØªÙ… Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ù…ÙŠØ²Ø©');
    } catch (error) {
      toast.error(error.response?.data?.message || 'ÙØ´Ù„ Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ù…ÙŠØ²Ø©');
    } finally {
      setUploadingFeaturedCategoryIndex(null);
    }
  };

  const sectionClass = (id) => `dashboard-tab-btn${activeSection === id ? ' active' : ''}`;

  return (
    <main className="container page admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div className="admin-hero-copy">
          <span className="market-pill">Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…</span>
          <h1>Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ØªØ¬Ø± Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯</h1>
          <p>ØªØ­ÙƒÙ… ÙÙŠ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„ÙØ¦Ø§Øª ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰ ÙˆØ§Ù„Ø·Ù„Ø¨Ø§Øª ÙˆØ§Ù„Ø¯ÙØ¹ ÙˆØ§Ù„Ø¯Ø¹Ù… Ù…Ù† ÙˆØ§Ø¬Ù‡Ø© Ø£ÙˆØ¶Ø­ ÙˆØ£Ø³Ù‡Ù„ ÙÙŠ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù….</p>
        </div>
        <div className="admin-hero-stats">
          <StatCard label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø¨Ø§Øª" value={stats.totalOrders} />
          <StatCard label="Ø·Ù„Ø¨Ø§Øª Ù…Ø¯ÙÙˆØ¹Ø©" value={stats.paidOrders} />
          <StatCard label="Ø·Ù„Ø¨Ø§Øª Ù…ÙØªÙˆØ­Ø©" value={stats.openOrders} />
          <StatCard label="Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" value={stats.totalProducts} />
          <StatCard label="Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†" value={stats.totalUsers} />
        </div>
      </section>

      <nav className="admin-dashboard-tabs">
        {visibleDashboardSections.map((section) => {
          const Icon = section.icon;
          return (
            <button key={section.id} type="button" className={sectionClass(section.id)} onClick={() => setActiveSection(section.id)}>
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
              <h2>{editing ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…Ù†ØªØ¬' : 'Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯'}</h2>
              <p>Ø£Ù†Ø´Ø¦ Ù…Ù†ØªØ¬Ù‹Ø§ Ø¬Ø¯ÙŠØ¯Ù‹Ø§ Ø£Ùˆ Ø¹Ø¯Ù‘Ù„ Ø§Ù„Ù…Ù†ØªØ¬ Ø§Ù„Ø­Ø§Ù„ÙŠ Ù…Ø¹ Ø±Ø¨Ø·Ù‡ Ø¨Ø§Ù„ÙØ¦Ø© ÙˆØ§Ù„Ù‚Ø³Ù… Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ÙŠÙ†.</p>
            </div>
          </div>
          <SearchBox value={searchTerms.products} onChange={(event) => changeSearch('products', event.target.value)} placeholder="ابحث عن منتج بالاسم أو الباركود أو الفئة..." />

          <form onSubmit={submitProduct} className="admin-dashboard-form">
            <div className="admin-dashboard-form-grid">
              <Field label="Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬"><input name="name" value={productForm.name} onChange={changeProduct} placeholder="Ù…Ø«Ø§Ù„: Ø¬Ø¨Ù†Ø© Ù‚Ø±ÙŠØ´" required /></Field>
              <Field label="Ø§Ù„ÙˆØµÙ"><input name="description" value={productForm.description} onChange={changeProduct} placeholder="ÙˆØµÙ Ù…Ø®ØªØµØ±" /></Field>
              <Field label="Ø§Ù„Ø³Ø¹Ø±"><input name="price" value={productForm.price} onChange={changeProduct} type="number" placeholder="0" required /></Field>
              <Field label="Ø§Ù„Ø³Ø¹Ø± Ù‚Ø¨Ù„ Ø§Ù„Ø®ØµÙ…"><input name="oldPrice" value={productForm.oldPrice} onChange={changeProduct} type="number" placeholder="0" /></Field>
              <Field label="Ø§Ù„ÙØ¦Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©">
                <select name="category" value={productForm.category} onChange={changeProduct} required>
                  <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ¦Ø©</option>
                  {sourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Ø§Ù„Ù‚Ø³Ù… Ø§Ù„ÙØ±Ø¹ÙŠ">
                <select name="subcategory" value={productForm.subcategory} onChange={changeProduct}>
                  <option value="">Ø¨Ø¯ÙˆÙ† Ù‚Ø³Ù… ÙØ±Ø¹ÙŠ</option>
                  {availableSections.map((section) => <option key={section.title} value={section.title}>{section.title}</option>)}
                </select>
              </Field>
              <Field label="الباركود"><input name="barcode" value={productForm.barcode} onChange={changeProduct} placeholder="مثال: 6221234567890" inputMode="numeric" /></Field>

              <Field label="Ø§Ù„ÙˆØ­Ø¯Ø©"><input name="unit" value={productForm.unit} onChange={changeProduct} placeholder="Ù‚Ø·Ø¹Ø© / ÙƒØ¬Ù… / Ø¹Ø¨ÙˆØ©" /></Field>
              <Field label="Ø§Ù„Ù…Ø®Ø²ÙˆÙ†"><input name="countInStock" value={productForm.countInStock} onChange={changeProduct} type="number" placeholder="0" /></Field>
              <Field label="ØµÙˆØ±Ø© Ø§Ù„Ù…Ù†ØªØ¬"><input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></Field>
            </div>

            <div className="admin-checkbox-row">
              <label className="admin-toggle-pill"><input type="checkbox" name="featured" checked={productForm.featured} onChange={changeProduct} /> Ù…Ù†ØªØ¬ Ù…Ù…ÙŠØ²</label>
              <label className="admin-toggle-pill"><input type="checkbox" name="isDeal" checked={productForm.isDeal} onChange={changeProduct} /> Ø¶Ù…Ù† Ø§Ù„Ø¹Ø±ÙˆØ¶</label>
              <label className="admin-toggle-pill"><input type="checkbox" name="inAgencyCollection" checked={productForm.inAgencyCollection} onChange={changeProduct} /> Ø£Ø¶Ù Ø¥Ù„Ù‰ Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„ÙˆÙƒØ§Ù„Ø©</label>
            </div>

            <button className="primary-btn admin-submit-btn" type="submit">
              <Save size={16} />
              <span>{editing ? 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ù†ØªØ¬'}</span>
            </button>
          </form>

          <div className="admin-table-card">
            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ø§Ù„Ù…Ù†ØªØ¬</th>
                    <th>Ø§Ù„ÙØ¦Ø©</th>
                    <th>Ø§Ù„Ù‚Ø³Ù…</th>
                    <th>الباركود</th>
                    <th>Ø§Ù„Ø³Ø¹Ø±</th>
                    <th>Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</th>
                    <th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                          <button type="button" className="table-action-btn edit" onClick={() => editProduct(product)}>ØªØ¹Ø¯ÙŠÙ„</button>
                          <button type="button" className="table-action-btn danger" onClick={() => removeProduct(product._id)}>Ø­Ø°Ù</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'categories' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙØ¦Ø§Øª ÙˆØ§Ù„Ø£Ù‚Ø³Ø§Ù…</h2>
              <p>Ø£Ù†Ø´Ø¦ Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© ÙˆØ§Ù„Ø£Ù‚Ø³Ø§Ù… Ø§Ù„ÙØ±Ø¹ÙŠØ© Ø§Ù„ØªÙŠ ÙŠØ±ØªØ¨Ø· Ø¨Ù‡Ø§ Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙˆÙ‚Ø¹ ÙˆØ§Ù„Ù…Ù†ØªØ¬Ø§Øª.</p>
            </div>
            <FolderTree size={18} />
          </div>
          <SearchBox value={searchTerms.categories} onChange={(event) => changeSearch('categories', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† ÙØ¦Ø© Ø£Ùˆ Ù‚Ø³Ù…..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-category-groups-stack">
              <button type="button" className="table-action-btn edit" onClick={addCategoryGroup}>Ø¥Ø¶Ø§ÙØ© ÙØ¦Ø© Ø±Ø¦ÙŠØ³ÙŠØ©</button>
              {filteredCategoryGroups.map(({ group, index }) => (
                <article key={`group-${index}`} className="admin-setting-card">
                  <div className="admin-category-inventory">
                    <div className="admin-category-inventory-head">
                      <div>
                        <strong>{group.title || `ÙØ¦Ø© Ø±Ø¦ÙŠØ³ÙŠØ© ${index + 1}`}</strong>
                        <span>{group.subtitle || 'Ø£Ø¶Ù ÙˆØµÙÙ‹Ø§ Ù…Ø®ØªØµØ±Ù‹Ø§ Ù„Ù‡Ø°Ù‡ Ø§Ù„ÙØ¦Ø© Ù„ÙŠØ³Ù‡Ù„ ØªÙ…ÙŠÙŠØ²Ù‡Ø§ Ø¯Ø§Ø®Ù„ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….'}</span>
                      </div>
                      <b>{(group.sections || []).filter((section) => section?.title).length} Ù‚Ø³Ù…</b>
                    </div>
                    {(group.sections || []).length ? (
                      <div className="admin-category-inventory-list">
                        {(group.sections || []).map((section, sectionIndex) => (
                          <div key={`inventory-${index}-${sectionIndex}`} className="admin-category-chip">
                            <strong>{section.title || `Ù‚Ø³Ù… ${sectionIndex + 1}`}</strong>
                            <span>{section.sourceCategory || group.title || 'Ø¨Ø¯ÙˆÙ† ÙØ¦Ø© Ù…ØµØ¯Ø±'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù‚Ø³Ø§Ù… Ø¨Ø¹Ø¯. Ø£Ø¶Ù Ø£ÙˆÙ„ Ù‚Ø³Ù… ÙˆØ³ÙŠØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙƒØ¬Ø±Ø¯ Ø³Ø±ÙŠØ¹.</p>
                    )}
                  </div>
                  <div className="admin-dashboard-form-grid two-cols">
                    <Field label="Ø§Ø³Ù… Ø§Ù„ÙØ¦Ø©"><input value={group.title} onChange={(event) => changeSettingsField(['categoryGroups', index, 'title'], event.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„ÙØ¦Ø©" /></Field>
                    <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ±"><input value={group.subtitle} onChange={(event) => changeSettingsField(['categoryGroups', index, 'subtitle'], event.target.value)} placeholder="ÙˆØµÙ Ù…Ø®ØªØµØ±" /></Field>
                  </div>
                  <div className="admin-subsections-stack">
                    {(group.sections || []).map((section, sectionIndex) => (
                      <div key={`section-${index}-${sectionIndex}`} className="admin-subsection-card">
                        <Field label="Ø§Ø³Ù… Ø§Ù„Ù‚Ø³Ù…"><input value={section.title} onChange={(event) => changeSettingsField(['categoryGroups', index, 'sections', sectionIndex, 'title'], event.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„Ù‚Ø³Ù…" /></Field>
                        <Field label="Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…ØµØ¯Ø±">
                          <input value={section.sourceCategory} onChange={(event) => changeSettingsField(['categoryGroups', index, 'sections', sectionIndex, 'sourceCategory'], event.target.value)} placeholder="Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…ØµØ¯Ø±" />
                        </Field>
                        <button type="button" className="table-action-btn danger" onClick={() => removeSectionFromGroup(index, sectionIndex)}>Ø­Ø°Ù Ø§Ù„Ù‚Ø³Ù…</button>
                      </div>
                    ))}
                  </div>
                  <div className="admin-table-actions">
                    <button type="button" className="table-action-btn edit" onClick={() => addSectionToGroup(index)}>Ø¥Ø¶Ø§ÙØ© Ù‚Ø³Ù…</button>
                    <button type="button" className="table-action-btn danger" onClick={() => removeCategoryGroup(index)}>Ø­Ø°Ù Ø§Ù„ÙØ¦Ø©</button>
                  </div>
                  <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø§Ù„ÙØ¦Ø© ÙˆØ§Ù„Ø£Ù‚Ø³Ø§Ù…" />
                </article>
              ))}
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'store' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±</h2>
              <p>Ø­Ø¯Ù‘Ø« Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ¬Ø± Ø§Ù„Ø¹Ø§Ù…Ø© ÙˆØ¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„ØªÙˆØ§ØµÙ„.</p>
            </div>
            <Store size={18} />
          </div>
          <SearchBox value={searchTerms.store} onChange={(event) => changeSearch('store', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¯Ø§Ø®Ù„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Store size={18} /><strong>Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="Ø§Ø³Ù… Ø§Ù„Ù…ØªØ¬Ø±"><input value={settingsForm.storeName} onChange={(event) => changeSettingsField(['storeName'], event.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„Ù…ØªØ¬Ø±" /></Field>
                  <Field label="Ø§Ù„ÙˆØµÙ Ø§Ù„Ù…Ø®ØªØµØ±"><input value={settingsForm.storeTagline} onChange={(event) => changeSettingsField(['storeTagline'], event.target.value)} placeholder="ÙˆØµÙ Ù…Ø®ØªØµØ±" /></Field>
                  <Field label="Ø±Ù‚Ù… Ø§Ù„Ø¯Ø¹Ù…"><input value={settingsForm.supportPhone} onChange={(event) => changeSettingsField(['supportPhone'], event.target.value)} placeholder="Ø±Ù‚Ù… Ø§Ù„Ø¯Ø¹Ù…" /></Field>
                  <Field label="Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¯Ø¹Ù…"><input value={settingsForm.supportEmail} onChange={(event) => changeSettingsField(['supportEmail'], event.target.value)} placeholder="Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ" /></Field>
                  <Field label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†"><input value={settingsForm.address} onChange={(event) => changeSettingsField(['address'], event.target.value)} placeholder="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" /></Field>
                  <Field label="Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„"><input value={settingsForm.workingHours} onChange={(event) => changeSettingsField(['workingHours'], event.target.value)} placeholder="Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„" /></Field>
                  <Field label="ÙˆØ§ØªØ³Ø§Ø¨"><input value={settingsForm.whatsapp} onChange={(event) => changeSettingsField(['whatsapp'], event.target.value)} placeholder="Ø±Ù‚Ù… ÙˆØ§ØªØ³Ø§Ø¨" /></Field>
                  <Field label="Ø±Ø§Ø¨Ø· ÙÙŠØ³ Ø¨ÙˆÙƒ"><input value={settingsForm.facebookUrl} onChange={(event) => changeSettingsField(['facebookUrl'], event.target.value)} placeholder="https://facebook.com/your-page" /></Field>
                  <Field label="Ø±Ø§Ø¨Ø· Ø¥Ù†Ø³ØªØ¬Ø±Ø§Ù…"><input value={settingsForm.instagramUrl} onChange={(event) => changeSettingsField(['instagramUrl'], event.target.value)} placeholder="https://instagram.com/your-page" /></Field>
                </div>
                <div className="admin-category-inventory">
                  <div className="admin-category-inventory-head">
                    <div>
                      <strong>Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø­Ø°Ù</strong>
                      <span>Ø§Ø¶Ø¨Ø· ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø®Ø§ØµØ© Ù„ØªØ£ÙƒÙŠØ¯ Ø£ÙŠ Ø¹Ù…Ù„ÙŠØ© Ø­Ø°Ù Ø¯Ø§Ø®Ù„ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….</span>
                    </div>
                    <b>{settingsForm.adminControls?.hasDeletePassword ? 'Ù…ÙØ¹Ù„Ø©' : 'Ø¨Ø¯ÙˆÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ±'}</b>
                  </div>
                  <div className="admin-dashboard-form-grid two-cols">
                    <Field label="ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø°Ù Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©">
                      <input
                        type="password"
                        value={settingsForm.adminControls?.deletePassword || ''}
                        onChange={(event) => changeSettingsField(['adminControls', 'deletePassword'], event.target.value)}
                        placeholder="Ø§ØªØ±ÙƒÙ‡Ø§ ÙØ§Ø±ØºØ© Ø¥Ø°Ø§ Ù„Ø§ ØªØ±ÙŠØ¯ Ø§Ù„ØªØºÙŠÙŠØ±"
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
                      ØªÙØ¹ÙŠÙ„ Ø·Ù„Ø¨ ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ù‚Ø¨Ù„ Ø§Ù„Ø­Ø°Ù
                    </label>
                  </div>
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'checkout' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨</h2>
              <p>ØªØ­ÙƒÙ… ÙÙŠ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙˆØ±Ù… Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø·Ù„Ø¨ ÙˆØ§Ù„Ù…Ø­Ø§ÙØ¸Ø§Øª ÙˆØ§Ù„Ù…Ø¯Ù† Ø§Ù„Ù…ØªØ§Ø­Ø© Ù„Ù„Ø¹Ù…ÙŠÙ„ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø´Ø±Ø§Ø¡.</p>
            </div>
            <MapPin size={18} />
          </div>
          <SearchBox value={searchTerms.checkout} onChange={(event) => changeSearch('checkout', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø­Ø§ÙØ¸Ø© Ø£Ùˆ Ù…Ø¯ÙŠÙ†Ø©..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„Ù†Ù…ÙˆØ°Ø¬</strong></div>
                <div className="admin-dashboard-form-grid two-cols">
                  <Field label="Ø±Ø³ÙˆÙ… Ø§Ù„Ø´Ø­Ù†"><input type="number" value={settingsForm.checkout.shippingFee} onChange={(event) => changeSettingsField(['checkout', 'shippingFee'], Number(event.target.value))} placeholder="0" /></Field>
                  <Field label="Ø­Ø¯ Ø§Ù„Ø´Ø­Ù† Ø§Ù„Ù…Ø¬Ø§Ù†ÙŠ"><input type="number" value={settingsForm.checkout.freeShippingThreshold} onChange={(event) => changeSettingsField(['checkout', 'freeShippingThreshold'], Number(event.target.value))} placeholder="0" /></Field>
                </div>
                <div className="admin-toggle-row">
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.checkout.notesEnabled} onChange={(event) => changeSettingsField(['checkout', 'notesEnabled'], event.target.checked)} /> Ø¥Ø¸Ù‡Ø§Ø± Ø­Ù‚Ù„ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label>
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.checkout.notesRequired} onChange={(event) => changeSettingsField(['checkout', 'notesRequired'], event.target.checked)} disabled={!settingsForm.checkout.notesEnabled} /> Ø¬Ø¹Ù„ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù…Ø·Ù„ÙˆØ¨Ø©</label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø·Ù„Ø¨" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><FolderTree size={18} /><strong>Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø§Øª ÙˆØ§Ù„Ù…Ø¯Ù† Ø§Ù„Ù…ØªØ§Ø­Ø©</strong></div>
                <div className="admin-category-groups-stack">
                  <button type="button" className="table-action-btn edit" onClick={addGovernorate}>Ø¥Ø¶Ø§ÙØ© Ù…Ø­Ø§ÙØ¸Ø©</button>
                  {filteredCheckoutGovernorates.map(({ governorate, index }) => (
                    <article key={`governorate-${index}`} className="admin-setting-card nested">
                      <div className="admin-category-inventory">
                        <div className="admin-category-inventory-head">
                          <div>
                            <strong>{governorate.name || `Ù…Ø­Ø§ÙØ¸Ø© ${index + 1}`}</strong>
                            <span>{Number(governorate.shippingFee ?? settingsForm.checkout.shippingFee)} Ø¬.Ù… Ø±Ø³ÙˆÙ… Ø´Ø­Ù† Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©</span>
                          </div>
                          <b>{(governorate.cities || []).filter(Boolean).length} Ù…Ø¯ÙŠÙ†Ø©</b>
                        </div>
                        {(governorate.cities || []).length ? (
                          <div className="admin-category-inventory-list">
                            {(governorate.cities || []).map((city, cityIndex) => (
                              <div key={`governorate-inventory-${index}-${cityIndex}`} className="admin-category-chip">
                                <strong>{city || `Ù…Ø¯ÙŠÙ†Ø© ${cityIndex + 1}`}</strong>
                                <span>{governorate.name || 'Ù…Ø­Ø§ÙØ¸Ø© Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¯Ù† Ø¨Ø¹Ø¯. Ø£Ø¶Ù Ø£ÙˆÙ„ Ù…Ø¯ÙŠÙ†Ø© ÙˆØ³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙƒØ¬Ø±Ø¯ Ø³Ø±ÙŠØ¹.</p>
                        )}
                      </div>
                      <div className="admin-dashboard-form-grid two-cols">
                        <Field label="Ø§Ø³Ù… Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©">
                          <input
                            value={governorate.name}
                            onChange={(event) => changeSettingsField(['checkout', 'governorates', index, 'name'], event.target.value)}
                            placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©"
                          />
                        </Field>
                        <Field label="Ø±Ø³ÙˆÙ… Ø´Ø­Ù† Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©">
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
                            <Field label="Ø§Ø³Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©">
                              <input
                                value={city}
                                onChange={(event) => changeSettingsField(['checkout', 'governorates', index, 'cities', cityIndex], event.target.value)}
                                placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©"
                              />
                            </Field>
                            <button type="button" className="table-action-btn danger" onClick={() => removeCityFromGovernorate(index, cityIndex)}>Ø­Ø°Ù Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</button>
                          </div>
                        ))}
                      </div>
                      <div className="admin-table-actions">
                        <button type="button" className="table-action-btn edit" onClick={() => addCityToGovernorate(index)}>Ø¥Ø¶Ø§ÙØ© Ù…Ø¯ÙŠÙ†Ø©</button>
                        <button type="button" className="table-action-btn danger" onClick={() => removeGovernorate(index)}>Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©</button>
                      </div>
                      <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø© ÙˆØ§Ù„Ù…Ø¯Ù†" />
                    </article>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø§Øª" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'content' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø§Ù„Ù…Ø­ØªÙˆÙ‰ ÙˆØ§Ù„Ø¨Ù†Ø±Ø§Øª</h2>
              <p>ØªØ­ÙƒÙ… ÙÙŠ ØµÙØ­Ø© Ù…Ù† Ù†Ø­Ù† ÙˆØ§Ù„Ø¨Ù†Ø±Ø§Øª ÙˆØ§Ù„ÙØ¦Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø© ÙÙŠ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©.</p>
            </div>
            <Palette size={18} />
          </div>
          <SearchBox value={searchTerms.content} onChange={(event) => changeSearch('content', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ø¨Ø§Ù†Ø± Ø£Ùˆ ÙØ¦Ø© Ù…Ù…ÙŠØ²Ø©..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>ØµÙØ­Ø© Ù…Ù† Ù†Ø­Ù†</strong></div>
                <div className="admin-text-grid enhanced">
                  <Field label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†"><textarea value={settingsForm.about.title} onChange={(event) => changeSettingsField(['about', 'title'], event.target.value)} /></Field>
                  <Field label="Ø§Ù„ÙˆØµÙ"><textarea value={settingsForm.about.description} onChange={(event) => changeSettingsField(['about', 'description'], event.target.value)} /></Field>
                  <Field label="Ø§Ù„Ø±Ø¤ÙŠØ©"><textarea value={settingsForm.about.vision} onChange={(event) => changeSettingsField(['about', 'vision'], event.target.value)} /></Field>
                  <Field label="Ø§Ù„Ø±Ø³Ø§Ù„Ø©"><textarea value={settingsForm.about.mission} onChange={(event) => changeSettingsField(['about', 'mission'], event.target.value)} /></Field>
                  <Field label="Ø§Ù„Ù‚ÙŠÙ…"><textarea value={settingsForm.about.values} onChange={(event) => changeSettingsField(['about', 'values'], event.target.value)} /></Field>
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ ØµÙØ­Ø© Ù…Ù† Ù†Ø­Ù†" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Palette size={18} /><strong>Ø¨Ù†Ø±Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©</strong></div>
                <div className="admin-slides-grid enhanced">
                  {filteredHeroSlides.map(({ slide, index }) => (
                    <div key={`slide-${index}`} className="admin-slide-card refined">
                      <strong>Ø¨Ø§Ù†Ø± {index + 1}</strong>
                      <Field label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†"><input value={slide.title} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'title'], event.target.value)} /></Field>
                      <Field label="Ø´Ø§Ø±Ø© ØµØºÙŠØ±Ø©"><input value={slide.tag} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'tag'], event.target.value)} /></Field>
                      <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ±"><input value={slide.note} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'note'], event.target.value)} /></Field>
                      <Field label="Ø±Ø§Ø¨Ø· Ø§Ù„ØµÙˆØ±Ø©"><input value={slide.image} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'image'], event.target.value)} /></Field>
                      <Field label="Ø±Ø§Ø¨Ø· Ø¹Ù†Ø¯ Ø§Ù„Ø¶ØºØ·"><input value={slide.link || ''} onChange={(event) => changeSettingsField(['home', 'heroSlides', index, 'link'], event.target.value)} /></Field>
                      <label className="admin-file-pill admin-banner-upload">
                        <input type="file" accept="image/*" onChange={(event) => uploadBanner(index, event.target.files?.[0] || null)} />
                        <span>{uploadingBannerIndex === index ? 'Ø¬Ø§Ø±Ù Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©...' : 'Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„Ø¨Ù†Ø±'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø§Ù„Ø¨Ù†Ø±Ø§Øª" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><FolderTree size={18} /><strong>Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø©</strong></div>
                <div className="admin-slides-grid enhanced">
                  {filteredFeaturedCategories.map(({ item, index }) => (
                    <div key={`featured-${index}`} className="admin-slide-card refined">
                      <strong>ÙØ¦Ø© Ù…Ù…ÙŠØ²Ø© {index + 1}</strong>
                      <Field label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†"><input value={item.title} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'title'], event.target.value)} /></Field>
                      <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ±"><input value={item.subtitle} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'subtitle'], event.target.value)} /></Field>
                      <Field label="Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø©">
                        <select value={item.category} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'category'], event.target.value)}>
                          <option value="">Ø§Ø®ØªØ± ÙØ¦Ø©</option>
                          {sourceCategories.map((category) => <option key={`featured-${category}`} value={category}>{category}</option>)}
                        </select>
                      </Field>
                      <Field label="Ø±Ø§Ø¨Ø· Ø§Ù„ØµÙˆØ±Ø©"><input value={item.image} onChange={(event) => changeSettingsField(['home', 'featuredCategories', index, 'image'], event.target.value)} /></Field>
                      <label className="admin-file-pill admin-banner-upload">
                        <input type="file" accept="image/*" onChange={(event) => uploadFeaturedCategoryImage(index, event.target.files?.[0] || null)} />
                        <span>{uploadingFeaturedCategoryIndex === index ? 'Ø¬Ø§Ø±Ù Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©...' : 'Ø±ÙØ¹ ØµÙˆØ±Ø© Ø§Ù„ÙØ¦Ø©'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø§Ù„ÙØ¦Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø©" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'policies' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø§Ù„Ø³ÙŠØ§Ø³Ø§Øª</h2>
              <p>ØªØ­ÙƒÙ… ÙÙŠ ØµÙØ­Ø§Øª Ø§Ù„Ø®ØµÙˆØµÙŠØ© ÙˆØ§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø´Ø­Ù† ÙˆØ§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯.</p>
            </div>
            <ShieldCheck size={18} />
          </div>
          <SearchBox value={searchTerms.policies} onChange={(event) => changeSearch('policies', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¯Ø§Ø®Ù„ ØµÙØ­Ø§Øª Ø§Ù„Ø³ÙŠØ§Ø³Ø§Øª..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              {filteredPolicies.map(({ key, label, icon: Icon }) => {
                const policy = settingsForm.policies?.[key] || { title: '', description: '', sections: [{ title: '', body: '' }] };
                return (
                  <article key={key} className="admin-setting-card">
                    <div className="admin-setting-card-head"><Icon size={18} /><strong>{label}</strong></div>
                    <div className="admin-text-grid enhanced">
                      <Field label="Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØµÙØ­Ø©">
                        <input value={policy.title} onChange={(event) => changeSettingsField(['policies', key, 'title'], event.target.value)} />
                      </Field>
                      <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ±">
                        <textarea value={policy.description} onChange={(event) => changeSettingsField(['policies', key, 'description'], event.target.value)} />
                      </Field>
                    </div>

                    <div className="admin-category-inventory">
                      <div className="admin-category-inventory-head">
                        <strong>Ø¨Ù†ÙˆØ¯ Ø§Ù„ØµÙØ­Ø©</strong>
                        <button type="button" className="table-action-btn edit" onClick={() => addPolicySection(key)}>Ø¥Ø¶Ø§ÙØ© Ø¨Ù†Ø¯</button>
                      </div>

                      <div className="admin-slides-grid enhanced">
                        {(policy.sections || []).map((section, sectionIndex) => (
                          <div key={`${key}-section-${sectionIndex}`} className="admin-slide-card refined">
                            <strong>Ø¨Ù†Ø¯ {sectionIndex + 1}</strong>
                            <Field label="Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¨Ù†Ø¯">
                              <input
                                value={section.title}
                                onChange={(event) => changeSettingsField(['policies', key, 'sections', sectionIndex, 'title'], event.target.value)}
                              />
                            </Field>
                            <Field label="Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¨Ù†Ø¯">
                              <textarea
                                value={section.body}
                                onChange={(event) => changeSettingsField(['policies', key, 'sections', sectionIndex, 'body'], event.target.value)}
                              />
                            </Field>
                            <button type="button" className="table-action-btn danger" onClick={() => removePolicySection(key, sectionIndex)}>Ø­Ø°Ù Ø§Ù„Ø¨Ù†Ø¯</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <SaveSectionButton saving={settingsSaving} label={`Ø­ÙØ¸ ${label}`} />
                  </article>
                );
              })}
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'payments' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø§Ù„Ø¯ÙØ¹ ÙˆØ§Ù„ØªÙƒØ§Ù…Ù„</h2>
              <p>Ø§Ø¶Ø¨Ø· Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¯ÙØ¹ ÙˆØ±Ø³ÙˆÙ… Ø§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªÙØ¹ÙŠÙ„.</p>
            </div>
            <CreditCard size={18} />
          </div>
          <SearchBox value={searchTerms.payments} onChange={(event) => changeSearch('payments', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¯Ø§Ø®Ù„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¯ÙØ¹..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><CreditCard size={18} /><strong>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¯ÙØ¹</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="Ø§Ù„Ø¹Ù…Ù„Ø©"><input value={settingsForm.payment.currency} onChange={(event) => changeSettingsField(['payment', 'currency'], event.target.value)} placeholder="egp" /></Field>
                  <Field label="Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¯ÙØ¹"><input value={settingsForm.payment.onlineProvider} onChange={(event) => changeSettingsField(['payment', 'onlineProvider'], event.target.value)} placeholder="stripe" /></Field>
                  <Field label="Stripe Publishable Key"><input value={settingsForm.payment.stripePublishableKey} onChange={(event) => changeSettingsField(['payment', 'stripePublishableKey'], event.target.value)} /></Field>
                  <Field label="Stripe Secret Key"><input value={settingsForm.payment.stripeSecretKey} onChange={(event) => changeSettingsField(['payment', 'stripeSecretKey'], event.target.value)} /></Field>
                </div>
                <div className="admin-toggle-row">
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.cashOnDeliveryEnabled} onChange={(event) => changeSettingsField(['payment', 'cashOnDeliveryEnabled'], event.target.checked)} /> ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹ Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…</label>
                  <label className="admin-toggle-pill"><input type="checkbox" checked={settingsForm.payment.onlinePaymentEnabled} onChange={(event) => changeSettingsField(['payment', 'onlinePaymentEnabled'], event.target.checked)} /> ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹ Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†</label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¯ÙØ¹" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'loyalty' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø§Ù„Ù†Ù‚Ø§Ø· ÙˆØ£ÙƒÙˆØ§Ø¯ Ø§Ù„Ø®ØµÙ…</h2>
              <p>ØªØ­ÙƒÙ… ÙÙŠ Ù‚ÙŠÙ…Ø© Ù†Ù‚Ø§Ø· Ø§Ù„ÙˆÙ„Ø§Ø¡ØŒ Ù…Ø¹Ø¯Ù„ Ø§Ø­ØªØ³Ø§Ø¨Ù‡Ø§ØŒ ÙˆØ£Ù†Ø´Ø¦ Ø£ÙƒÙˆØ§Ø¯ Ø®ØµÙ… ÙØ¹Ø§Ù„Ø© Ù„Ù„Ù…ÙˆÙ‚Ø¹.</p>
            </div>
            <Gift size={18} />
          </div>
          <SearchBox value={searchTerms.loyalty} onChange={(event) => changeSearch('loyalty', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† ÙƒÙˆØ¯ Ø®ØµÙ… Ø£Ùˆ Ø¥Ø¹Ø¯Ø§Ø¯ Ù†Ù‚Ø§Ø·..." />
          <form className="admin-dashboard-form" onSubmit={saveSettings}>
            <div className="admin-settings-cluster">
              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Gift size={18} /><strong>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ù†Ù‚Ø§Ø· Ø§Ù„ÙˆÙ„Ø§Ø¡</strong></div>
                <div className="admin-dashboard-form-grid">
                  <Field label="ÙƒÙ„ ÙƒØ§Ù… Ø¬Ù†ÙŠÙ‡ = Ù†Ù‚Ø·Ø© ÙˆØ§Ø­Ø¯Ø©">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.loyalty.pointsPerPoint}
                      onChange={(event) => changeSettingsField(['loyalty', 'pointsPerPoint'], Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Ù‚ÙŠÙ…Ø© Ø§Ù„Ù†Ù‚Ø·Ø© Ø¨Ø§Ù„Ø¬Ù†ÙŠÙ‡">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settingsForm.loyalty.pointValue}
                      onChange={(event) => changeSettingsField(['loyalty', 'pointValue'], Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Ø£Ù‚Ù„ Ø¹Ø¯Ø¯ Ù†Ù‚Ø§Ø· Ù„Ù„Ø§Ø³ØªØ¨Ø¯Ø§Ù„">
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
                    ØªÙØ¹ÙŠÙ„ Ù†Ù‚Ø§Ø· Ø§Ù„ÙˆÙ„Ø§Ø¡
                  </label>
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ù‚Ø§Ø·" />
              </article>

              <article className="admin-setting-card">
                <div className="admin-setting-card-head"><Tag size={18} /><strong>Ø£ÙƒÙˆØ§Ø¯ Ø§Ù„Ø®ØµÙ…</strong></div>
                <button type="button" className="secondary-btn" onClick={addDiscountCode}>Ø¥Ø¶Ø§ÙØ© ÙƒÙˆØ¯ Ø®ØµÙ…</button>
                <div className="admin-slides-grid enhanced">
                  {filteredDiscountCodes.map(({ code, index }) => (
                    <div key={`discount-${index}`} className="admin-slide-card refined">
                      <strong>ÙƒÙˆØ¯ Ø®ØµÙ… {index + 1}</strong>
                      <Field label="Ø§Ù„ÙƒÙˆØ¯">
                        <input
                          value={code.code}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'code'], event.target.value.toUpperCase())}
                          placeholder="SAVE10"
                        />
                      </Field>
                      <Field label="Ù†ÙˆØ¹ Ø§Ù„Ø®ØµÙ…">
                        <select value={code.type} onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'type'], event.target.value)}>
                          <option value="fixed">Ù…Ø¨Ù„Øº Ø«Ø§Ø¨Øª</option>
                          <option value="percent">Ù†Ø³Ø¨Ø© Ù…Ø¦ÙˆÙŠØ©</option>
                        </select>
                      </Field>
                      <Field label="Ù‚ÙŠÙ…Ø© Ø§Ù„Ø®ØµÙ…">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.value}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'value'], event.target.value)}
                        />
                      </Field>
                      <Field label="Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ø·Ù„Ø¨">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.minOrderAmount}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'minOrderAmount'], event.target.value)}
                        />
                      </Field>
                      <Field label="Ø£Ù‚ØµÙ‰ Ø®ØµÙ…">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={code.maxDiscount}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'maxDiscount'], event.target.value)}
                        />
                      </Field>
                      <Field label="Ø­Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…">
                        <input
                          type="number"
                          min="0"
                          value={code.usageLimit}
                          onChange={(event) => changeSettingsField(['loyalty', 'discountCodes', index, 'usageLimit'], event.target.value)}
                        />
                      </Field>
                      <Field label="Ø¹Ø¯Ø¯ Ù…Ø±Ø§Øª Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…">
                        <input value={code.usedCount || 0} readOnly />
                      </Field>
                      <Field label="ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡">
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
                          Ø§Ù„ÙƒÙˆØ¯ Ù…ÙØ¹Ù„
                        </label>
                      </div>
                      <button type="button" className="table-action-btn delete" onClick={() => removeDiscountCode(index)}>Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ¯</button>
                    </div>
                  ))}
                </div>
                <SaveSectionButton saving={settingsSaving} label="Ø­ÙØ¸ Ø£ÙƒÙˆØ§Ø¯ Ø§Ù„Ø®ØµÙ…" />
              </article>
            </div>
          </form>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'orders' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø·Ù„Ø¨Ø§Øª</h2>
              <p>Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø·Ù„Ø¨Ø§Øª ÙˆØºÙŠÙ‘Ø± Ø­Ø§Ù„ØªÙ‡Ø§ Ø¨Ø³Ø±Ø¹Ø©.</p>
            </div>
            <ShoppingBag size={18} />
          </div>
          <SearchBox value={searchTerms.orders} onChange={(event) => changeSearch('orders', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ø·Ù„Ø¨ Ø¨Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø­Ø§Ù„Ø©..." />
          <div className="admin-table-card">
            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ø§Ù„Ø¹Ù…ÙŠÙ„</th>
                    <th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th>
                    <th>Ø§Ù„Ø¯ÙØ¹</th>
                    <th>Ø§Ù„Ø­Ø§Ù„Ø©</th>
                    <th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.user?.name || '-'}</td>
                      <td>{order.totalPrice} Ø¬.Ù…</td>
                      <td>{order.isPaid ? 'Ù…Ø¯ÙÙˆØ¹' : order.paymentMethod}</td>
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
              <h2>Ø¯Ø¹Ù… Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</h2>
              <p>Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§ØªØŒ Ø£Ø±Ø³Ù„ Ø§Ù„Ø±Ø¯ÙˆØ¯ØŒ ÙˆØªØ­ÙƒÙ… ÙÙŠ Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙˆØ­Ø§Ù„Ø© Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©.</p>
            </div>
            <MessageCircle size={18} />
          </div>
          <SearchBox value={searchTerms.support} onChange={(event) => changeSearch('support', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø­Ø§Ø¯Ø«Ø© Ø¨Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£Ùˆ Ø¢Ø®Ø± Ø±Ø³Ø§Ù„Ø©..." />
          <div className="admin-settings-cluster">
            {filteredSupportConversations.length ? filteredSupportConversations.map((conversation) => (
              <article key={conversation._id} className="admin-setting-card">
                <div className="admin-section-head compact">
                  <div>
                    <h3>{conversation.customer?.name || 'Ø¹Ù…ÙŠÙ„'}</h3>
                    <p>
                      {conversation.customer?.email || '-'}
                      {conversation.assignedEmployee?.name ? ` â€¢ ${conversation.assignedEmployee.name}` : ''}
                    </p>
                  </div>
                  <div className="support-admin-header-tools">
                    {conversation.supportUnreadCount > 0 ? <span className="support-admin-unread-badge">{conversation.supportUnreadCount}</span> : null}
                    <span className={`admin-toggle-pill support-status-pill${conversation.status === 'closed' ? ' is-closed' : ''}`}>
                      {conversation.status === 'open' ? 'Ù…ÙØªÙˆØ­Ø©' : 'Ù…ØºÙ„Ù‚Ø©'}
                    </span>
                  </div>
                </div>

                <div className="support-admin-toolbar">
                  <button type="button" className="table-action-btn edit" onClick={() => markSupportAsRead(conversation._id)} disabled={!conversation.supportUnreadCount}>ØªÙ…Øª Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©</button>
                  <button type="button" className="table-action-btn" onClick={() => toggleSupportConversationStatus(conversation)}>
                    {conversation.status === 'closed' ? 'Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­' : 'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©'}
                  </button>
                </div>

                <div className="support-admin-thread">
                  {(conversation.messages || []).map((message) => (
                    <div key={message._id} className={`support-admin-message${message.senderRole === 'support' ? ' mine' : ''}`}>
                      <strong>{message.senderRole === 'support' ? 'Ø§Ù„Ø¯Ø¹Ù…' : (conversation.customer?.name || 'Ø§Ù„Ø¹Ù…ÙŠÙ„')}</strong>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>

                <div className="support-admin-reply">
                  <input
                    value={supportReplyDrafts[conversation._id] || ''}
                    onChange={(event) => setSupportReplyDrafts((current) => ({ ...current, [conversation._id]: event.target.value }))}
                    placeholder={conversation.status === 'closed' ? 'Ø£Ø¹Ø¯ ÙØªØ­ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø£ÙˆÙ„Ù‹Ø§...' : 'Ø§ÙƒØªØ¨ Ø±Ø¯Ùƒ Ù‡Ù†Ø§...'}
                    disabled={conversation.status === 'closed'}
                  />
                  <button type="button" className="primary-btn" onClick={() => sendSupportReply(conversation._id)} disabled={conversation.status === 'closed'}>Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø¯</button>
                </div>
              </article>
            )) : <p className="muted">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø¯Ø¹Ù… Ø­Ø§Ù„ÙŠÙ‹Ø§.</p>}
          </div>
        </section>

        <section className={`admin-dashboard-panel${activeSection === 'users' ? ' active' : ''}`}>
          <div className="admin-section-head">
            <div>
              <h2>Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†</h2>
              <p>Ø§Ø³ØªØ¹Ø±Ø¶ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†ØŒ ØºÙŠÙ‘Ø± Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨ØŒ ÙˆØ¹Ø¯Ù‘Ù„ ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†.</p>
            </div>
            <Users size={18} />
          </div>
          <SearchBox value={searchTerms.users} onChange={(event) => changeSearch('users', event.target.value)} placeholder="Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø£Ùˆ Ø§Ù„Ù‡Ø§ØªÙ..." />
          <div className="admin-table-card">
            <div className="table-wrap admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ø§Ù„Ø§Ø³Ù…</th>
                    <th>Ø§Ù„Ø¨Ø±ÙŠØ¯</th>
                    <th>Ø§Ù„Ù‡Ø§ØªÙ</th>
                    <th>Ø§Ù„Ù†ÙˆØ¹</th>
                    <th>Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª</th>
                    <th>Ø§Ù„ØªØ³Ø¬ÙŠÙ„</th>
                    <th>Ø§Ù„Ù…Ø­ÙØ¸Ø©</th>
                    <th>Ø§Ù„Ù†Ù‚Ø§Ø·</th>
                    <th>ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡</th>
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
                          <option value="admin">Ù…Ø¯ÙŠØ±</option>
                          <option value="user">Ø¹Ù…ÙŠÙ„</option>
                          <option value="employee">Ù…ÙˆØ¸Ù</option>
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
                      <td>{member.hasManualPassword ? 'ÙŠØ¯ÙˆÙŠ' : member.googleId ? 'Google' : '-'}</td>
                      <td>{Number(member.walletBalance || 0)} Ø¬.Ù…</td>
                      <td>{Number(member.loyaltyPoints || 0)} Ù†Ù‚Ø·Ø©</td>
                      <td>{new Date(member.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

