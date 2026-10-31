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
  const [themeMode, setThemeMode] = useState('dark');

  // Ratings State
  const [ratings, setRatings] = useState({});

  const [userPhone, setUserPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const setProductRating = (prodId, star) => {
    setRatings(prev => ({ ...prev, [prodId]: star }));
    alert(`Aapne is product ko ${star} Star rating di hai!`);
  };

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
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

    window.open(`https://wa.me/${MY_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isDark = themeMode === 'dark';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isDark ? '#061E15' : '#FAF7F2', color: isDark ? '#F6F1E8' : '#1A3326', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: isDark ? '#03120C' : '#FFFFFF', borderBottom: '2px solid #FFD700', padding: '12px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🌿</span>
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", margin: 0, color: '#FFD700', fontSize: '22px', letterSpacing: '2px', fontWeight: 'bold' }}>AYUKANTI</h1>
              <p style={{ margin: 0, fontSize: '9px', color: '#C5A059', letterSpacing: '1px', textTransform: 'uppercase' }}>Shuddha Ayurveda</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} style={{ background: 'none', border: 'none', color: '#FFD700', fontSize: '18px', cursor: 'pointer' }}>🔍</button>
            <button onClick={() => setIsCartOpen(true)} style={{ background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🛒</span>
              <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
            </button>
            <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#FFD700', fontSize: '22px', cursor: 'pointer' }}>☰</button>
          </div>
        </div>

        {isSearchOpen && (
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              placeholder="Search Ayurvedic products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid #FFD700', color: isDark ? '#FFF' : '#000', borderRadius: '6px', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>
        )}
      </header>

      <section style={{ textAlign: 'center', padding: '30px 15px', background: isDark ? 'radial-gradient(circle, rgba(12,45,33,1) 0%, rgba(6,30,21,1) 100%)' : '#EFEAE1', borderBottom: '1px solid rgba(255,215,0,0.2)' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#FFD700', fontSize: '24px', margin: '0 0 6px 0' }}>Shuddha Ayurveda, Jeevan Mein Nayee Kanti</h2>
        <p style={{ color: isDark ? '#A0B2A6' : '#4A5D52', fontSize: '12px', margin: 0 }}>100% Pure & Time-Tested Formulations</p>
      </section>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 15px 60px 15px' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: isDark ? '#020905' : '#FFFFFF', border: '1px solid #FFD700', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#FFD700', fontWeight: 'bold' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ background: isDark ? '#061E15' : '#F0F5F2', color: isDark ? '#FFF' : '#000', border: '1px solid #FFD700', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', outline: 'none' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          <div style={{ fontSize: '13px', color: '#FFD700', fontWeight: 'bold' }}>
            Total Products: <span style={{ color: isDark ? '#FFF' : '#1A3326' }}>{filteredProducts.length}</span>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#A0B2A6' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#FFD700' }}>No products found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.map((p) => {
              const finalPrice = p.price - (p.discount || 0);
              const inStock = p.stock > 0;
              const currentRating = ratings[p.id] || 5;

              return (
                <div
                  key={p.id}
                  style={{
                    background: isDark ? '#020905' : '#FFFFFF',
                    borderRadius: '12px',
                    border: '2px solid #FFD700',
                    boxShadow: '0 0 12px rgba(255, 215, 0, 0.25)',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}
                >
                  <div>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '130px', background: isDark ? '#061E15' : '#EFEAE1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '10px' }}>🌿</div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#FFD700', fontWeight: 'bold' }}>{p.category}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: inStock ? '#2ECC71' : '#E74C3C' }}>
                        {inStock ? `🟢 In Stock (${p.stock})` : '🔴 Out'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #FFD700', margin: '6px 0 10px 0' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: isDark ? '#F6F1E8' : '#1A3326', fontWeight: 'bold' }}>{p.name}</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setProductRating(p.id, star)}
                          style={{
                            fontSize: '16px',
                            cursor: 'pointer',
                            color: star <= currentRating ? '#FFD700' : '#444'
                          }}
                        >
                          ★
                        </span>
                      ))}
                      <span style={{ fontSize: '11px', color: '#A0B2A6', marginLeft: '4px' }}>({currentRating}.0)</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFD700' }}>₹{finalPrice}</span>
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
                        onClick={() => { addToCart(p); openShoppingModal(p); }}
                        disabled={!inStock}
                        style={{ padding: '8px 4px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: inStock ? 'pointer' : 'not-allowed' }}
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

      {/* SIDE MENU */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: '80%', maxWidth: '300px', background: isDark ? '#03120C' : '#FFF', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '2px solid #FFD700', boxSizing: 'border-box' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,215,0,0.4)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#FFD700', fontFamily: "'Cinzel', serif" }}>AYUKANTI MENU</h3>
                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ background: isDark ? '#061E15' : '#F0F5F2', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFD700', marginBottom: '6px' }}>👤 Customer Profile</div>
                {isLoggedIn ? (
                  <div style={{ fontSize: '12px' }}>Logged in: {userPhone}</div>
                ) : (
                  <div>
                    <input type="tel" placeholder="Mobile Number" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '6px', background: isDark ? '#020905' : '#FFF', border: '1px solid #FFD700', color: isDark ? '#FFF' : '#000', borderRadius: '4px', boxSizing: 'border-box', fontSize: '11px' }} />
                    <button onClick={() => { if(userPhone) setIsLoggedIn(true); }} style={{ width: '100%', padding: '6px', background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Login</button>
                  </div>
                )}
              </div>

              <div onClick={() => setThemeMode(isDark ? 'light' : 'dark')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '13px' }}>
                <span>🌓 Theme Mode</span>
                <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{isDark ? 'Dark' : 'Light'}</span>
              </div>

              <div onClick={() => window.open(`https://wa.me/${MY_WHATSAPP}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '13px', color: '#2ECC71' }}>
                <span>💬 Direct WhatsApp Support</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '380px', background: isDark ? '#03120C' : '#FFF', borderLeft: '2px solid #FFD700', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,215,0,0.4)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#FFD700', fontFamily: "'Cinzel', serif" }}>Your Shopping Cart</h3>
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
                        <div style={{ fontSize: '11px', color: '#FFD700' }}>₹{(item.price - (item.discount || 0))} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ background: '#061E15', border: '1px solid #FFD700', color: '#FFD700', padding: '2px 6px', borderRadius: '4px' }}>-</button>
                        <span style={{ fontSize: '12px' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ background: '#061E15', border: '1px solid #FFD700', color: '#FFD700', padding: '2px 6px', borderRadius: '4px' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,215,0,0.4)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', marginBottom: '12px', fontSize: '16px' }}>
                  <span>Total Amount:</span>
                  <span>₹{totalCartAmount}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => { window.open(`https://wa.me/${MY_WHATSAPP}?text=Hi, I want to inquire about my cart total ₹${totalCartAmount}`, '_blank'); }} style={{ padding: '10px', background: '#25D366', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                    💬 WhatsApp Inquiry
                  </button>

                  <button onClick={() => { setIsCartOpen(false); openShoppingModal(null); }} style={{ padding: '10px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                    🛍️ Online Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRICTLY VERTICAL STACK ORDER FORM */}
      {isOrderModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <form onSubmit={handleFinalOrderSubmit} style={{ background: isDark ? '#03120C' : '#FFF', border: '2px solid #FFD700', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,215,0,0.4)', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, color: '#FFD700', fontFamily: "'Cinzel', serif", fontSize: '16px' }}>Delivery Address Details</h3>
              <button type="button" onClick={() => setIsOrderModalOpen(false)} style={{ background: 'none', border: 'none', color: isDark ? '#FFF' : '#000', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Full Name *" value={custName} onChange={(e) => setCustName(e.target.value)} required style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="Mobile / WhatsApp Number *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Full Address (House, Street) *" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} required style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Pincode *" value={custPincode} onChange={(e) => setCustPincode(e.target.value)} required style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Taluka" value={custTaluka} onChange={(e) => setCustTaluka(e.target.value)} style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="District" value={custDistrict} onChange={(e) => setCustDistrict(e.target.value)} style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="State" value={custState} onChange={(e) => setCustState(e.target.value)} style={{ width: '100%', padding: '10px', background: isDark ? '#061E15' : '#F0F5F2', border: '1px solid rgba(255,215,0,0.4)', color: isDark ? '#FFF' : '#000', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', marginTop: '15px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Confirm & Order via WhatsApp
            </button>
          </form>
        </div>
      )}

    </div>
  );
          }
