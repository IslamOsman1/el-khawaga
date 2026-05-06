const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const calculateCheckoutTotals = ({
  itemsPrice = 0,
  shippingPrice = 0,
  settings = null,
  user = null,
  discountCode = '',
  redeemLoyaltyPoints = false
}) => {
  const loyalty = settings?.loyalty || {};
  const subtotal = roundMoney(Number(itemsPrice || 0) + Number(shippingPrice || 0));
  const normalizedCode = String(discountCode || '').trim().toUpperCase();
  const pointValue = Math.max(0, Number(loyalty.pointValue || 0));
  const minRedeemPoints = Math.max(0, Number(loyalty.minRedeemPoints || 0));
  const availablePoints = Math.max(0, Number(user?.loyaltyPoints || 0));

  let loyaltyPointsUsed = 0;
  let loyaltyPointsDiscount = 0;

  if (
    redeemLoyaltyPoints &&
    loyalty.enabled !== false &&
    pointValue > 0 &&
    availablePoints >= minRedeemPoints
  ) {
    loyaltyPointsUsed = Math.min(availablePoints, Math.floor(subtotal / pointValue));
    loyaltyPointsDiscount = roundMoney(loyaltyPointsUsed * pointValue);
  }

  return {
    discountCode: normalizedCode,
    discountCodeAmount: 0,
    loyaltyPointsUsed,
    loyaltyPointsDiscount,
    totalPrice: roundMoney(Math.max(0, subtotal - loyaltyPointsDiscount))
  };
};
