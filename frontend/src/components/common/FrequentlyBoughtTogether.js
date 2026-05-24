



import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiShoppingCart, FiCheck,FiPackage } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { bundleAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Inline variant selector (compact) ── */
const InlineVariant = ({ product, selection, onChange }) => {
  const { variantType, colors = [], sizes = [] } = product;
  if (variantType === 'none') return null;

  const availableSizes =
    variantType === 'both' && selection.color?.sizes?.length
      ? selection.color.sizes
      : sizes;

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
      {/* Color */}
      {(variantType === 'color' || variantType === 'both') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium shrink-0">Color:</span>
          {colors.map(c => (
            <button
              key={c.name}
              title={c.name}
              onClick={() => onChange({ ...selection, color: c, size: null })}
              className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                selection.color?.name === c.name
                  ? 'border-indigo-600 scale-110'
                  : 'border-white shadow-sm'
              }`}
              style={{ backgroundColor: c.hex || '#ccc' }}
            />
          ))}
          {selection.color && (
            <span className="text-xs text-indigo-600 font-semibold">{selection.color.name}</span>
          )}
        </div>
      )}

      {/* Size */}
      {(variantType === 'size' || variantType === 'both') && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500 font-medium shrink-0">Size:</span>
          {availableSizes.length === 0 && variantType === 'both' && !selection.color ? (
            <span className="text-xs text-amber-500">Select color first</span>
          ) : (
            availableSizes.map(s => {
              const label = s.label ?? s;
              const oos   = (s.stock ?? 999) === 0;
              return (
                <button
                  key={label}
                  disabled={oos}
                  onClick={() => onChange({ ...selection, size: label })}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                    oos
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : selection.size === label
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                  }`}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

/* ── Bundle card on product page ── */
const BundleCard = ({ bundle }) => {
  const { addToCart }  = useCart();
  const { isLoggedIn } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added,  setAdded]  = useState(false);

  // selections per product
  const [selections, setSelections] = useState(() => {
    const init = {};
    (bundle.products || []).forEach(i => {
      init[i.product._id] = { color: null, size: null };
    });
    return init;
  });

  const validateAll = () => {
    for (const item of bundle.products) {
      const p   = item.product;
      const sel = selections[p._id] || {};
      if ((p.variantType === 'color' || p.variantType === 'both') && !sel.color) {
        toast.error(`Select color for "${p.name.split(' ').slice(0, 5).join(' ')}"`);
        return false;
      }
      if ((p.variantType === 'size' || p.variantType === 'both') && !sel.size) {
        toast.error(`Select size for "${p.name.split(' ').slice(0, 5).join(' ')}"`);
        return false;
      }
    }
    return true;
  };

  // const handleAdd = async () => {
  //   if (!isLoggedIn) { toast.error('Please login'); return; }
  //   if (!validateAll()) return;
  //   setAdding(true);
  //   try {
  //     for (const item of bundle.products) {
  //       const p   = item.product;
  //       const sel = selections[p._id] || {};

  //       // Price
  //       let price = p.discountPrice > 0 ? p.discountPrice : p.price;
  //       const sizesArr = sel.color?.sizes?.length ? sel.color.sizes : p.sizes;
  //       const sizeObj  = sizesArr?.find(s => (s.label ?? s) === sel.size);
  //       if (sizeObj?.price) price = sizeObj.price;

  //       // Stock
  //       let stock = sizeObj?.stock ?? sel.color?.stock ?? p.stock;

  //       // Image
  //       const cartImage = sel.color?.images?.[0]?.url || p.images?.[0]?.url || '';

  //       addToCart({
  //         ...p,
  //         price,
  //         originalPrice:    p.price,
  //         selectedColor:    sel.color?.name  || null,
  //         selectedColorHex: sel.color?.hex   || null,
  //         selectedSize:     sel.size         || null,
  //         stock,
  //         image: cartImage,
  //       }, item.quantity);

  //       await new Promise(r => setTimeout(r, 60));
  //     }
  //     setAdded(true);
  //     toast.success(`🛍️ ${bundle.products.length} items added!`);
  //     setTimeout(() => setAdded(false), 3000);
  //   } catch {
  //     toast.error('Failed to add bundle');
  //   } finally {
  //     setAdding(false);
  //   }
  // };
const handleAdd = async () => {
  if (!isLoggedIn) { toast.error('Please login'); return; }
  if (!validateAll()) return;

  setAdding(true);

  try {
    const bundleProducts = bundle.products.map(item => {
      const p   = item.product;
      const sel = selections[p._id] || {};

      let price = p.discountPrice > 0 ? p.discountPrice : p.price;

      const sizesArr = sel.color?.sizes?.length ? sel.color.sizes : p.sizes;
      const sizeObj  = sizesArr?.find(s => (s.label ?? s) === sel.size);

      if (sizeObj?.price) price = sizeObj.price;

      const stock = sizeObj?.stock ?? sel.color?.stock ?? p.stock;

      const image =
        sel.color?.images?.[0]?.url ||
        p.images?.[0]?.url ||
        '';

      return {
        _id: p._id,
        name: p.name,
        image,
        quantity: item.quantity,

        // ✅ variants
        selectedColor: sel.color?.name || null,
        selectedColorHex: sel.color?.hex || null,
        selectedSize: sel.size || null,

        price,
        stock
      };
    });

    // ✅ FINAL: bundle ek hi item ki tarah add hoga
    addToCart({
      _id: bundle._id,
      name: bundle.name,
      type: 'bundle',
      price: bundle.bundlePrice,
      originalPrice: bundle.originalPrice,
      products: bundleProducts,
      quantity: 1,
      image: bundleProducts[0]?.image || ''
    });

    setAdded(true);
    toast.success('🎁 Bundle added to cart!');
    setTimeout(() => setAdded(false), 3000);

  } catch {
    toast.error('Failed to add bundle');
  } finally {
    setAdding(false);
  }
};
  return (
    <div className="border-2 border-gray-100 rounded-3xl overflow-hidden hover:border-accent-400 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="font-bold text-gray-900">{bundle.name}</h3>
          {bundle.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{bundle.description}</p>
          )}
        </div>
        <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full ml-3">
          {bundle.savingsPercent}% OFF
        </span>
      </div>

      {/* Products with inline variant selectors */}
      <div className="px-5 pb-4 space-y-3">
        {(bundle.products || []).map((item, idx) => {
          const p   = item.product;
          const sel = selections[p._id] || {};
          const needsVariant = p.variantType !== 'none';
          const isValid =
            (!needsVariant) ||
            ((p.variantType !== 'color' && p.variantType !== 'both') || sel.color) &&
            ((p.variantType !== 'size'  && p.variantType !== 'both') || sel.size);

          return (
            <React.Fragment key={p._id}>
              {/* Product chip */}
              <div className={`rounded-2xl border p-3 transition-all ${
                needsVariant && !isValid
                  ? 'border-amber-200 bg-amber-50/30'
                  : needsVariant && isValid
                  ? 'border-green-200 bg-green-50/20'
                  : 'border-gray-100 bg-white'
              }`}>
                <div className="flex items-center gap-3">
                  <img
                    src={sel.color?.images?.[0]?.url || p.images?.[0]?.url}
                    alt={p.name}
                    className="w-11 h-11 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${p.slug || p._id}`}
                      className="text-sm font-semibold text-gray-900 truncate hover:text-primary-600 transition-colors block">
                      {p.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      ₹{(p.discountPrice > 0 ? p.discountPrice : p.price).toLocaleString()}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                      {needsVariant && !isValid && (
                        <span className="text-amber-500 ml-1 font-semibold">⚠ Choose variant</span>
                      )}
                      {needsVariant && isValid && (
                        <span className="text-green-600 ml-1 font-semibold">✓</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Variant selector */}
                <InlineVariant
                  product={p}
                  selection={sel}
                  onChange={newSel =>
                    setSelections(prev => ({ ...prev, [p._id]: newSel }))
                  }
                />
              </div>

              {/* Plus icon between products */}
              {idx < bundle.products.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <FiPlus size={14} className="text-gray-500" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Price + CTA */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary-50 to-accent-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              ₹{bundle.bundlePrice?.toLocaleString()}
            </span>
            <span className="text-sm text-gray-400 line-through">
              ₹{bundle.originalPrice?.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-green-600 font-semibold">
            Save ₹{bundle.savingsAmount?.toLocaleString()} on this bundle
          </p>
        </div>

        <button
          onClick={handleAdd}
          disabled={adding}
          className={`flex items-center gap-2 font-bold px-6 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-70 ${
            added
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-br from-pink-400 to-yellow-500 text-white shadow-sm shadow-primary-200'
          }`}
        >
          {adding ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding...
            </>
          ) : added ? (
            <><FiCheck size={16} /> Added!</>
          ) : (
            <><FiShoppingCart size={16} /> Add Bundle to Cart</>
          )}
        </button>
      </div>
    </div>
  );
};

/* ══ MAIN EXPORT ══ */
const FrequentlyBoughtTogether = ({ productId }) => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    bundleAPI.getByProduct(productId)
      .then(({ data }) => setBundles(data.bundles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || bundles.length === 0) return null;

  return (
    <section className="mt-12">
             <div className="relative inline-flex items-center gap-3 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-400 text-white px-5 py-2 rounded-full text-xl font-bold tracking-wide mb-3 overflow-hidden">
      
        {/* ✨ Sparkle dots */}
        <span className="absolute w-2 h-2 bg-white rounded-full top-1 left-3 animate-ping"></span>
        <span className="absolute w-2 h-2 bg-white rounded-full bottom-1 right-4 animate-ping delay-200"></span>
        <span className="absolute w-1.5 h-1.5 bg-white rounded-full top-2 right-8 animate-ping delay-500"></span>
      
        {/* 🎉 Icon with bounce */}
        <FiPackage size={40} className="animate-bounce" />
      
        {/* 🎊 Text */}
        <span className="relative z-10 text-xl">🎉 COMBO OFFERS 🎉</span>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <HiSparkles className="text-yellow-500 text-xl" />
        <h2 className="font-display text-xl font-bold text-gray-900">
          Frequently Bought Together
        </h2>
      </div>
      <div className="space-y-5">
        {bundles.map(bundle => (
          <BundleCard key={bundle._id} bundle={bundle} />
        ))}
      </div>
    </section>
  );
};

export default FrequentlyBoughtTogether;