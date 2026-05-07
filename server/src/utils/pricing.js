import { calculateShippingPrice } from './shipping.js';

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const normalizeCode = (value = '') => String(value || '').trim().toUpperCase();
const isCodeExpired = (code) => code?.expiresAt && new Date(code.expiresAt).getTime() < Date.now();

const findMatchedDiscountCode = (settings, user, normalizedCode) => {
  if (!normalizedCode) return null;

  const privateCode = (user?.privateDiscountCodes || []).find((item) => normalizeCode(item.code) === normalizedCode);
  if (privateCode) {
    return { source: 'private', code: privateCode };
  }

  const storeCode = (settings?.loyalty?.discountCodes || []).find((item) => normalizeCode(item.code) === normalizedCode);
  if (storeCode) {
    return { source: 'store', code: storeCode };
  }

  return null;
};

export const calculateEarnedLoyaltyPoints = (settings, itemsPrice) => {
  const loyalty = settings?.loyalty || {};
  if (loyalty.enabled === false) return 0;

  const pointsPerPoint = Math.max(1, Number(loyalty.pointsPerPoint || 10));
  return Math.max(0, Math.floor(Number(itemsPrice || 0) / pointsPerPoint));
};

export const calculateOrderPricing = async ({
  settings,
  items,
  shippingAddress,
  discountCode = '',
  redeemLoyaltyPoints = false,
  user = null
}) => {
  const itemsPrice = roundMoney(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0));
  const shippingPrice = roundMoney(await calculateShippingPrice(itemsPrice, shippingAddress));
  const subtotal = roundMoney(itemsPrice + shippingPrice);

  const loyaltySettings = settings?.loyalty || {};
  const normalizedCode = normalizeCode(discountCode);
  let appliedDiscountCode = '';
  let discountCodeSource = '';
  let discountCodeAmount = 0;

  if (normalizedCode) {
    const matchedDiscount = findMatchedDiscountCode(settings, user, normalizedCode);
    const matchedCode = matchedDiscount?.code;

    if (!matchedCode || matchedCode.active === false) {
      const error = new Error('كود الخصم غير صالح');
      error.statusCode = 400;
      throw error;
    }

    if (isCodeExpired(matchedCode)) {
      const error = new Error('انتهت صلاحية كود الخصم');
      error.statusCode = 400;
      throw error;
    }

    if (Number(matchedCode.minOrderAmount || 0) > itemsPrice) {
      const error = new Error('الحد الأدنى للطلب لا يسمح باستخدام كود الخصم');
      error.statusCode = 400;
      throw error;
    }

    if (Number(matchedCode.usageLimit || 0) > 0 && Number(matchedCode.usedCount || 0) >= Number(matchedCode.usageLimit || 0)) {
      const error = new Error('تم استهلاك كود الخصم بالكامل');
      error.statusCode = 400;
      throw error;
    }

    discountCodeAmount = matchedCode.type === 'percent'
      ? roundMoney(itemsPrice * (Number(matchedCode.value || 0) / 100))
      : roundMoney(Number(matchedCode.value || 0));

    if (Number(matchedCode.maxDiscount || 0) > 0) {
      discountCodeAmount = Math.min(discountCodeAmount, Number(matchedCode.maxDiscount || 0));
    }

    discountCodeAmount = roundMoney(Math.min(discountCodeAmount, subtotal));
    appliedDiscountCode = matchedCode.code;
    discountCodeSource = matchedDiscount?.source || 'store';
  }

  let loyaltyPointsUsed = 0;
  let loyaltyPointsDiscount = 0;

  if (redeemLoyaltyPoints && user && loyaltySettings.enabled !== false) {
    const availablePoints = Math.max(0, Number(user.loyaltyPoints || 0));
    const minRedeemPoints = Math.max(0, Number(loyaltySettings.minRedeemPoints || 0));
    const pointValue = Math.max(0, Number(loyaltySettings.pointValue || 0));
    const remainingAfterCode = roundMoney(subtotal - discountCodeAmount);

    if (availablePoints < minRedeemPoints) {
      const error = new Error(`يجب توفر ${minRedeemPoints} نقطة على الأقل لاستخدام النقاط`);
      error.statusCode = 400;
      throw error;
    }

    if (pointValue <= 0) {
      const error = new Error('استبدال النقاط غير مفعل حاليًا');
      error.statusCode = 400;
      throw error;
    }

    loyaltyPointsUsed = Math.min(availablePoints, Math.floor(remainingAfterCode / pointValue));
    loyaltyPointsDiscount = roundMoney(loyaltyPointsUsed * pointValue);
  }

  const totalPrice = roundMoney(Math.max(0, subtotal - discountCodeAmount - loyaltyPointsDiscount));

  return {
    itemsPrice,
    shippingPrice,
    discountCode: appliedDiscountCode,
    discountCodeSource,
    discountCodeAmount,
    loyaltyPointsUsed,
    loyaltyPointsDiscount,
    totalPrice
  };
};

export const incrementDiscountCodeUsage = async ({ settings, user, code, source = 'store' }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return;

  if (source === 'private' && user?.privateDiscountCodes?.length) {
    const target = user.privateDiscountCodes.find((item) => normalizeCode(item.code) === normalizedCode);
    if (!target) return;
    target.usedCount = Number(target.usedCount || 0) + 1;
    await user.save();
    return;
  }

  if (!settings?.loyalty?.discountCodes?.length) return;

  const target = settings.loyalty.discountCodes.find((item) => normalizeCode(item.code) === normalizedCode);
  if (!target) return;

  target.usedCount = Number(target.usedCount || 0) + 1;
  await settings.save();
};
