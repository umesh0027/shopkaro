import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiTruck, FiShield, FiRefreshCw, FiHeadphones, FiStar } from 'react-icons/fi';
import { HiSparkles, HiArrowRight } from 'react-icons/hi2';
import { productAPI, categoryAPI } from '../../services/api';
import { bundleAPI } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

import homeVideo from '../../assets/homeVideo.mp4';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/autoplay';
import { Autoplay } from 'swiper/modules';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';

function MarqueeStrip() {
  const items = ['FREE DELIVERY', 'PREMIUM QUALITY', 'EASY RETURNS', 'SECURE PAYMENTS', 'BEST PRICES', '24/7 SUPPORT'];
  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 10s linear infinite; }
      `}</style>
      <div className="overflow-hidden bg-gradient-to-br from-pink-400 to-yellow-500  py-2.5">
        <div className="marquee-track flex whitespace-nowrap">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-8 text-white font-bold text-xs tracking-widest">
              <span className="text-blue-600">✦</span> {item}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Bundle Shimmer Skeleton ── */
const BundleCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <div className="bundle-shimmer h-36 w-full" />
    <div className="p-4 space-y-3">
      <div className="bundle-shimmer h-4 w-3/4" />
      <div className="bundle-shimmer h-3 w-full" />
      <div className="flex gap-2">
        <div className="bundle-shimmer h-6 w-20" />
        <div className="bundle-shimmer h-6 w-20" />
      </div>
      <div className="bundle-shimmer h-9 w-full mt-2" />
    </div>
  </div>
);

/* ── Bundle Card ── */
const BundleCard = ({ bundle }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border-2 border-transparent hover:border-primary-100 hover:shadow-lg transition-all duration-300 group">
    {/* Image / product grid */}
    <div className="h-36 bg-gray-50 relative overflow-hidden">
      {bundle.image?.url ? (
        <img src={bundle.image.url} alt={bundle.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full grid grid-cols-3 gap-1.5 p-2.5">
          {(bundle.products || []).slice(0, 3).map((item, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm">
              <img src={item.product?.images?.[0]?.url} alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      )}
      {/* Savings badge */}
      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
        {bundle.savingsPercent}% OFF
      </div>
      {bundle.isFeatured && (
        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <HiSparkles size={10} /> Featured
        </div>
      )}
    </div>

    <div className="p-4">
      <h3 className="font-bold text-gray-900 mb-1 truncate">{bundle.name}</h3>
      {bundle.description && (
        <p className="text-xs text-gray-400 line-clamp-1 mb-2">{bundle.description}</p>
      )}

      {/* Products pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(bundle.products || []).map((item, i) => (
          <span key={i}
            className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
            {item.product?.name?.split(' ').slice(0, 5).join(' ')}
            {item.quantity > 1 ? ` ×${item.quantity}` : ''}
          </span>
        ))}
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold text-gray-900">₹{bundle.bundlePrice?.toLocaleString()}</span>
        <span className="text-sm text-gray-400 line-through">₹{bundle.originalPrice?.toLocaleString()}</span>
        <span className="text-xs text-green-600 font-bold">Save ₹{bundle.savingsAmount?.toLocaleString()}</span>
      </div>

      <Link to={`/bundles/${bundle._id}`}
        className="block w-full text-center bg-gradient-to-br from-pink-400 to-yellow-500 hover:from-pink-300 hover:to-yellow-400 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95 text-sm">
        View Bundle →
      </Link>
    </div>
  </div>
);


const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featRes, newRes, catRes] = await Promise.all([
          productAPI.getAll({ featured: true, limit: 8 }),
          productAPI.getAll({ sort: '-createdAt', limit: 8 }),
          categoryAPI.getAll({ active: true }),
        ]);
        setFeaturedProducts(featRes.data.products);
        setNewArrivals(newRes.data.products);
         // For home page: show sub-categories (level=1) first, then parents without children 
        const all = catRes.data.flat || catRes.data.categories || [];
        const subCats = all.filter(c => c.level === 1);
        // standalone parents are those with level 0 and no children with level 1
        const standaloneParents = all.filter(c => c.level === 0 && !all.some(ch => ch.level === 1 && (ch.parent?._id || ch.parent)?.toString() === c._id.toString())); 
        setCategories([...subCats, ...standaloneParents].slice(0, 8)); // show max 8 categories on home page

        // setCategories(catRes.data.categories.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

     // 👇 Bundles alag fetch — agar fail bhi ho to page nahi rukta
    bundleAPI.getAll({ featured: true, limit: 4 })
      .then(({ data }) => setBundles(data.bundles || []))
      .catch(() => setBundles([]))
      .finally(() => setBundlesLoading(false));
  }, []);

  // if (loading) return <div className="pt-16"><LoadingSpinner /></div>;
  // ✅ Skeleton Component
  const SkeletonCard = () => (
    <div className="animate-pulse bg-white rounded-2xl p-3 shadow-sm">
      <div className="w-full h-40 bg-gray-200 rounded-xl mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  return (
    <div className="pt-16">
    <MarqueeStrip/>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-pink-700 via-gray-900 to-yellow-900 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96  rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64  rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="page-container py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/10">
                <HiSparkles className="text-accent-400" />
                New Arrivals Every Week
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Discover Products
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-400">
                  You'll Love
                </span>
              </h1>
              <p className="text-white/70 text-lg mb-8 max-w-md leading-relaxed">
                Shop from thousands of premium products with guaranteed quality, fast delivery, and easy returns.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/products" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-2xl hover:bg-primary-50 transition-colors active:scale-95">
                  Shop Now <HiArrowRight />
                </Link>
                <Link to="/about" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-white/10 transition-colors">
                  Learn More
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-12">
                {[
                  { value: '10K+', label: 'Products' },
                  { value: '50K+', label: 'Happy Customers' },
                  { value: '4.8★', label: 'Avg Rating' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="font-display font-bold text-2xl text-white">{stat.value}</p>
                    <p className="text-white/50 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image Grid */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300',
                'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300'
              ].map((url, i) => (
                <div key={i} className={`rounded-2xl overflow-hidden ${i === 0 ? 'row-span-2' : ''}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Promo Video Section */}
<section className="relative w-full h-[60vh] overflow-hidden">
  <video
  src={homeVideo}
  autoPlay
  loop
  muted
  playsInline
  className="w-full h-full object-cover"
/>

  {/* Overlay */}
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
    <div className="text-center text-white px-4">
      <h2 className="text-3xl md:text-5xl font-bold mb-4">
        Shop Smart. Shop Fast.
      </h2>
      <p className="mb-6 text-lg text-white/80">
        Discover trending products at best prices
      </p>
      <Link
        to="/products"
        className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
      >
        Explore Now
      </Link>
    </div>
  </div>
</section>



      {/* Features bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="page-container py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FiTruck, title: 'Free Delivery', desc: 'On orders above ₹499' },
              { icon: FiShield, title: 'Secure Payment', desc: '100% protected' },
              { icon: FiRefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
              { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help' },
            ].map(feature => (
              <div key={feature.title} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <feature.icon className="text-primary-600" size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{feature.title}</p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Ad Slider */}
<section className="py-10 bg-white">
  <div className="page-container">
    <Swiper
      modules={[Autoplay]}
      autoplay={{ delay: 2500 }}
      loop
      spaceBetween={20}
      slidesPerView={1}
    >
      {[
        "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1200",
        "https://images.unsplash.com/photo-1521334884684-d80222895322?w=1200",
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200"
      ].map((img, i) => (
        <SwiperSlide key={i}>
          <div className="rounded-2xl overflow-hidden relative h-[250px] md:h-[350px]">
            <img src={img} className="w-full h-full object-cover" />

            <div className="absolute inset-0 bg-black/30 flex items-center">
              <div className="text-white p-6">
                <h3 className="text-2xl font-bold mb-2">
                  Mega Sale {i + 1}
                </h3>
                <p className="text-sm mb-3">
                  Up to 50% OFF on trending items
                </p>
                <Link
                  to="/products"
                  className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
</section>

      {/* Categories */}
   
<section className="py-16 bg-gray-50">
  <div className="page-container">
    <div className="flex items-end justify-between mb-8">
      <div>
        <p className="text-primary-600 font-semibold text-sm mb-1">Browse by</p>
        <h2 className="section-title">Shop Categories</h2>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
      
      {loading ? (
        [...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl">
            
            {/* icon skeleton */}
            <div className="w-14 h-14 rounded-xl skeleton"></div>

            {/* text skeleton */}
            <div className="w-16 h-3 rounded skeleton"></div>
          </div>
        ))
      ) : categories.length > 0 ? (
        categories.map(cat => (
          <Link
            key={cat._id}
            to={`/products?category=${cat.slug}`}
            className="group flex flex-col items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:shadow-card hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-50 flex items-center justify-center">
              {cat.image?.url ? (
                <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🛍️</span>
              )}
            </div>

            <span className="text-xs font-semibold text-gray-700 text-center group-hover:text-primary-600 transition-colors">
              {cat.name}
            </span>
          </Link>
        ))
      ) : (
        <p className="col-span-full text-center text-gray-800">
          No categories found 🙂
        </p>
      )}

    </div>
  </div>
</section>
      {/* Featured Products */}
     
      <section className="py-16 bg-white">
  <div className="page-container">
    <h2 className="section-title mb-8">Featured Products</h2>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {loading
        ? [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)
        : featuredProducts.length > 0
          ? featuredProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))
          : (
            <p className="col-span-full text-center text-gray-900">
              No featured products found🙂
            </p>
          )
      }
    </div>
  </div>
</section>

  {/* ════════════════════════════════════════
          COMBO OFFERS SECTION  🎁
      ════════════════════════════════════════ */}
      {(bundlesLoading || bundles.length > 0) && (
        <section className="py-16 bg-gray-50">
          <div className="page-container">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                {/* <div className="inline-flex items-center gap-2 bg-accent-400 text-white px-3 py-1 rounded-full text-xl font-bold tracking-wide mb-2">
                  <FiPackage size={40} /> COMBO OFFERS
                </div> */}
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
                <h2 className="section-title">🎁 Frequently Bought Together</h2>
                <p className="text-sm text-gray-500 mt-1">Save more when you buy as a bundle</p>
              </div>
              {!bundlesLoading && bundles.length > 0 && (
                <Link to="/bundles"
                  className="hidden sm:inline-flex items-center gap-2 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors group">
                  View All <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>

            {/* Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {bundlesLoading
                ? [...Array(4)].map((_, i) => <BundleCardSkeleton key={i} />)
                : bundles.map(bundle => <BundleCard key={bundle._id} bundle={bundle} />)
              }
            </div>

            {/* Mobile "View All" link */}
            {!bundlesLoading && bundles.length > 0 && (
              <div className="text-center mt-6 sm:hidden">
                <Link to="/bundles" className="text-primary-600 font-semibold text-sm">
                  View All Combo Offers →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Banner */}
      <section className="py-8 bg-gray-50">
        <div className="page-container">
          <div className="bg-gradient-to-r from-red-600 to-primary-800 rounded-3xl p-10 lg:p-16 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-primary-200 font-semibold text-sm mb-2">Limited Time Offer</p>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Get 20% OFF on First Order</h2>
              <p className="text-primary-200 mb-8 max-w-md">Use code <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold">WELCOME20</span> at checkout</p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-50 transition-colors active:scale-95">
                Claim Offer <HiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
     

      <section className="py-16 bg-white">
  <div className="page-container">
    <h2 className="section-title mb-8">New Arrivals</h2>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      
      {loading ? (
        [...Array(8)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))
      ) : newArrivals.length > 0 ? (
        newArrivals.map(product => (
          <ProductCard key={product._id} product={product} />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-900">
          No new arrivals found🙂
        </p>
      )}

    </div>
  </div>
</section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="text-primary-600 font-semibold text-sm mb-2">What customers say</p>
            <h2 className="section-title">Loved by Thousands</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Priya Sharma', location: 'Mumbai', rating: 5, text: 'Amazing quality products! Delivery was super fast and the packaging was excellent. Will definitely order again.' },
              { name: 'Rahul Gupta', location: 'Delhi', rating: 5, text: 'Great shopping experience. The customer support team is very helpful. Found exactly what I was looking for.' },
              { name: 'Anita Singh', location: 'Bangalore', rating: 5, text: 'Best prices in the market! Products are genuine and the return process was hassle-free.' },
            ].map((review, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex mb-3">
                  {[...Array(review.rating)].map((_, j) => (
                    <FiStar key={j} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <span className="font-bold text-white">{review.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{review.name}</p>
                    <p className="text-xs text-gray-500">{review.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
