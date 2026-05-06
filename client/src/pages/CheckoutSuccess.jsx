import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useCart } from '../context/CartContext.jsx';

const checkoutDraftKey = 'checkout-draft';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [order, setOrder] = useState(null);
  const { clearCart } = useCart();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setLoading(false);
      return;
    }

    api.get(`/payments/stripe/verify/${sessionId}`)
      .then(({ data }) => {
        setPaid(Boolean(data.paid));
        setOrder(data.order);
        if (data.paid) {
          clearCart();
          sessionStorage.removeItem(checkoutDraftKey);
          toast.success('تم تأكيد الدفع بنجاح وإنشاء الطلب');
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'تعذر التحقق من عملية الدفع');
      })
      .finally(() => setLoading(false));
  }, [clearCart, searchParams]);

  return <div className="container page checkout-page">
    <div className="checkout-success-card">
      <h1>{loading ? 'جارٍ التحقق من الدفع...' : paid ? 'تم الدفع بنجاح' : 'الدفع لم يكتمل بعد'}</h1>
      <p>
        {loading
          ? 'لحظات ونقوم بمراجعة حالة عملية الدفع الخاصة بك.'
          : paid
            ? `تم إنشاء طلبك${order?._id ? ` برقم ${order._id.slice(-6)}` : ''} بعد تأكيد الدفع بنجاح، ويمكنك متابعة حالته من صفحة الطلبات.`
            : 'يمكنك العودة إلى صفحة إكمال الطلب والمحاولة مرة أخرى.'}
      </p>

      <div className="checkout-review-actions">
        <Link to={paid ? '/orders' : '/checkout/review'} className="primary-btn">
          {paid ? 'الذهاب إلى طلباتي' : 'العودة إلى إكمال الطلب'}
        </Link>
        <Link to="/" className="secondary-btn">العودة للرئيسية</Link>
      </div>
    </div>
  </div>;
}
