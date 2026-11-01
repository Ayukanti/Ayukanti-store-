'use client';
import { useState, useEffect } from 'react';
import { supabaseFetch } from '../lib/supabase';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [themeMode, setThemeMode] = useState('dark');

  const [productRatings, setProductRatings] = useState({});
  const [activeImageIndexes, setActiveImageIndexes] = useState({});

  const [userPhone, setUserPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);

  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPincode, setCustPincode] = useState('');
  const [custTaluka, setCustTaluka] = useState('');
  const [custDistrict, setCustDistrict] = useState('');
  const [custState, setCustState] = useState('');

  const MY_WHATSAPP = "919313688716";

  useEffect(() => {
    fetchProducts();
    fetchRatings();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await supabaseFetch('products?select=*');
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      const data = await supabaseFetch('product_ratings?select=*');
      if (Array.isArray(data)) {
        const ratingMap = {};
        data.forEach(r => {
          if (!ratingMap[r.product_id]) ratingMap[r.product_id] = [];
          ratingMap[r.product_id].push(r.rating);
        });
        const finalAvg = {};
        Object.keys(ratingMap).forEach(pId => {
          const arr = ratingMap[pId];
          const sum = arr.reduce((a, b) => a + b, 0);
          finalAvg[pId] = (sum / arr.length).toFixed(1);
        });
        setProductRatings(finalAvg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRateProduct = async (prodId, star) => {
    if (!isLoggedIn) return alert('Pehle Mobile Number se Login karein rating dene ke liye!');
    try {
      await supabaseFetch('product_ratings', {
        method: 'POST',
        body: JSON.stringify([{ product_id: prodId, user_phone: userPhone, rating: star }])
      });
      alert(`Aapne ${star} Star rating successfully di hai!`);
      fetchRatings();
    } catch (err) {
      alert('Rating save nahi ho saki.');
    }
  };

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleLogin = () => {
    if (!userPhone || userPhone.length < 10) return alert('Sahi mobile number dalein!');
    setIsLoggedIn(true);
    fetchCustomerHistory(userPhone);
    alert('Successfully Logged In!');
  };

  const fetchCustomerHistory = async (phone) => {
    try {
      const data = await supabaseFetch(`bills?customer_phone=eq.${phone}&select=*,bill_items(*)`);
      if (Array.isArray(data)) setCustomerOrders(data);
    } catch (err) {
      console.error(err);
    }
  };
    const addToCart = (product) => {
    if (!isLoggedIn) {
      alert('Product buy karne ke liye pehle mobile number se login karna zaroori hai!');
      setIsMenuOpen(true);
      return;
    }
    if (product.stock <= 0) return alert('Out of Stock!');
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.qty, 0);

  const handleWhatsAppInquiry = (prod) => {
    const text = `*Ayukanti Product Inquiry*\nProduct: ${prod.name}\nPrice: ₹${prod.price - (prod.discount || 0)}\n\nHello, I want to inquire about this product.`;
    window.open(`https://wa.me/${MY_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openShoppingModal = (prod = null) => {
    if (!isLoggedIn) {
      alert('Order karne ke liye pehle mobile number se login karein!');
      setIsMenuOpen(true);
      return;
    }
    setOrderModalProduct(prod);
    setIsOrderModalOpen(true);
  };

  const handleFinalOrderSubmit = async (e) => {
    e.preventDefault();
    if (!custName || !custPhone || !custAddress || !custPincode) return alert('Sari zaroori details bharein!');

    const orderItems = orderModalProduct 
      ? [{ ...orderModalProduct, qty: 1 }] 
      : cart;

    if (orderItems.length === 0) return;

    const totalAmt = orderItems.reduce((sum, i) => sum + (i.price - (i.discount || 0)) * i.qty, 0);
    const invoiceNo = 'AYU-ON-' + Date.now().toString().slice(-6);

    try {
      const billData = await supabaseFetch('bills', {
        method: 'POST',
        body: JSON.stringify([{
          invoice_no: invoiceNo,
          customer_name: custName,
          customer_phone: custPhone,
          total_amount: totalAmt
        }])
      });

      if (billData && billData[0]) {
        const billId = billData[0].id;
        const bItems = orderItems.map(item => ({
          bill_id: billId,
          product_id: item.id,
          product_name: item.name,
          unit_price: item.price - (item.discount || 0),
          quantity: item.qty,
          total_price: (item.price - (item.discount || 0)) * item.qty
        }));

        await supabaseFetch('bill_items', {
          method: 'POST',
          body: JSON.stringify(bItems)
        });
      }
    } catch (err) {
      console.error(err);
    }

    let msg = `*NEW ONLINE ORDER (${invoiceNo})*\n`;
    msg += `------------------------------\n`;
    msg += `*Name:* ${custName}\n`;
    msg += `*Phone:* ${custPhone}\n`;
    msg += `*Address:* ${custAddress}\n`;
    msg += `*Taluka:* ${custTaluka} | *District:* ${custDistrict}\n`;
    msg += `*State:* ${custState} | *Pincode:* ${custPincode}\n\n`;
    msg += `*ORDER ITEMS:*\n`;
    orderItems.forEach((i) => {
      msg += `- ${i.name} x ${i.qty} = ₹${(i.price - (i.discount || 0)) * i.qty}\n`;
    });
    msg += `\n*TOTAL AMOUNT: ₹${totalAmt}*`;

    if (!orderModalProduct) setCart([]);
    setIsOrderModalOpen(false);
    fetchCustomerHistory(custPhone);

    window.open(`https://wa.me/${MY_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isDark = themeMode === 'dark';
    return (
    <div style={{ minHeight: '100vh', backgroundColor: isDark ? '#061E15' : '#FAF7F2', color: isDark ? '#F6F1E8' : '#1A3326', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* HEADER WITH LOGO SLOT AT TOP LEFT */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: isDark ? '#03120C' : '#FFFFFF', borderBottom: '1px solid rgba(212,175,55,0.4)', padding: '10px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ height: '38px', width: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #FFF' }}>🌿</div>
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", margin: 0, color: '#D4AF37', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold' }}>AYUKANTI</h1>
              <p style={{ margin: 0, fontSize: '8px', color: '#C5A059', letterSpacing: '1px', textTransform: 'uppercase' }}>Shuddha Ayurveda</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '18px', cursor: 'pointer' }}>🔍</button>
            <button onClick={() => setIsCartOpen(true)} style={{ background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🛒</span>
              <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
            </button>
            <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '22px', cursor: 'pointer' }}>☰</button>
          </div>
        </div>

        {isSearchOpen && (
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              placeholder="Search Ayurvedic products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid #D4AF37', color: isDark ? '#FFF' : '#000', borderRadius: '6px', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>
        )}
      </header>

      {/* HERO BANNER WITH BRAND & PREMIUM TAGLINE */}
      <section style={{ textAlign: 'center', padding: '35px 15px', background: isDark ? 'radial-gradient(circle, rgba(12,45,33,1) 0%, rgba(6,30,21,1) 100%)' : '#EFEAE1', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ display: 'inline-block', marginBottom: '10px', height: '65px', width: '65px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', lineHeight: '65px', fontSize: '32px', border: '2px solid #FFF', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' }}>🌿</div>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#D4AF37', fontSize: '22px', margin: '0 0 8px 0', letterSpacing: '1px' }}>AYUKANTI</h2>
        <p style={{ fontFamily: "'Cinzel', serif", color: isDark ? '#F6F1E8' : '#2C3E50', fontSize: '14px', fontStyle: 'italic', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5', fontWeight: '500' }}>
          "Aapke swasthya aur saundarya ka sachcha sathi — Ayukanti."
        </p>
      </section>

      {/* MAIN PRODUCTS GRID */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 15px 60px 15px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: isDark ? '#020905' : '#FFFFFF', border: '1px solid rgba(212,175,55,0.3)', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 'bold' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ background: isDark ? '#061E15' : '#F0F5F2', color: isDark ? '#FFF' : '#000', border: '1px solid #D4AF37', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', outline: 'none' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 'bold' }}>
            Products: <span style={{ color: isDark ? '#FFF' : '#1A3326' }}>{filteredProducts.length}</span>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#A0B2A6' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#D4AF37' }}>No products found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.map((p) => {
              const finalPrice = p.price - (p.discount || 0);
              const inStock = p.stock > 0;
              
              let images = [];
              if (p.image_url) {
                images = p.image_url.includes(',') ? p.image_url.split(',').map(s => s.trim()) : [p.image_url];
              } else {
                images = [''];
              }
              const currentImgIdx = activeImageIndexes[p.id] || 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: isDark ? '#0B291F' : '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    {/* MULTIPLE IMAGE HORIZONTAL SLIDER WITH DOTS */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      {images[0] ? (
                        <div>
                          <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', borderRadius: '8px', height: '160px' }}
                               onScroll={(e) => {
                                 const index = Math.round(e.target.scrollLeft / e.target.clientWidth);
                                 setActiveImageIndexes(prev => ({ ...prev, [p.id]: index }));
                               }}>
                            {images.map((imgSrc, idx) => (
                              <img key={idx} src={imgSrc} alt={`${p.name} ${idx}`} style={{ minWidth: '100%', height: '160px', objectFit: 'cover', scrollSnapAlign: 'start', borderRadius: '8px' }} />
                            ))}
                          </div>
                          {images.length > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '6px' }}>
                              {images.map((_, dotIdx) => (
                                <span key={dotIdx} style={{ height: '6px', width: dotIdx === currentImgIdx ? '16px' : '6px', borderRadius: '3px', background: dotIdx === currentImgIdx ? '#D4AF37' : 'rgba(212,175,55,0.4)', transition: 'all 0.3s' }} />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '140px', background: isDark ? '#061E15' : '#EFEAE1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>🌿</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 'bold' }}>{p.category}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: inStock ? '#2ECC71' : '#E74C3C' }}>
                        {inStock ? `🟢 In Stock (${p.stock})` : '🔴 Out'}
                      </span>
                    </div>

                    {/* PRODUCT NAME BOX WITH ROUNDED CORNERS & CUSTOM BACKGROUND */}
                    <div style={{ background: isDark ? '#020D09' : '#EAEFEA', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)', margin: '10px 0' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: isDark ? '#F6F1E8' : '#1A3326', fontWeight: 'bold' }}>{p.name}</h3>
                    </div>

                    {/* GENUINE AVERAGE STAR RATING */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => handleRateProduct(p.id, star)}
                          style={{
                            fontSize: '16px',
                            cursor: 'pointer',
                            color: star <= Math.round(productRatings[p.id] || 5) ? '#D4AF37' : '#555'
                          }}
                        >
                          ★
                        </span>
                      ))}
                      <span style={{ fontSize: '11px', color: '#A0B2A6', marginLeft: '4px' }}>({productRatings[p.id] || '5.0'})</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4AF37' }}>₹{finalPrice}</span>
                      {p.discount > 0 && <span style={{ textDecoration: 'line-through', color: '#7A8C82', fontSize: '12px' }}>₹{p.price}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => handleWhatsAppInquiry(p)}
                        style={{ padding: '8px 4px', background: '#25D366', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <span>💬</span> WhatsApp
                      </button>

                      <button
                        onClick={() => { addToCart(p); if(isLoggedIn) openShoppingModal(p); }}
                        disabled={!inStock}
                        style={{ padding: '8px 4px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: inStock ? 'pointer' : 'not-allowed' }}
                      >
                        🛍️ Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
                
            {/* MENU DRAWER WITH HISTORY FIRST & MANDATORY LOGIN */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: '80%', maxWidth: '300px', background: isDark ? '#03120C' : '#FFF', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #D4AF37', boxSizing: 'border-box', overflowY: 'auto' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(212,175,55,0.4)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif" }}>AYUKANTI MENU</h3>
                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {/* HISTORY OPTION FIRST IN MENU */}
              <div onClick={() => { setIsMenuOpen(false); setIsHistoryOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#D4AF37' }}>
                <span>📜</span> Customer Order History
              </div>

              {/* MANDATORY LOGIN SECTION */}
              <div style={{ background: isDark ? '#061E15' : '#F0F5F2', padding: '12px', borderRadius: '8px', margin: '15px 0' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '6px' }}>👤 Mandatory Login (Mobile)</div>
                {isLoggedIn ? (
                  <div style={{ fontSize: '12px', color: '#2ECC71', fontWeight: 'bold' }}>✓ Logged In: {userPhone}</div>
                ) : (
                  <div>
                    <input type="tel" placeholder="Enter Mobile Number *" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '6px', background: isDark ? '#020905' : '#FFF', border: '1px solid #D4AF37', color: isDark ? '#FFF' : '#000', borderRadius: '4px', boxSizing: 'border-box', fontSize: '11px' }} />
                    <button onClick={handleLogin} style={{ width: '100%', padding: '6px', background: '#D4AF37', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Login / Verify</button>
                  </div>
                )}
              </div>

              <div onClick={() => setThemeMode(isDark ? 'light' : 'dark')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '13px' }}>
                <span>🌓 Theme Mode</span>
                <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{isDark ? 'Dark' : 'Light'}</span>
              </div>

              <div onClick={() => window.open(`https://wa.me/${MY_WHATSAPP}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '13px', color: '#2ECC71' }}>
                <span>💬 Direct WhatsApp Support</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER ORDER HISTORY MODAL */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: isDark ? '#03120C' : '#FFF', border: '2px solid #D4AF37', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #D4AF37', paddingBottom: '8px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif" }}>Your Order History</h3>
              <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {!isLoggedIn ? (
              <p style={{ textAlign: 'center', color: '#E74C3C', fontSize: '13px' }}>Pehle menu me jaakar mobile number se login karein apni history dekhne ke liye.</p>
            ) : customerOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#A0B2A6', fontSize: '13px' }}>Aapne abhi tak koi order nahi diya hai.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {customerOrders.map((ord) => (
                  <div key={ord.id} style={{ background: isDark ? '#061E15' : '#F0F5F2', padding: '12px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#D4AF37', fontSize: '13px' }}>
                      <span>{ord.invoice_no}</span>
                      <span>₹{ord.total_amount}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: isDark ? '#CCC' : '#555', margin: '4px 0' }}>
                      Date: {new Date(ord.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '4px' }}>
                      {ord.bill_items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.product_name} x {item.quantity}</span>
                          <span style={{ color: '#D4AF37' }}>₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '380px', background: isDark ? '#03120C' : '#FFF', borderLeft: '1px solid #D4AF37', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(212,175,55,0.4)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif" }}>Your Shopping Cart</h3>
                <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {cart.length === 0 ? (
                <p style={{ color: '#A0B2A6', textAlign: 'center', marginTop: '30px' }}>Cart is empty.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#D4AF37' }}>₹{(item.price - (item.discount || 0))} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ background: '#061E15', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 6px', borderRadius: '4px' }}>-</button>
                        <span style={{ fontSize: '12px' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ background: '#061E15', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 6px', borderRadius: '4px' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(212,175,55,0.4)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#D4AF37', marginBottom: '12px', fontSize: '16px' }}>
                  <span>Total Amount:</span>
                  <span>₹{totalCartAmount}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => { window.open(`https://wa.me/${MY_WHATSAPP}?text=Hi, I want to inquire about my cart total ₹${totalCartAmount}`, '_blank'); }} style={{ padding: '10px', background: '#25D366', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                    💬 WhatsApp Inquiry
                  </button>

                  <button onClick={() => { setIsCartOpen(false); openShoppingModal(null); }} style={{ padding: '10px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                    🛍️ Online Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER MODAL */}
      {isOrderModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <form onSubmit={handleFinalOrderSubmit} style={{ background: isDark ? '#03120C' : '#FFF', border: '1px solid #D4AF37', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(212,175,55,0.4)', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif", fontSize: '16px' }}>Delivery Address Details</h3>
              <button type="button" onClick={() => setIsOrderModalOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <input type="text" placeholder="Full Name *" value={custName} onChange={(e) => setCustName(e.target.value)} required style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
              <input type="tel" placeholder="Mobile / WhatsApp Number *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
              <input type="text" placeholder="Full Address (House, Street) *" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} required style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" placeholder="Pincode *" value={custPincode} onChange={(e) => setCustPincode(e.target.value)} required style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Taluka" value={custTaluka} onChange={(e) => setCustTaluka(e.target.value)} style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="text" placeholder="District" value={custDistrict} onChange={(e) => setCustDistrict(e.target.value)} style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="State" value={custState} onChange={(e) => setCustState(e.target.value)} style={{ padding: '8px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(212,175,55,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', marginTop: '15px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Confirm & Order via WhatsApp
            </button>
          </form>
        </div>
      )}

    </div>
  );
                                                                    }
                     
