import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, updateQty, removeFromCart, totals } = useCart();

  return (
    <div className="container page">
      <h1>سلة التسوق</h1>

      {!items.length ? (
        <p>السلة فارغة. <Link to="/">ابدأ التسوق</Link></p>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {items.map((item) => (
              <div className="cart-item" key={item.cartKey || item._id}>
                {item.image?.url ? <img src={item.image.url} alt={item.name} loading="lazy" decoding="async" sizes="80px" /> : null}
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.price} ج.م</p>
                  {item.selectedAddOns?.length ? (
                    <small className="cart-item-addons">
                      الإضافات: {item.selectedAddOns.map((entry) => `${entry.name} × ${entry.qty || 1}`).join(' - ')}
                    </small>
                  ) : null}
                </div>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(event) => updateQty(item.cartKey || item._id, event.target.value)}
                />
                <button onClick={() => removeFromCart(item.cartKey || item._id)}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <aside className="summary">
            <h2>ملخص الطلب</h2>
            <p>المنتجات: {totals.itemsPrice} ج.م</p>
            <p>الشحن: يحدد حسب المحافظة</p>
            <strong>الإجمالي المبدئي: {totals.itemsPrice} ج.م</strong>
            <Link className="primary-btn" to="/checkout">إتمام الشراء</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
