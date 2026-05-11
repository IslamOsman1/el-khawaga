import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, ShoppingBasket } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const formatMeasurement = (product) => {
  const value = Number(product?.measurementValue || 0);
  const unit = String(product?.measurementUnit || '').trim();
  return value > 0 && unit ? `${value} ${unit}` : product.unit;
};

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { isFavorite, toggleWishlist } = useWishlist();
  const favorite = isFavorite(product._id);

  return <article className="product-card">
    <Link to={`/product/${product._id}`} className="product-image">
      {product.isDeal && <span className="badge">عرض</span>}
      {product.image?.url ? <img src={product.image.url} alt={product.name} /> : <div className="placeholder"><ShoppingBasket size={42} /><span>{product.category}</span></div>}
    </Link>

    <div className="product-body">
      <div className="product-topline">
        <span className="category">{product.category}</span>
        <span className="stock-state">{product.countInStock > 0 ? 'متوفر' : 'نفد'}</span>
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
        <button className="add-mini" onClick={() => addToCart(product)} disabled={product.countInStock < 1}>
          <Plus size={18} /> أضف للسلة
        </button>
      </div>
    </div>
  </article>;
}
