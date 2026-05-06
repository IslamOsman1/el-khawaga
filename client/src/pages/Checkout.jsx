import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { calculateCheckoutTotals } from '../utils/pricing.js';
import { calculateShippingForGovernorate } from '../utils/shipping.js';

const checkoutDraftKey = 'checkout-draft';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totals } = useCart();
  const { settings } = useStoreSettings();
  const [shippingAddress, setAddress] = useState({
    fullName: '',
    phone: '',
    city: '',
    area: '',
    street: '',
    notes: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [discountCode, setDiscountCode] = useState('');
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false);

  const availableGovernorates = useMemo(
    () => settings?.checkout?.governorates || [],
    [settings]
  );

  const availableCities = useMemo(() => {
    const selectedGovernorate = availableGovernorates.find((item) => item.name === shippingAddress.city);
    return selectedGovernorate?.cities || [];
  }, [availableGovernorates, shippingAddress.city]);

  const notesEnabled = settings?.checkout?.notesEnabled !== false;
  const notesRequired = Boolean(settings?.checkout?.notesEnabled && settings?.checkout?.notesRequired);
  const shippingPrice = useMemo(
    () => calculateShippingForGovernorate(settings, shippingAddress.city, totals.itemsPrice),
    [settings, shippingAddress.city, totals.itemsPrice]
  );

  const estimatedTotals = useMemo(
    () => calculateCheckoutTotals({
      itemsPrice: totals.itemsPrice,
      shippingPrice,
      settings,
      user,
      discountCode,
      redeemLoyaltyPoints
    }),
    [discountCode, redeemLoyaltyPoints, settings, shippingPrice, totals.itemsPrice, user]
  );

  useEffect(() => {
    const draft = sessionStorage.getItem(checkoutDraftKey);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft);
      if (parsed.shippingAddress) setAddress(parsed.shippingAddress);
      if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      if (parsed.discountCode) setDiscountCode(parsed.discountCode);
      if (parsed.redeemLoyaltyPoints) setRedeemLoyaltyPoints(Boolean(parsed.redeemLoyaltyPoints));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!items.length) navigate('/cart');
  }, [items, navigate]);

  const paymentOptions = useMemo(() => {
    const options = [];
    if (settings?.payment?.cashOnDeliveryEnabled !== false) {
      options.push({
        value: 'cod',
        label: 'الدفع عند الاستلام',
        note: 'الدفع عند وصول الطلب'
      });
    }
    if (settings?.payment?.onlinePaymentEnabled) {
      options.push({
        value: 'online',
        label: 'دفع أونلاين',
        note: 'الدفع الآن ببطاقة بنكية عبر الإنترنت'
      });
    }
    return options;
  }, [settings]);

  const change = (event) => {
    const { name, value } = event.target;
    setAddress((current) => {
      const next = { ...current, [name]: value };
      if (name === 'city') next.area = '';
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();
    const draft = {
      shippingAddress,
      paymentMethod,
      discountCode,
      redeemLoyaltyPoints
    };
    sessionStorage.setItem(checkoutDraftKey, JSON.stringify(draft));
    navigate('/checkout/review');
  };

  return (
    <div className="container page checkout-page">
      <div className="section-head">
        <div>
          <h1>التشيك أوت</h1>
          <p>أدخل بيانات الشحن واختر طريقة الدفع المناسبة لك.</p>
        </div>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form checkout-panel" onSubmit={submit}>
          <input
            name="fullName"
            value={shippingAddress.fullName}
            placeholder="الاسم بالكامل"
            onChange={change}
            required
          />

          <input
            name="phone"
            value={shippingAddress.phone}
            placeholder="رقم الهاتف"
            onChange={change}
            required
          />

          {availableGovernorates.length ? (
            <select name="city" value={shippingAddress.city} onChange={change} required>
              <option value="">اختر المحافظة</option>
              {availableGovernorates.map((governorate) => (
                <option key={governorate.name} value={governorate.name}>{governorate.name}</option>
              ))}
            </select>
          ) : (
            <input
              name="city"
              value={shippingAddress.city}
              placeholder="المحافظة"
              onChange={change}
              required
            />
          )}

          {availableCities.length ? (
            <select name="area" value={shippingAddress.area} onChange={change} required>
              <option value="">اختر المدينة</option>
              {availableCities.map((cityName) => (
                <option key={cityName} value={cityName}>{cityName}</option>
              ))}
            </select>
          ) : (
            <input
              name="area"
              value={shippingAddress.area}
              placeholder="المدينة أو المنطقة"
              onChange={change}
              required
            />
          )}

          <input
            name="street"
            value={shippingAddress.street}
            placeholder="العنوان التفصيلي"
            onChange={change}
            required
          />

          {notesEnabled ? (
            <textarea
              name="notes"
              value={shippingAddress.notes}
              placeholder="ملاحظات"
              onChange={change}
              required={notesRequired}
            />
          ) : null}

          <div className="checkout-loyalty-box">
            <strong>النقاط وأكواد الخصم</strong>
            <input
              value={discountCode}
              onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
              placeholder="أدخل كود الخصم"
            />
            {settings?.loyalty?.enabled !== false ? (
              <label className="admin-toggle-pill checkout-points-toggle">
                <input
                  type="checkbox"
                  checked={redeemLoyaltyPoints}
                  onChange={(event) => setRedeemLoyaltyPoints(event.target.checked)}
                  disabled={Number(user?.loyaltyPoints || 0) < Number(settings?.loyalty?.minRedeemPoints || 0)}
                />
                استخدام نقاط الولاء
                <span>({Number(user?.loyaltyPoints || 0)} نقطة)</span>
              </label>
            ) : null}
          </div>

          <div className="checkout-payment-options">
            {paymentOptions.map((option) => (
              <label key={option.value} className={`payment-option-card${paymentMethod === option.value ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </label>
            ))}
          </div>

          <button className="primary-btn">متابعة إلى إكمال الطلب</button>
        </form>

        <aside className="summary checkout-summary-panel">
          <h2>ملخص الطلب</h2>
          <p>المنتجات: {totals.itemsPrice} ج.م</p>
          <p>الشحن: {shippingPrice} ج.م</p>
          {redeemLoyaltyPoints && estimatedTotals.loyaltyPointsDiscount > 0 ? (
            <p>خصم النقاط: -{estimatedTotals.loyaltyPointsDiscount} ج.م</p>
          ) : null}
          {discountCode ? <p className="muted">سيتم التحقق من كود الخصم عند تأكيد الطلب</p> : null}
          <strong>الإجمالي المتوقع: {estimatedTotals.totalPrice} ج.م</strong>
        </aside>
      </div>
    </div>
  );
}
