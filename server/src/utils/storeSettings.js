import StoreSettings from '../models/StoreSettings.js';

const defaultHeroSlides = [
  {
    title: 'عرض منتج جديد',
    tag: 'جديد',
    note: 'أضف بانر من لوحة التحكم لعرض منتج أو حملة جديدة',
    image: '',
    link: '/offers'
  },
  {
    title: 'خصم لفترة محدودة',
    tag: 'عرض خاص',
    note: 'يمكنك تغيير النصوص والصور بالكامل من لوحة التحكم',
    image: '',
    link: '/offers'
  },
  {
    title: 'الأكثر طلبًا اليوم',
    tag: 'مميز',
    note: 'هذه الشريحة تعمل كبديل افتراضي حتى تضيف صورك الخاصة',
    image: '',
    link: '/offers'
  }
];

const defaultFeaturedCategories = [
  {
    title: 'الخضار الطازج',
    category: 'خضار',
    subtitle: 'اختيار يومي من السوق',
    image: ''
  },
  {
    title: 'الفاكهة',
    category: 'فاكهة',
    subtitle: 'جودة ممتازة طوال اليوم',
    image: ''
  },
  {
    title: 'الألبان',
    category: 'ألبان',
    subtitle: 'منتجات مبردة بعناية',
    image: ''
  },
  {
    title: 'البقالة',
    category: 'بقالة',
    subtitle: 'كل احتياجات البيت',
    image: ''
  }
];

const defaultCategoryGroups = [
  {
    title: 'أجبان ولحوم',
    subtitle: 'اختيارات مبردة ومجمدة للاستخدام اليومي والعائلي.',
    sections: [
      { title: 'جبن قريش', sourceCategory: 'ألبان' },
      { title: 'أجبان بيضاء', sourceCategory: 'ألبان' },
      { title: 'لحوم مجمدة', sourceCategory: 'بقالة' },
      { title: 'لحوم طازجة', sourceCategory: 'بقالة' }
    ]
  },
  {
    title: 'خضار وفاكهة',
    subtitle: 'منتجات طازجة مرتبة حسب نوع الاستخدام اليومي.',
    sections: [
      { title: 'خضار ورقية', sourceCategory: 'خضار' },
      { title: 'خضار طبخ', sourceCategory: 'خضار' },
      { title: 'فاكهة موسمية', sourceCategory: 'فاكهة' },
      { title: 'فاكهة يومية', sourceCategory: 'فاكهة' }
    ]
  },
  {
    title: 'ألبان وفطار',
    subtitle: 'كل ما تحتاجه لوجبات الصباح ومنتجات التبريد اليومية.',
    sections: [
      { title: 'لبن وحليب', sourceCategory: 'ألبان' },
      { title: 'زبادي وألبان', sourceCategory: 'ألبان' },
      { title: 'مربى وعسل', sourceCategory: 'بقالة' },
      { title: 'مخبوزات خفيفة', sourceCategory: 'بقالة' }
    ]
  },
  {
    title: 'بقالة البيت',
    subtitle: 'احتياجات المطبخ والبيت في أقسام واضحة وسهلة الوصول.',
    sections: [
      { title: 'أرز ومكرونة', sourceCategory: 'بقالة' },
      { title: 'زيوت وسمن', sourceCategory: 'بقالة' },
      { title: 'تجميد وحفظ', sourceCategory: 'بقالة' },
      { title: 'منظفات أساسية', sourceCategory: 'بقالة' }
    ]
  }
];

export const ensureStoreSettings = async () => {
  let settings = await StoreSettings.findOne({ singleton: 'default' });
  if (!settings) {
    settings = await StoreSettings.create({
      singleton: 'default',
      home: {
        heroSlides: defaultHeroSlides,
        featuredCategories: defaultFeaturedCategories
      },
      categoryGroups: defaultCategoryGroups
    });
  } else {
    let changed = false;

    if (!settings.home?.heroSlides?.length) {
      settings.home.heroSlides = defaultHeroSlides;
      changed = true;
    }

    if (!settings.home?.featuredCategories?.length) {
      settings.home.featuredCategories = defaultFeaturedCategories;
      changed = true;
    }

    if (!settings.categoryGroups?.length) {
      settings.categoryGroups = defaultCategoryGroups;
      changed = true;
    }

    if (changed) await settings.save();
  }

  return settings;
};

export const serializePublicSettings = (settings) => ({
  storeName: settings.storeName,
  storeTagline: settings.storeTagline,
  supportEmail: settings.supportEmail,
  supportPhone: settings.supportPhone,
  address: settings.address,
  workingHours: settings.workingHours,
  whatsapp: settings.whatsapp,
  about: settings.about,
  home: settings.home,
  categoryGroups: settings.categoryGroups,
  checkout: settings.checkout,
  payment: {
    cashOnDeliveryEnabled: settings.payment?.cashOnDeliveryEnabled,
    onlinePaymentEnabled: settings.payment?.onlinePaymentEnabled,
    onlineProvider: settings.payment?.onlineProvider,
    currency: settings.payment?.currency
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || ''
});
