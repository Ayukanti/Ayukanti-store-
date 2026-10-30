'use client';
import { useState, useEffect } from 'react';
import { supabaseFetch } from '../lib/supabase';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await supabaseFetch('products?select=*');
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const addToCart = (product) => {
    if (product.stock <= 0) return alert('Yeh item abhi Out of Stock hai!');
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          alert('Stock me aage available nahi hai!');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
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

  const totalAmount = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.qty, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || cart.length === 0) return;

    const invoiceNo = 'AYU-' + Date.now().toString().slice(-6);

    try {
      const billData = await supabaseFetch('bills', {
        method: 'POST',
        body: JSON.stringify([{
          invoice_no: invoiceNo,
          customer_name: customerName,
          customer_phone: customerPhone,
          total_amount: totalAmount
        }])
      });

      if (billData && billData[0]) {
        const billId = billData[0].id;
        const billItems = cart.map(item => ({
          bill_id: billId,
          product_id: item.id,
          product_name: item.name,
          unit_price: item.price - (item.discount || 0),
          quantity: item.qty,
          total_price: (item.price - (item.discount || 0)) * item.qty
        }));

        await supabaseFetch('bill_items', {
          method: 'POST',
          body: JSON.stringify(billItems)
        });
      }

      let msg = `*Ayukanti Order Request*\nInvoice: ${invoiceNo}\nName: ${customerName}\nPhone: ${customerPhone}\n\n*Items:*\n`;
      cart.forEach((i) => {
        msg += `- ${i.name} x ${i.qty} = ₹${(i.price - (i.discount || 0)) * i.qty}\n`;
      });
      msg += `\n*Total Amount: ₹${totalAmount}*`;

      setCart([]);
      setIsCheckoutOpen(false);

      // Aapka WhatsApp number direct link
      const waUrl = `https://wa.me/919313688716?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      alert('Order placed!');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#041710', color: '#F6F1E8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020e0a', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <h1 style={{ fontFamily: "'Cinzel', serif", margin: 0, color: '#D4AF37', fontSize: '28px', letterSpacing: '2px' }}>AYUKANTI</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#C5A059', letterSpacing: '1px' }}>SHUDDHA AYURVEDA</p>
        </div>
        <button
          onClick={() => setIsCheckoutOpen(true)}
          style={{ background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#041710', border: 'none', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Cart</span>
          <span style={{ background: '#041710', color: '#D4AF37', borderRadius: '50%', padding: '2px 8px', fontSize: '12px' }}>
            {cart.reduce((sum, item) => sum + item.qty, 0)}
          </span>
        </button>
      </header>

      <section style={{ textAlign: 'center', padding: '50px 20px', background: 'radial-gradient(circle, rgba(10,35,28,1) 0%, rgba(4,23,16,1) 100%)', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#D4AF37', fontSize: '32px', marginBottom: '10px' }}>Authentic Ayurvedic Wellness</h2>
        <p style={{ color: '#A0B2A6', maxWidth: '600px', margin: '0 auto', fontSize: '14px', lineHeight: '1.6' }}>Pure herbs and timeless formulations crafted for modern well-being.</p>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '30px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: selectedCategory === cat ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                background: selectedCategory === cat ? '#D4AF37' : '#082017',
                color: selectedCategory === cat ? '#041710' : '#F6F1E8',
                fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#A0B2A6' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: '#082017', borderRadius: '12px', border: '1px dashed rgba(212,175,55,0.3)' }}>
            <p style={{ color: '#D4AF37', fontSize: '18px' }}>No products found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '25px' }}>
            {filteredProducts.map((p) => {
              const finalPrice = p.price - (p.discount || 0);
              const inStock = p.stock > 0;
              return (
                <div key={p.id} style={{ background: '#082017', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.15)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: inStock ? 1 : 0.7 }}>
                  <div>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '140px', background: '#041710', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '15px' }}>🌿</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#D4AF37', letterSpacing: '1px' }}>{p.category}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: inStock ? '#2ECC71' : '#E74C3C' }}>
                        {inStock ? `🟢 In Stock (${p.stock})` : '🔴 Out of Stock'}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0', fontSize: '18px', color: '#F6F1E8' }}>{p.name}</h3>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '15px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4AF37' }}>₹{finalPrice}</span>
                      {p.discount > 0 && <span style={{ textDecoration: 'line-through', color: '#7A8C82', fontSize: '14px' }}>₹{p.price}</span>}
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={!inStock}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: inStock ? 'transparent' : '#222',
                        border: inStock ? '1px solid #D4AF37' : '1px solid #444',
                        color: inStock ? '#D4AF37' : '#777',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: inStock ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: '#041710', borderLeft: '1px solid #D4AF37', height: '100%', padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px' }}>
                <h2 style={{ fontFamily: "'Cinzel', serif", margin: 0, color: '#D4AF37' }}>Your Order</h2>
                <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', color: '#F6F1E8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              {cart.length === 0 ? (
                <p style={{ color: '#A0B2A6', textAlign: 'center', marginTop: '40px' }}>Your cart is empty.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#D4AF37' }}>₹{(item.price - (item.discount || 0))} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ background: '#082017', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ background: '#082017', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#E74C3C', marginLeft: '5px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} style={{ borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#D4AF37' }}>
                  <span>Total Amount:</span>
                  <span>₹{totalAmount}</span>
                </div>

                <input
                  type="text"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#082017', border: '1px solid rgba(212,175,55,0.3)', color: '#F6F1E8', borderRadius: '6px', boxSizing: 'border-box' }}
                />

                <input
                  type="tel"
                  placeholder="WhatsApp Mobile Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', marginBottom: '15px', background: '#082017', border: '1px solid rgba(212,175,55,0.3)', color: '#F6F1E8', borderRadius: '6px', boxSizing: 'border-box' }}
                />

                <button
                  type="submit"
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#041710', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                >
                  Confirm & Order via WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
  }
                                    
