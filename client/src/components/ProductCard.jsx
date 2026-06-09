import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const formatMeasurement = (product) => {
  const value = Number(product?.measurementValue || 0);
  const unit = String(product?.measurementUnit || '').trim();
  return value > 0 && unit ? `${value} ${unit}` : product.unit;
};

const hasTrackedStock = (product) => product?.countInStock !== null && product?.countInStock !== undefined && product?.countInStock !== '';
const isOutOfStock = (product) => hasTrackedStock(product) && Number(product.countInStock) < 1;

const getActiveAddOns = (product) => (Array.isArray(product?.addOns) ? product.addOns.filter((addOn) => addOn?.active !== false) : []);

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { isFavorite, toggleWishlist } = useWishlist();
  const [isAddOnsPromptOpen, setIsAddOnsPromptOpen] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const favorite = isFavorite(product._id);
  const activeAddOns = useMemo(() => getActiveAddOns(product), [product]);

  const resetAddOnsPrompt = () => {
    setSelectedAddOns([]);
    setIsAddOnsPromptOpen(false);
  };

  const incrementAddOn = (addOn) => {
    setSelectedAddOns((current) => {
      const existing = current.find((entry) => entry._id === addOn._id);

      if (existing) {
        return current.map((entry) => (
          entry._id === addOn._id
            ? { ...entry, qty: entry.qty + 1 }
            : entry
        ));
      }

      return [...current, {
        _id: addOn._id,
        name: addOn.name,
        price: Number(addOn.price || 0),
        qty: 1,
        image: { url: addOn.image?.url || '' }
      }];
    });
  };

  const decrementAddOn = (addOnId) => {
    setSelectedAddOns((current) => current.flatMap((entry) => {
      if (entry._id !== addOnId) {
        return [entry];
      }

      if (entry.qty <= 1) {
        return [];
      }

      return [{ ...entry, qty: entry.qty - 1 }];
    }));
  };

  const getAddOnQty = (addOnId) => selectedAddOns.find((entry) => entry._id === addOnId)?.qty || 0;

  const selectedAddOnsTotal = selectedAddOns.reduce((sum, entry) => sum + (Number(entry.price || 0) * Number(entry.qty || 0)), 0);

  const handleAddToCartClick = () => {
    if (isOutOfStock(product)) {
      return;
    }

    if (!activeAddOns.length) {
      addToCart(product);
      return;
    }

    setSelectedAddOns([]);
    setIsAddOnsPromptOpen(true);
  };

  const confirmAddToCart = () => {
    addToCart(product, 1, selectedAddOns);
    resetAddOnsPrompt();
  };

  const addWithoutAddOns = () => {
    addToCart(product);
    resetAddOnsPrompt();
  };

  return <>
    <article className="product-card">
      <Link to={`/product/${product._id}`} className="product-image">
        {product.isDeal && <span className="badge">عرض</span>}
        {product.image?.url ? (
          <img
            src={product.image.url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 360px) 100vw, (max-width: 768px) 50vw, 25vw"
          />
        ) : <div className="placeholder"><ShoppingBasket size={42} /><span>{product.category}</span></div>}
      </Link>

      <div className="product-body">
        <div className="product-topline">
          <span className="category">{product.category}</span>
          <span className="stock-state">{isOutOfStock(product) ? 'نفد' : 'متوفر'}</span>
        </div>
        <Link to={`/product/${product._id}`}><h3>{product.name}</h3></Link>
        <p>{formatMeasurement(product)}</p>
        <div className="price-row">
          <strong>{product.price} ج.م</strong>
          {product.oldPrice > product.price && <del>{product.oldPrice} ج.م</del>}
        </div>
        <div className="product-actions-row">
          <button
            type="button"
            className={`wishlist-mini${favorite ? ' active' : ''}`}
            onClick={() => toggleWishlist(product)}
            aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart size={17} />
          </button>
          <button className="add-mini" onClick={handleAddToCartClick} disabled={isOutOfStock(product)}>
            <Plus size={18} /> أضف للسلة
          </button>
        </div>
      </div>
    </article>

    {isAddOnsPromptOpen && (
      <div className="barcode-scanner-overlay" onClick={resetAddOnsPrompt}>
        <div className="barcode-scanner-modal product-card-addons-modal" onClick={(event) => event.stopPropagation()}>
          <div className="product-card-addons-head">
            <div className="product-card-addons-copy">
              <strong>اختر إضافات مع {product.name}</strong>
              <span>يمكنك الإضافة الآن أو المتابعة بدون إضافات.</span>
            </div>
            <button
              type="button"
              className="product-card-addons-close"
              onClick={resetAddOnsPrompt}
              aria-label="إغلاق نافذة الإضافات"
            >
              <X size={18} />
            </button>
          </div>

          <div className="product-addons-grid product-card-addons-grid">
            {activeAddOns.map((addOn) => {
              const selectedQty = getAddOnQty(addOn._id);

              return (
                <div key={addOn._id} className={`product-addon-card${selectedQty ? ' selected' : ''}`}>
                  <div className="product-addon-thumb">
                    {addOn.image?.url ? <img src={addOn.image.url} alt={addOn.name} loading="lazy" /> : <span>+</span>}
                  </div>

                  <div className="product-addon-copy">
                    <strong>{addOn.name}</strong>
                    <small>+{Number(addOn.price || 0)} ج.م</small>
                    {selectedQty > 0 && <span>تم اختيار {selectedQty}</span>}
                  </div>

                  <div className="product-addon-actions">
                    {selectedQty > 0 && (
                      <>
                        <button
                          type="button"
                          className="product-addon-stepper"
                          onClick={() => decrementAddOn(addOn._id)}
                          aria-label={`تقليل ${addOn.name}`}
                        >
                          <Minus size={15} />
                        </button>
                        <span className="product-addon-qty">{selectedQty}</span>
                      </>
                    )}
                    <button
                      type="button"
                      className="product-addon-stepper plus"
                      onClick={() => incrementAddOn(addOn)}
                      aria-label={`إضافة ${addOn.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="product-card-addons-summary">
            <strong>إجمالي الإضافات: {selectedAddOnsTotal} ج.م</strong>
            <span>سعر المنتج بعد الإضافات: {Number(product.price || 0) + selectedAddOnsTotal} ج.م</span>
          </div>

          <div className="product-card-addons-footer">
            <button type="button" className="secondary-btn" onClick={addWithoutAddOns}>
              إضافة بدون إضافات
            </button>
            <button type="button" className="primary-btn product-card-addons-confirm" onClick={confirmAddToCart}>
              أضف للسلة الآن
            </button>
          </div>
        </div>
      </div>
    )}
  </>;
}
