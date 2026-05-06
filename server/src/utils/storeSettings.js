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

const defaultCheckoutGovernorates = [
  {
    name: 'القاهرة',
    shippingFee: 35,
    cities: ['مدينة نصر', 'مصر الجديدة', 'التجمع', 'المعادي']
  },
  {
    name: 'الجيزة',
    shippingFee: 40,
    cities: ['الدقي', 'المهندسين', '6 أكتوبر', 'الهرم']
  }
];

const defaultLoyaltySettings = {
  enabled: true,
  pointsPerPoint: 10,
  pointValue: 0.1,
  minRedeemPoints: 50,
  discountCodes: []
};

export const ensureStoreSettings = async () => {
  let settings = await StoreSettings.findOne({ singleton: 'default' });
  if (!settings) {
    settings = await StoreSettings.create({
      singleton: 'default',
      home: {
        heroSlides: defaultHeroSlides,
        featuredCategories: defaultFeaturedCategories
      },
      categoryGroups: defaultCategoryGroups,
      checkout: {
        governorates: defaultCheckoutGovernorates
      },
      loyalty: defaultLoyaltySettings
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

    if (!settings.checkout?.governorates?.length) {
      settings.checkout = settings.checkout || {};
      settings.checkout.governorates = defaultCheckoutGovernorates;
      changed = true;
    }
    if (settings.checkout?.governorates?.some((item) => typeof item.shippingFee !== 'number')) {
      settings.checkout.governorates = settings.checkout.governorates.map((item) => ({
        name: item.name,
        shippingFee: Number(item.shippingFee ?? settings.checkout?.shippingFee ?? 35),
        cities: item.cities || []
      }));
      changed = true;
    }

    if (!settings.loyalty) {
      settings.loyalty = defaultLoyaltySettings;
      changed = true;
    } else {
      const normalizedCodes = Array.isArray(settings.loyalty.discountCodes)
        ? settings.loyalty.discountCodes
        : [];

      if (
        typeof settings.loyalty.enabled !== 'boolean' ||
        typeof settings.loyalty.pointsPerPoint !== 'number' ||
        typeof settings.loyalty.pointValue !== 'number' ||
        typeof settings.loyalty.minRedeemPoints !== 'number' ||
        settings.loyalty.discountCodes !== normalizedCodes
      ) {
        settings.loyalty = {
          ...defaultLoyaltySettings,
          ...settings.loyalty.toObject?.(),
          discountCodes: normalizedCodes
        };
        changed = true;
      }
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
  loyalty: {
    enabled: settings.loyalty?.enabled !== false,
    pointsPerPoint: Number(settings.loyalty?.pointsPerPoint || defaultLoyaltySettings.pointsPerPoint),
    pointValue: Number(settings.loyalty?.pointValue || defaultLoyaltySettings.pointValue),
    minRedeemPoints: Number(settings.loyalty?.minRedeemPoints || defaultLoyaltySettings.minRedeemPoints)
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || ''
});
