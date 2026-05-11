import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock3,
  Package,
  PackageSearch,
  Truck,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  Wallet,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;
const ORDER_STATUS_STEPS = ['جديد', 'قيد التجهيز', 'في الطريق', 'تم التسليم'];
const ORDER_STATUS_ICONS = {
  جديد: Package,
  'قيد التجهيز': PackageSearch,
  'في الطريق': Truck,
  'تم التسليم': PackageCheck,
  ملغي: XCircle
};

const normalizeOrderStatus = (value = '') => String(value || '').trim();

const isCancelledOrder = (status) => {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'ملغي' || normalized.includes('ملغ');
};

const isDeliveredOrder = (status) => {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'تم التسليم' || normalized.includes('التسليم');
};

const getOrderProgressState = (status) => {
  const normalized = normalizeOrderStatus(status);

  if (isCancelledOrder(normalized)) {
    return {
      cancelled: true,
      steps: [
        { label: 'جديد', state: 'completed' },
        { label: 'ملغي', state: 'cancelled' }
      ]
    };
  }

  const directIndex = ORDER_STATUS_STEPS.findIndex((label) => label === normalized);
  const activeStep = directIndex >= 0
    ? directIndex
    : isDeliveredOrder(normalized)
      ? ORDER_STATUS_STEPS.length - 1
      : 0;

  return {
    cancelled: false,
    steps: ORDER_STATUS_STEPS.map((label, index) => ({
      label,
      state: index < activeStep ? 'completed' : index === activeStep ? 'active' : 'upcoming'
    }))
  };
};

export default function Orders() {
  const { refreshProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState('');

  const loadOrders = () => {
    setLoading(true);
    api.get('/orders/my')
      .then(({ data }) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const stats = useMemo(() => ({
    count: orders.length,
    latest: orders[0]?.status || 'لا يوجد',
    total: orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0),
  }), [orders]);

  const getRemainingCancelTime = (order) => {
    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    return Math.max(0, CANCEL_WINDOW_MS - elapsed);
  };

  const canCancelOrder = (order) => order.status === 'جديد' && getRemainingCancelTime(order) > 0;
  const canRequestSupport = (order) => order.status !== 'ملغي' && !canCancelOrder(order);

  const formatRemaining = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const openSupportForOrder = (order) => {
    const orderNumber = order?._id?.slice(-6) || order?._id || '';
    const text = `مرحبًا، أحتاج إلى شكوى أو طلب إلغاء عبر الدعم للطلب #${orderNumber}، حالته الحالية: ${order.status}.`;
    window.dispatchEvent(new CustomEvent('support-chat:prefill', { detail: { text } }));
    toast.success('تم فتح شات الدعم مع تجهيز الرسالة');
  };

  const cancelOrder = async (orderId) => {
    setCancellingId(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/cancel`);
      toast.success(data.message || 'تم إلغاء الطلب');
      await refreshProfile().catch(() => null);
      loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إلغاء الطلب');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <main className="app-shell home-screen market-home account-page-shell">
      <section className="panel-card account-hero">
        <div className="account-hero-main">
          <div className="account-icon-badge">
            <ClipboardList size={28} />
          </div>
          <div className="account-copy">
            <span className="market-pill">الطلبات</span>
            <h1>طلباتي</h1>
            <p>متابعة واضحة لكل طلباتك السابقة والحالية مع إمكانية إلغاء الطلب خلال أول 5 دقائق فقط.</p>
          </div>
        </div>
        <div className="account-hero-actions">
          <Link to="/wishlist" className="secondary-btn">المفضلة</Link>
          <Link to="/" className="primary-btn">العودة للتسوق</Link>
        </div>
      </section>

      <section className="account-stats-grid">
        <article className="account-stat-card">
          <span>عدد الطلبات</span>
          <strong>{stats.count}</strong>
        </article>
        <article className="account-stat-card">
          <span>آخر حالة</span>
          <strong>{stats.latest}</strong>
        </article>
        <article className="account-stat-card">
          <span>إجمالي المشتريات</span>
          <strong>{stats.total} ج.م</strong>
        </article>
      </section>

      <section className="panel-card account-content-panel">
        <div className="section-head compact">
          <h2>سجل الطلبات</h2>
          <span>{loading ? 'جاري التحميل...' : `${orders.length} طلب`}</span>
        </div>

        {loading ? <p className="muted">جاري تحميل الطلبات...</p> : orders.length ? (
          <div className="orders-timeline">
            {orders.map((order) => {
              const canCancel = canCancelOrder(order);
              const canEscalate = canRequestSupport(order);
              const remaining = getRemainingCancelTime(order);
              const progress = getOrderProgressState(order.status);

              return (
                <article className="order-showcase-card" key={order._id}>
                  <div className={`order-progress-track${progress.cancelled ? ' is-cancelled' : ''}`}>
                    {progress.steps.map((step, index) => (
                      (() => {
                        const StepIcon = ORDER_STATUS_ICONS[step.label] || Package;
                        return (
                      <div
                        key={`${order._id}-${step.label}`}
                        className={`order-progress-step is-${step.state}`}
                      >
                        <div className="order-progress-marker">
                          <StepIcon size={16} />
                        </div>
                        <strong>{step.label}</strong>
                      </div>
                        );
                      })()
                    ))}
                  </div>

                  <div className="order-showcase-top">
                    <div>
                      <strong>طلب #{order._id.slice(-6)}</strong>
                      <p>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <span className="order-status-pill">
                      <Clock3 size={14} /> {order.status}
                    </span>
                  </div>

                  <div className="order-showcase-bottom">
                    <div className="order-meta-box">
                      <PackageCheck size={18} />
                      <div>
                        <span>قيمة الطلب</span>
                        <strong>{order.totalPrice} ج.م</strong>
                      </div>
                    </div>
                    <div className="order-meta-box">
                      <ShoppingBag size={18} />
                      <div>
                        <span>طريقة الدفع</span>
                        <strong>{order.paymentMethod}</strong>
                      </div>
                    </div>
                  </div>

                  {order.refundedToWallet ? (
                    <div className="order-wallet-note">
                      <Wallet size={16} />
                      <span>تم تحويل {order.refundedAmount} ج.م إلى المحفظة.</span>
                    </div>
                  ) : null}

                  <div className="order-actions-row">
                    {canCancel ? (
                      <>
                        <button
                          type="button"
                          className="order-cancel-btn"
                          onClick={() => cancelOrder(order._id)}
                          disabled={cancellingId === order._id}
                        >
                          {cancellingId === order._id
                            ? 'جارٍ الإلغاء...'
                            : `إلغاء الطلب خلال ${formatRemaining(remaining)}`}
                        </button>
                        <span className="muted order-cancel-note">
                          يمكنك الإلغاء مباشرة خلال أول 5 دقائق من إنشاء الطلب.
                        </span>
                      </>
                    ) : canEscalate ? (
                      <>
                        <button
                          type="button"
                          className="order-support-btn"
                          onClick={() => openSupportForOrder(order)}
                        >
                          <MessageCircle size={16} />
                          شكوى أو إلغاء عبر الدعم
                        </button>
                        <span className="muted order-cancel-note">
                          انتهت مهلة الإلغاء المباشر. يمكنك المتابعة مع الدعم من هنا.
                        </span>
                      </>
                    ) : (
                      <span className="muted order-cancel-note">تم إلغاء هذا الطلب</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="account-empty-state">
            <div className="account-empty-icon">
              <ClipboardList size={26} />
            </div>
            <strong>لا توجد طلبات حتى الآن</strong>
            <p>عند إتمام أول طلب ستظهر هنا حالة الطلبات وتفاصيلها بشكل منظم.</p>
            <div className="account-empty-actions">
              <Link to="/" className="primary-btn"><ShoppingBag size={16} /> ابدأ التسوق</Link>
              <Link to="/offers" className="secondary-btn">شاهد العروض</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
