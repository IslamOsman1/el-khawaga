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

const defaultAdminControls = {
  deleteConfirmationEnabled: false,
  deletePasswordHash: ''
};

const defaultPolicies = {
  privacy: {
    title: 'سياسة الخصوصية',
    description: 'نوضح هنا كيفية جمع بياناتك واستخدامها وحمايتها أثناء استخدام متجر الوكالة.',
    sections: [
      { title: 'البيانات التي نجمعها', body: 'نقوم بجمع بيانات الحساب الأساسية مثل الاسم والبريد الإلكتروني ورقم الهاتف والعناوين اللازمة لإتمام الطلبات وإدارة الحساب.' },
      { title: 'استخدام البيانات', body: 'تُستخدم البيانات لإتمام الطلبات والتواصل مع العميل وتحسين تجربة الاستخدام وتقديم الدعم الفني وإدارة نقاط الولاء والخدمات المرتبطة.' },
      { title: 'حماية المعلومات', body: 'نلتزم بحماية بيانات العميل وعدم مشاركتها إلا في حدود تشغيل الخدمة مثل الشحن أو الدفع أو الدعم الفني حسب الحاجة.' }
    ]
  },
  terms: {
    title: 'الشروط والأحكام',
    description: 'هذه الصفحة توضح القواعد المنظمة لاستخدام الموقع والطلبات والحسابات.',
    sections: [
      { title: 'استخدام الموقع', body: 'يجب استخدام الموقع بصورة قانونية وعدم إساءة استخدام الخدمات أو محاولة تعطيلها أو العبث بمحتواها أو بياناتها.' },
      { title: 'الطلبات والدفع', body: 'يخضع قبول الطلب لتوافر المنتجات وصحة بيانات الشحن ونجاح عملية الدفع بحسب الوسيلة المختارة داخل الموقع.' },
      { title: 'إدارة الحساب', body: 'العميل مسؤول عن صحة بيانات حسابه والحفاظ على سرية بيانات الدخول ويحق للمتجر تحديث الشروط متى لزم الأمر.' }
    ]
  },
  shipping: {
    title: 'سياسة الشحن والتوصيل',
    description: 'تفاصيل المحافظات المتاحة واحتساب الرسوم ومدة التوصيل التقديرية.',
    sections: [
      { title: 'نطاق التوصيل', body: 'يظهر للعميل داخل فورم الطلب فقط المحافظات والمدن المفعلة حاليًا من لوحة التحكم.' },
      { title: 'مدة التسليم', body: 'مدة التوصيل تقديرية وتختلف حسب المنطقة وحالة التشغيل وتوقيت الطلب وقد يتم التواصل مع العميل لتأكيد الموعد.' },
      { title: 'رسوم الشحن', body: 'تُحتسب رسوم الشحن تلقائيًا حسب المحافظة أو الإعدادات الحالية ويظهر الإجمالي قبل تأكيد الطلب النهائي.' }
    ]
  },
  refund: {
    title: 'سياسة الاسترجاع والاستبدال',
    description: 'القواعد الأساسية الخاصة بإلغاء الطلبات والاستبدال والاسترجاع ومعالجة الشكاوى.',
    sections: [
      { title: 'الاسترجاع والاستبدال', body: 'يمكن طلب المراجعة أو الاستبدال عند وجود مشكلة واضحة في المنتج أو عند وصول منتج غير مطابق حسب حالة الطلب.' },
      { title: 'إلغاء الطلب', body: 'الإلغاء متاح وفق حالة الطلب والمدة المسموح بها في النظام وقد تختلف المعالجة للطلبات المدفوعة أونلاين.' },
      { title: 'آلية المعالجة', body: 'يقوم فريق الدعم بمراجعة كل حالة وتحديد الحل المناسب سواء استبدال أو إضافة رصيد للمحفظة أو أي معالجة أخرى.' }
    ]
  }
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
      policies: defaultPolicies,
      checkout: {
        governorates: defaultCheckoutGovernorates
      },
      loyalty: defaultLoyaltySettings,
      adminControls: defaultAdminControls
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

    if (!settings.policies) {
      settings.policies = defaultPolicies;
      changed = true;
    } else {
      for (const key of Object.keys(defaultPolicies)) {
        const currentPolicy = settings.policies[key];
        if (!currentPolicy?.title || !Array.isArray(currentPolicy?.sections) || !currentPolicy.sections.length) {
          settings.policies[key] = {
            ...defaultPolicies[key],
            ...(currentPolicy?.toObject?.() || currentPolicy || {})
          };
          if (!Array.isArray(settings.policies[key].sections) || !settings.policies[key].sections.length) {
            settings.policies[key].sections = defaultPolicies[key].sections;
          }
          changed = true;
        }
      }
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

    if (!settings.adminControls) {
      settings.adminControls = defaultAdminControls;
      changed = true;
    } else if (typeof settings.adminControls.deleteConfirmationEnabled !== 'boolean' || typeof settings.adminControls.deletePasswordHash !== 'string') {
      settings.adminControls = {
        ...defaultAdminControls,
        ...settings.adminControls.toObject?.()
      };
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
  facebookUrl: settings.facebookUrl,
  instagramUrl: settings.instagramUrl,
  about: settings.about,
  policies: settings.policies,
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
