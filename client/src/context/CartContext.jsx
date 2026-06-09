import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const normalizeSelectedAddOns = (selectedAddOns = []) => {
  if (!Array.isArray(selectedAddOns)) return [];

  const seen = new Set();
  return selectedAddOns
    .map((entry) => {
      const id = String(entry?._id || entry?.addOnId || '').trim();
      const name = String(entry?.name || '').trim();
      if (!id || !name || seen.has(id)) return null;
      seen.add(id);
      return {
        _id: id,
        name,
        qty: Math.max(1, Number(entry?.qty || 1)),
        price: Number(entry?.price || 0),
        image: {
          url: String(entry?.image?.url || entry?.image || '').trim()
        }
      };
    })
    .filter(Boolean);
};

const getSelectedAddOnsTotal = (selectedAddOns = []) => normalizeSelectedAddOns(selectedAddOns)
  .reduce((sum, entry) => sum + (Number(entry.price || 0) * Number(entry.qty || 1)), 0);

const buildCartKey = (productId, selectedAddOns = []) => {
  const addOnIds = normalizeSelectedAddOns(selectedAddOns)
    .map((entry) => `${entry._id}:${entry.qty}`)
    .sort();
  return `${productId}::${addOnIds.join(',') || 'base'}`;
};

const normalizeCartItem = (item) => {
  if (!item?._id) return null;

  const selectedAddOns = normalizeSelectedAddOns(item.selectedAddOns);
  const basePrice = Number(item.basePrice ?? item.price ?? 0);
  const addOnsPrice = Number(item.addOnsPrice ?? getSelectedAddOnsTotal(selectedAddOns));

  return {
    ...item,
    qty: Math.max(1, Number(item.qty || 1)),
    basePrice,
    addOnsPrice,
    selectedAddOns,
    cartKey: item.cartKey || buildCartKey(item._id, selectedAddOns),
    price: Number((basePrice + addOnsPrice).toFixed(2))
  };
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(stored) ? stored.map(normalizeCartItem).filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  const readPricingConfig = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('store-settings-public') || 'null');
      return {
        shippingFee: Number(settings?.checkout?.shippingFee ?? 35),
        freeShippingThreshold: Number(settings?.checkout?.freeShippingThreshold ?? 500)
      };
    } catch {
      return { shippingFee: 35, freeShippingThreshold: 500 };
    }
  };

  const [pricingConfig, setPricingConfig] = useState(readPricingConfig);

  const persist = (next) => {
    setItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const addToCart = (product, qty = 1, selectedAddOns = []) => {
    const normalizedAddOns = normalizeSelectedAddOns(selectedAddOns);
    const cartItem = normalizeCartItem({
      ...product,
      qty,
      selectedAddOns: normalizedAddOns,
      cartKey: buildCartKey(product._id, normalizedAddOns)
    });

    const current = items.find((entry) => entry.cartKey === cartItem.cartKey);
    const next = current
      ? items.map((entry) => entry.cartKey === cartItem.cartKey ? { ...entry, qty: entry.qty + cartItem.qty } : entry)
      : [...items, cartItem];

    persist(next);
    toast.success(normalizedAddOns.length ? 'تمت إضافة المنتج بالإضافات إلى السلة' : 'تمت الإضافة إلى السلة');
  };

  const removeFromCart = (cartKey) => persist(items.filter((entry) => entry.cartKey !== cartKey));

  const updateQty = (cartKey, qty) => persist(items.map((entry) => (
    entry.cartKey === cartKey ? { ...entry, qty: Math.max(1, Number(qty)) } : entry
  )));

  const clearCart = () => persist([]);

  useEffect(() => {
    const syncPricing = () => setPricingConfig(readPricingConfig());
    window.addEventListener('store-settings-updated', syncPricing);
    return () => window.removeEventListener('store-settings-updated', syncPricing);
  }, []);

  const totals = useMemo(() => {
    const itemsPrice = Number(items.reduce((sum, item) => (
      sum + Number(item.price || 0) * Number(item.qty || 0)
    ), 0).toFixed(2));
    const shipping = itemsPrice >= pricingConfig.freeShippingThreshold || itemsPrice === 0 ? 0 : pricingConfig.shippingFee;

    return {
      itemsPrice,
      shipping,
      total: itemsPrice + shipping,
      count: items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    };
  }, [items, pricingConfig]);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totals }}>
      {children}
    </CartContext.Provider>
  );
}
