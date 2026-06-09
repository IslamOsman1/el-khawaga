import React, { useEffect, useMemo, useState } from 'react';
import { Check, Heart, Plus, Printer, QrCode, Star } from 'lucide-react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const formatMeasurement = (product) => {
  const value = Number(product?.measurementValue || 0);
  const unit = String(product?.measurementUnit || '').trim();
  return value > 0 && unit ? `${value} ${unit}` : '';
};

const hasTrackedStock = (product) => product?.countInStock !== null && product?.countInStock !== undefined && product?.countInStock !== '';
const isOutOfStock = (product) => hasTrackedStock(product) && Number(product.countInStock) < 1;

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [qrImage, setQrImage] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isFavorite, toggleWishlist } = useWishlist();
  const selectedAddOnsTotal = useMemo(
    () => selectedAddOns.reduce((sum, entry) => sum + (Number(entry.price || 0) * Number(entry.qty || 1)), 0),
    [selectedAddOns]
  );

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data));
  }, [id]);

  useEffect(() => {
    setQty(1);
    setSelectedAddOns([]);
  }, [product?._id]);

  useEffect(() => {
    const barcode = String(product?.barcode || '').trim();
    if (!barcode) {
      setQrImage('');
      return;
    }

    QRCode.toDataURL(barcode, {
      margin: 1,
      width: 240,
      color: {
        dark: '#111111',
        light: '#FFF7EA'
      }
    })
      .then(setQrImage)
      .catch(() => setQrImage(''));
  }, [product?.barcode]);

  const printQr = () => {
    const barcode = String(product?.barcode || '').trim();
    if (!barcode || !qrImage || !product) {
      toast.error('لا يوجد QR جاهز للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=520,height=720');
    if (!printWindow) {
      toast.error('المتصفح منع نافذة الطباعة');
      return;
    }

    printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>طباعة QR - ${product.name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;margin:0;color:#111;text-align:center}
      .sheet{max-width:360px;margin:0 auto;border:1px solid #ddd;border-radius:18px;padding:24px}
      img{width:240px;height:240px;display:block;margin:0 auto 18px}
      h1{font-size:24px;margin:0 0 10px}
      p{margin:6px 0;font-size:16px}
      .code{font-weight:700;letter-spacing:.08em}
    </style>
  </head>
  <body>
    <div class="sheet">
      <img src="${qrImage}" alt="QR ${barcode}" />
      <h1>${product.name}</h1>
      <p>${product.category || ''}${product.subcategory ? ` - ${product.subcategory}` : ''}</p>
      <p class="code">${barcode}</p>
    </div>
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  if (!product) return <div className="container page"><p>جاري التحميل...</p></div>;

  const favorite = isFavorite(product._id);
  const measurementLabel = formatMeasurement(product);
  const trackedStock = hasTrackedStock(product);
  const outOfStock = isOutOfStock(product);
  const reviews = Array.isArray(product.reviews)
    ? [...product.reviews].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : [];
  const currentUserReview = reviews.find((entry) => (entry.user?._id || entry.user) === user?.id);
  const availableAddOns = Array.isArray(product.addOns) ? product.addOns.filter((entry) => entry?.active !== false) : [];
  const finalUnitPrice = Number((Number(product.price || 0) + selectedAddOnsTotal).toFixed(2));

  const incrementAddOn = (addOn) => {
    setSelectedAddOns((current) => (
      current.some((entry) => entry._id === addOn._id)
        ? current.map((entry) => (
          entry._id === addOn._id ? { ...entry, qty: Number(entry.qty || 1) + 1 } : entry
        ))
        : [
          ...current,
          {
            _id: addOn._id,
            name: addOn.name,
            qty: 1,
            price: Number(addOn.price || 0),
            image: { url: addOn.image?.url || '' }
          }
        ]
    ));
  };

  const decrementAddOn = (addOnId) => {
    setSelectedAddOns((current) => current
      .map((entry) => entry._id === addOnId ? { ...entry, qty: Math.max(0, Number(entry.qty || 1) - 1) } : entry)
      .filter((entry) => Number(entry.qty || 0) > 0));
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!user) {
      toast.error('سجل الدخول أولًا حتى تضيف تقييمك');
      return;
    }

    if (!String(reviewComment || '').trim()) {
      toast.error('أضف تعليقك أولًا');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/products/${product._id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment
      });
      setProduct(data.product);
      setReviewComment('');
      setReviewRating(5);
      toast.success(data.message || 'تم حفظ تقييمك');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حفظ التقييم');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container page">
      <div className="product-details">
        <div className="detail-image">
          {product.image?.url ? <img src={product.image.url} alt={product.name} loading="eager" decoding="async" fetchPriority="high" sizes="(max-width: 768px) 100vw, 48vw" /> : <span>{product.category}</span>}
        </div>

        <div className="detail-info">
          <span className="category">{product.category}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="product-rating-summary">
            <div className="product-stars" aria-label={`تقييم ${product.rating || 0} من 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={18} className={star <= Math.round(Number(product.rating || 0)) ? 'filled' : ''} />
              ))}
            </div>
            <strong>{Number(product.rating || 0).toFixed(1)}</strong>
            <span>{product.numReviews || 0} تقييم</span>
          </div>

          <div className="big-price">{finalUnitPrice} ج.م <small>/ {product.unit}</small></div>
          {selectedAddOns.length ? <p className="muted">سعر الإضافات المختارة: {selectedAddOnsTotal} ج.م</p> : null}
          {measurementLabel ? <p className="muted">الحجم: {measurementLabel}</p> : null}
          <p className="muted">المخزون: {trackedStock ? product.countInStock : 'غير محدد'}</p>

          {product.barcode ? (
            <div className="product-detail-qr-card">
              <div className="product-detail-qr-copy">
                <div className="product-detail-qr-head">
                  <QrCode size={18} />
                  <strong>QR المنتج</strong>
                </div>
                <span>{product.barcode}</span>
                <button type="button" className="secondary-btn product-detail-print-btn" onClick={printQr}>
                  <Printer size={16} />
                  <span>طباعة QR</span>
                </button>
              </div>
              <div className="product-detail-qr-box">
                {qrImage ? <img src={qrImage} alt={`QR ${product.barcode}`} loading="lazy" decoding="async" /> : <div className="admin-product-qr-empty">QR</div>}
              </div>
            </div>
          ) : null}

          {availableAddOns.length ? (
            <section className="product-addons-panel">
              <div className="section-head compact">
                <div>
                  <h2>إضافات المنتج</h2>
                  <span>اختر الإضافات التي تريدها وسيتم تحديث السعر فورًا.</span>
                </div>
              </div>

              <div className="product-addons-grid">
                {availableAddOns.map((addOn) => {
                  const selectedEntry = selectedAddOns.find((entry) => entry._id === addOn._id);
                  const selectedQty = Number(selectedEntry?.qty || 0);
                  return (
                    <div key={addOn._id} className={`product-addon-card${selectedQty > 0 ? ' selected' : ''}`}>
                      <div className="product-addon-thumb">
                        {addOn.image?.url ? <img src={addOn.image.url} alt={addOn.name} loading="lazy" decoding="async" sizes="56px" /> : <span>{addOn.name.slice(0, 1)}</span>}
                      </div>
                      <div className="product-addon-copy">
                        <strong>{addOn.name}</strong>
                        <span>{Number(addOn.price || 0)} ج.م</span>
                        {selectedQty > 0 ? <small>تم اختيار {selectedQty}</small> : null}
                      </div>
                      <div className="product-addon-actions">
                        {selectedQty > 0 ? (
                          <button type="button" className="product-addon-stepper" onClick={() => decrementAddOn(addOn._id)} aria-label={`تقليل ${addOn.name}`}>
                            -
                          </button>
                        ) : null}
                        <span className="product-addon-qty">{selectedQty > 0 ? selectedQty : <Check size={14} className="product-addon-qty-icon" />}</span>
                        <button type="button" className="product-addon-stepper plus" onClick={() => incrementAddOn(addOn)} aria-label={`زيادة ${addOn.name}`}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <input type="number" min="1" max={trackedStock ? product.countInStock : undefined} value={qty} onChange={(event) => setQty(event.target.value)} />
          <div className="detail-actions">
            <button className="primary-btn" onClick={() => addToCart(product, Number(qty), selectedAddOns)} disabled={outOfStock}>أضف للسلة</button>
            <button type="button" className={`wishlist-detail-btn${favorite ? ' active' : ''}`} onClick={() => toggleWishlist(product)}>
              <Heart size={18} /> {favorite ? 'في المفضلة' : 'أضف للمفضلة'}
            </button>
          </div>
        </div>
      </div>

      <section className="product-reviews-panel">
        <div className="section-head compact">
          <div>
            <h2>التعليقات والتقييم</h2>
            <p>{currentUserReview ? 'يمكنك تعديل تقييمك الحالي في أي وقت.' : 'شارك رأيك في المنتج لمساعدة بقية العملاء.'}</p>
          </div>
        </div>

        <form className="product-review-form" onSubmit={submitReview}>
          <label className="product-review-rating">
            <span>تقييمك</span>
            <div className="product-review-stars-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={star <= reviewRating ? 'active' : ''}
                  onClick={() => setReviewRating(star)}
                  aria-label={`اختر ${star} نجوم`}
                >
                  <Star size={18} />
                </button>
              ))}
            </div>
          </label>

          <textarea
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder={currentUserReview ? currentUserReview.comment : 'اكتب تعليقك عن المنتج...'}
          />

          {user ? (
            <button type="submit" className="primary-btn" disabled={submittingReview}>
              {submittingReview ? 'جارٍ الإرسال...' : currentUserReview ? 'تحديث التقييم' : 'إرسال التقييم'}
            </button>
          ) : (
            <Link to="/login" className="primary-btn">سجل الدخول لإضافة تقييم</Link>
          )}
        </form>

        <div className="product-reviews-list">
          {reviews.length ? reviews.map((review) => (
            <article key={review._id} className="product-review-card">
              <div className="product-review-head">
                <div>
                  <strong>{review.name || review.user?.name || 'مستخدم'}</strong>
                  <span>{new Date(review.createdAt || Date.now()).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="product-stars small">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={15} className={star <= Number(review.rating || 0) ? 'filled' : ''} />
                  ))}
                </div>
              </div>
              <p>{review.comment}</p>
            </article>
          )) : (
            <div className="product-reviews-empty">لا توجد تقييمات بعد. كن أول من يضيف رأيه في هذا المنتج.</div>
          )}
        </div>
      </section>
    </div>
  );
}
