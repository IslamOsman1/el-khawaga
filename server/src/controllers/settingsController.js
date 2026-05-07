import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { ensureStoreSettings, serializePublicSettings } from '../utils/storeSettings.js';
import { assertDeletePassword, getDeleteProtectionState } from '../utils/deleteProtection.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

const sanitizeHeroSlides = (slides = []) => slides
  .filter((slide) => slide && (slide.title || slide.note || slide.tag || slide.image))
  .slice(0, 5)
  .map((slide) => ({
    title: slide.title || '',
    note: slide.note || '',
    tag: slide.tag || '',
    image: slide.image || '',
    link: slide.link || ''
  }));

const sanitizeFeaturedCategories = (items = []) => items
  .filter((item) => item && item.title && item.category)
  .slice(0, 8)
  .map((item) => ({
    title: item.title || '',
    subtitle: item.subtitle || '',
    category: item.category || '',
    image: item.image || ''
  }));

const sanitizeCategoryGroups = (groups = []) => groups
  .filter((group) => group && group.title)
  .map((group) => ({
    title: group.title || '',
    subtitle: group.subtitle || '',
    sections: (group.sections || [])
      .filter((section) => section && section.title && section.sourceCategory)
      .map((section) => ({
        title: section.title || '',
        sourceCategory: section.sourceCategory || ''
      }))
  }))
  .filter((group) => group.sections.length);

const sanitizeCheckoutGovernorates = (items = []) => items
  .filter((item) => item && item.name)
  .map((item) => ({
    name: String(item.name || '').trim(),
    shippingFee: Number(item.shippingFee ?? 0) > 0 ? Number(item.shippingFee) : 0,
    cities: Array.from(new Set(
      (item.cities || [])
        .map((city) => String(city || '').trim())
        .filter(Boolean)
    ))
  }))
  .filter((item) => item.name && item.cities.length);

const sanitizeDiscountCodes = (items = []) => items
  .filter((item) => item && item.code)
  .map((item) => ({
    code: String(item.code || '').trim().toUpperCase(),
    type: item.type === 'percent' ? 'percent' : 'fixed',
    value: Math.max(0, Number(item.value || 0)),
    minOrderAmount: Math.max(0, Number(item.minOrderAmount || 0)),
    maxDiscount: Math.max(0, Number(item.maxDiscount || 0)),
    usageLimit: Math.max(0, Number(item.usageLimit || 0)),
    usedCount: Math.max(0, Number(item.usedCount || 0)),
    active: item.active !== false,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : null
  }))
  .filter((item) => item.code && item.value > 0);

const sanitizeLoyaltySettings = (loyalty = {}) => ({
  enabled: loyalty.enabled !== false,
  pointsPerPoint: Math.max(1, Number(loyalty.pointsPerPoint || 10)),
  pointValue: Math.max(0, Number(loyalty.pointValue || 0)),
  minRedeemPoints: Math.max(0, Number(loyalty.minRedeemPoints || 0)),
  discountCodes: sanitizeDiscountCodes(loyalty.discountCodes || [])
});

const sanitizePolicyPage = (policy = {}, fallbackTitle = '') => ({
  title: String(policy.title || fallbackTitle).trim(),
  description: String(policy.description || '').trim(),
  sections: (policy.sections || [])
    .filter((section) => section && (section.title || section.body))
    .map((section) => ({
      title: String(section.title || '').trim(),
      body: String(section.body || '').trim()
    }))
    .filter((section) => section.title || section.body)
});

const serializeAdminSettings = (settings) => {
  const payload = settings.toObject();
  payload.adminControls = {
    deleteConfirmationEnabled: Boolean(settings.adminControls?.deleteConfirmationEnabled),
    deletePasswordHash: '',
    hasDeletePassword: Boolean(settings.adminControls?.deletePasswordHash)
  };
  return payload;
};

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await ensureStoreSettings();
  res.json(serializePublicSettings(settings));
});

export const getAdminSettings = asyncHandler(async (_req, res) => {
  const settings = await ensureStoreSettings();
  res.json(serializeAdminSettings(settings));
});

export const getCategorySettings = asyncHandler(async (_req, res) => {
  const settings = await ensureStoreSettings();
  res.json({ categoryGroups: settings.categoryGroups || [] });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await ensureStoreSettings();
  const {
    storeName,
    storeTagline,
    supportEmail,
    supportPhone,
    address,
    workingHours,
    whatsapp,
    facebookUrl,
    instagramUrl,
    about,
    policies,
    home,
    categoryGroups,
    checkout,
    payment,
    loyalty,
    adminControls,
    integrations
  } = req.body;

  if (typeof storeName === 'string') settings.storeName = storeName;
  if (typeof storeTagline === 'string') settings.storeTagline = storeTagline;
  if (typeof supportEmail === 'string') settings.supportEmail = supportEmail;
  if (typeof supportPhone === 'string') settings.supportPhone = supportPhone;
  if (typeof address === 'string') settings.address = address;
  if (typeof workingHours === 'string') settings.workingHours = workingHours;
  if (typeof whatsapp === 'string') settings.whatsapp = whatsapp;
  if (typeof facebookUrl === 'string') settings.facebookUrl = facebookUrl;
  if (typeof instagramUrl === 'string') settings.instagramUrl = instagramUrl;

  if (about) {
    settings.about = {
      ...settings.about.toObject(),
      ...about
    };
  }

  if (policies) {
    settings.policies = {
      ...settings.policies?.toObject?.(),
      privacy: policies.privacy ? sanitizePolicyPage(policies.privacy, settings.policies?.privacy?.title || 'سياسة الخصوصية') : settings.policies?.privacy,
      terms: policies.terms ? sanitizePolicyPage(policies.terms, settings.policies?.terms?.title || 'الشروط والأحكام') : settings.policies?.terms,
      shipping: policies.shipping ? sanitizePolicyPage(policies.shipping, settings.policies?.shipping?.title || 'سياسة الشحن والتوصيل') : settings.policies?.shipping,
      refund: policies.refund ? sanitizePolicyPage(policies.refund, settings.policies?.refund?.title || 'سياسة الاسترجاع والاستبدال') : settings.policies?.refund
    };
  }

  if (home) {
    settings.home = {
      ...settings.home.toObject(),
      ...home,
      heroSlides: home.heroSlides ? sanitizeHeroSlides(home.heroSlides) : settings.home.heroSlides,
      featuredCategories: home.featuredCategories ? sanitizeFeaturedCategories(home.featuredCategories) : settings.home.featuredCategories
    };
  }

  if (categoryGroups) {
    settings.categoryGroups = sanitizeCategoryGroups(categoryGroups);
  }

  if (checkout) {
    settings.checkout = {
      ...settings.checkout.toObject(),
      ...checkout,
      governorates: checkout.governorates
        ? sanitizeCheckoutGovernorates(checkout.governorates)
        : settings.checkout.governorates
    };
  }

  if (payment) {
    settings.payment = {
      ...settings.payment.toObject(),
      ...payment
    };
  }

  if (loyalty) {
    settings.loyalty = sanitizeLoyaltySettings({
      ...settings.loyalty?.toObject?.(),
      ...loyalty
    });
  }

  if (adminControls) {
    settings.adminControls = {
      ...settings.adminControls?.toObject?.(),
      deleteConfirmationEnabled: adminControls.deleteConfirmationEnabled === true,
      deletePasswordHash: settings.adminControls?.deletePasswordHash || ''
    };

    if (typeof adminControls.deletePassword === 'string' && adminControls.deletePassword.trim()) {
      if (adminControls.deletePassword.trim().length < 4) {
        return res.status(400).json({ message: 'كلمة مرور الحذف يجب أن تكون 4 أحرف على الأقل' });
      }
      settings.adminControls.deletePasswordHash = await bcrypt.hash(adminControls.deletePassword.trim(), 10);
    }
  }

  if (integrations) {
    settings.integrations = {
      ...settings.integrations.toObject(),
      ...integrations
    };
  }

  await settings.save();
  res.json(serializeAdminSettings(settings));
});

export const updateCategorySettings = asyncHandler(async (req, res) => {
  const settings = await ensureStoreSettings();
  const { categoryGroups } = req.body;

  settings.categoryGroups = sanitizeCategoryGroups(categoryGroups);
  await settings.save();

  res.json({ categoryGroups: settings.categoryGroups });
});

export const uploadBannerImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'اختر صورة أولًا' });
  const result = await uploadToCloudinary(req.file.buffer, 'alwekala/banners');
  res.json({ url: result.secure_url, publicId: result.public_id });
});

export const verifyDeletePassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  await assertDeletePassword(password);
  const state = await getDeleteProtectionState();
  res.json({ ok: true, enabled: state.enabled });
});
