import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useCart } from '../context/CartContext.jsx';

const checkoutDraftKey = 'checkout-draft';

export default function CheckoutReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, clearCart, totals } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const storedDraft = sessionStorage.getItem(checkoutDraftKey);
    if (!storedDraft) {
      navigate('/checkout');
      return;
    }

    try {
      setDraft(JSON.parse(storedDraft));
    } catch {
      navigate('/checkout');
    }
  }, [navigate]);

  useEffect(() => {
    if (!items.length) navigate('/cart');
  }, [items, navigate]);

  const orderLabel = useMemo(
    () => draft?.paymentMethod === 'online' ? 'دفع أونلاين' : 'الدفع عند الاستلام',
    [draft]
  );

  const submit = async () => {
    if (!draft) return;
    setSubmitting(true);

    try {
      if (draft.paymentMethod === 'online') {
        const { data } = await api.post('/payments/stripe/checkout-session', {
          orderItems: items.map((item) => ({ product: item._id, qty: item.qty })),
          shippingAddress: draft.shippingAddress
        });

        window.location.href = data.url;
        return;
      }

      await api.post('/orders', {
        orderItems: items.map((item) => ({ product: item._id, qty: item.qty })),
        shippingAddress: draft.shippingAddress,
        paymentMethod: draft.paymentMethod
      });

      clearCart();
      sessionStorage.removeItem(checkoutDraftKey);
      toast.success('تم إنشاء الطلب');
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) return null;

  return <div className="container page checkout-page">
    <div className="section-head">
      <div>
        <h1>إكمال الطلب</h1>
        <p>راجع البيانات والمنتجات قبل تأكيد الطلب النهائي.</p>
      </div>
      {searchParams.get('cancelled') && <span className="muted">تم إلغاء الدفع ويمكنك المحاولة مرة أخرى بدون إنشاء طلب.</span>}
    </div>

    <div className="checkout-layout">
      <section className="checkout-panel checkout-review-panel">
        <div className="checkout-review-block">
          <strong>بيانات الشحن</strong>
          <p>{draft.shippingAddress.fullName}</p>
          <p>{draft.shippingAddress.phone}</p>
          <p>{draft.shippingAddress.city} - {draft.shippingAddress.area}</p>
          <p>{draft.shippingAddress.street}</p>
          {draft.shippingAddress.notes ? <p>{draft.shippingAddress.notes}</p> : null}
        </div>

        <div className="checkout-review-block">
          <strong>طريقة الدفع</strong>
          <p>{orderLabel}</p>
        </div>

        <div className="checkout-review-block">
          <strong>المنتجات</strong>
          <div className="checkout-review-items">
            {items.map((item) => <div className="checkout-review-item" key={item._id}>
              <span>{item.name}</span>
              <small>{item.qty} × {item.price} ج.م</small>
            </div>)}
          </div>
        </div>

        <div className="checkout-review-actions">
          <Link to="/checkout" className="secondary-btn">العودة للتعديل</Link>
          <button type="button" className="primary-btn" onClick={submit} disabled={submitting}>
            {submitting ? 'جارٍ التنفيذ...' : draft.paymentMethod === 'online' ? 'الدفع الآن' : 'تأكيد الطلب'}
          </button>
        </div>
      </section>

      <aside className="summary checkout-summary-panel">
        <h2>ملخص الطلب</h2>
        <p>المنتجات: {totals.itemsPrice} ج.م</p>
        <p>الشحن: {totals.shipping} ج.م</p>
        <strong>الإجمالي: {totals.total} ج.م</strong>
      </aside>
    </div>
  </div>;
}
