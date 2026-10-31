'use client';
import { useState, useEffect } from 'react';
import { supabaseFetch } from '../../lib/supabase';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const ADMIN_PIN = "ayukanti@333";

  const [activeTab, setActiveTab] = useState('products');
  const [billSubTab, setBillSubTab] = useState('offline');
  
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDisc, setPDisc] = useState('');
  const [pStock, setPStock] = useState('');
  const [pImg, setPImg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pData = await supabaseFetch('products?select=*&order=id.desc');
      if (Array.isArray(pData)) setProducts(pData);

      const bData = await supabaseFetch('bills?select=*,bill_items(*)&order=created_at.desc');
      if (Array.isArray(bData)) setBills(bData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
    } else {
      alert('Galat Security PIN!');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!pName || !pPrice) return;

    const productPayload = {
      name: pName,
      category: pCat || 'General',
      price: parseFloat(pPrice),
      discount: parseFloat(pDisc) || 0,
      stock: parseInt(pStock) || 0,
      image_url: pImg || ''
    };

    if (editingId) {
      await supabaseFetch(`products?id=eq.${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(productPayload)
      });
      alert('Product update ho gaya!');
    } else {
      await supabaseFetch('products', {
        method: 'POST',
        body: JSON.stringify([productPayload])
      });
      alert('Naya product add ho gaya!');
    }

    resetForm();
    loadData();
  };

  const startEditProduct = (prod) => {
    setEditingId(prod.id);
    setPName(prod.name);
    setPCat(prod.category || '');
    setPPrice(prod.price);
    setPDisc(prod.discount || 0);
    setPStock(prod.stock || 0);
    setPImg(prod.image_url || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setPName('');
    setPCat('');
    setPPrice('');
    setPDisc('');
    setPStock('');
    setPImg('');
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Is product ko delete karna chahte hain?')) {
      await supabaseFetch(`products?id=eq.${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  const addToPos = (prod) => {
    if (prod.stock <= 0) return alert('Out of stock!');
    setCart((prev) => {
      const exist = prev.find((i) => i.id === prod.id);
      if (exist) {
        if (exist.qty >= prod.stock) return prev;
        return prev.map((i) => (i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const posTotal = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.qty, 0);

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || !custName) return alert('Details aur cart items bharein!');

    const prefix = billSubTab === 'online' ? 'AYU-ON-' : 'AYU-OFF-';
    const invoiceNo = prefix + Date.now().toString().slice(-6);

    try {
      const billRes = await supabaseFetch('bills', {
        method: 'POST',
        body: JSON.stringify([{
          invoice_no: invoiceNo,
          customer_name: custName,
          customer_phone: custPhone,
          total_amount: posTotal
        }])
      });

      if (billRes && billRes[0]) {
        const billId = billRes[0].id;

        const items = cart.map((item) => ({
          bill_id: billId,
          product_id: item.id,
          product_name: item.name,
          unit_price: item.price - (item.discount || 0),
          quantity: item.qty,
          total_price: (item.price - (item.discount || 0)) * item.qty
        }));

        await supabaseFetch('bill_items', {
          method: 'POST',
          body: JSON.stringify(items)
        });

        for (const item of cart) {
          const newStock = Math.max(0, item.stock - item.qty);
          await supabaseFetch(`products?id=eq.${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ stock: newStock })
          });
        }

        alert(`Bill Generated! (${invoiceNo})`);
        setCart([]);
        setCustName('');
        setCustPhone('');
        setCustAddress('');
        loadData();
      }
    } catch (err) {
      alert('Error generating bill');
    }
  };

  const getProfitData = () => {
    const dailyMap = {};
    bills.forEach((b) => {
      const dateStr = new Date(b.created_at).toLocaleDateString();
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { totalSales: 0, billCount: 0 };
      }
      dailyMap[dateStr].totalSales += parseFloat(b.total_amount || 0);
      dailyMap[dateStr].billCount += 1;
    });
    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      sales: data.totalSales,
      bills: data.billCount,
      estProfit: Math.round(data.totalSales * 0.35)
    }));
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#061E15', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: '#020905', border: '1px solid #D4AF37', padding: '25px', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: '320px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌿</div>
          <h2 style={{ color: '#D4AF37', fontFamily: "'Cinzel', serif", margin: '0 0 10px 0', fontSize: '20px' }}>AYUKANTI ADMIN</h2>
          <p style={{ color: '#A0B2A6', fontSize: '12px', marginBottom: '20px' }}>Security Access</p>
          <input
            type="password"
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '6px', textAlign: 'center', fontSize: '16px', letterSpacing: '2px', boxSizing: 'border-box', marginBottom: '15px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
        </form>
      </div>
    );
}
  return (
    <div style={{ minHeight: '100vh', background: '#061E15', color: '#F6F1E8', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden', maxWidth: '100vw' }}>
      <header style={{ background: '#03120C', borderBottom: '1px solid rgba(212,175,55,0.4)', padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌿</span>
            <h1 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif", fontSize: '18px', letterSpacing: '1px' }}>AYUKANTI ADMIN</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #E74C3C', background: '#E74C3C', color: '#FFF', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Lock 🔒</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {[
            { id: 'products', label: 'Product' },
            { id: 'bills', label: 'Bills' },
            { id: 'history', label: 'History' },
            { id: 'profit', label: 'Profit' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 2px',
                borderRadius: '6px',
                border: activeTab === tab.id ? '1px solid #D4AF37' : '1px solid rgba(212,175,55,0.2)',
                background: activeTab === tab.id ? '#D4AF37' : '#020905',
                color: activeTab === tab.id ? '#03120C' : '#D4AF37',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box' }}>
        {activeTab === 'products' && (
          <div>
            <div style={{ background: '#020905', border: '1px solid rgba(212,175,55,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#D4AF37', fontSize: '15px' }}>
                {editingId ? '✏️ Edit Product Details' : '➕ Add New Product'}
              </h3>
              <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <input type="text" placeholder="Product Name *" value={pName} onChange={(e) => setPName(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Category" value={pCat} onChange={(e) => setPCat(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Price (₹) *" value={pPrice} onChange={(e) => setPPrice(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Discount (₹)" value={pDisc} onChange={(e) => setPDisc(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Stock Qty *" value={pStock} onChange={(e) => setPStock(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="url" placeholder="Image URL (http...)" value={pImg} onChange={(e) => setPImg(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                
                <div style={{ display: 'flex', gap: '5px', gridColumn: '1 / -1' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {editingId ? '✓ Update Product' : '+ Add Product'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} style={{ padding: '10px 15px', background: '#555', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ color: '#D4AF37', fontSize: '15px', marginBottom: '10px' }}>📦 Product Inventory List</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {products.map((p) => (
                <div key={p.id} style={{ background: '#020905', border: '1px solid rgba(212,175,55,0.3)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', background: '#061E15', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌿</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#D4AF37' }}>₹{p.price - (p.discount || 0)} | {p.category}</div>
                      <div style={{ fontSize: '10px', marginTop: '2px' }}>
                        {p.stock > 0 ? <span style={{ color: '#2ECC71' }}>🟢 Stock: {p.stock}</span> : <span style={{ color: '#E74C3C' }}>🔴 Out of Stock</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => startEditProduct(p)} style={{ background: '#3498DB', color: '#FFF', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setBillSubTab('offline')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #D4AF37', background: billSubTab === 'offline' ? '#D4AF37' : '#020905', color: billSubTab === 'offline' ? '#03120C' : '#D4AF37', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Offline Billing (POS)
              </button>
              <button
                onClick={() => setBillSubTab('online')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #D4AF37', background: billSubTab === 'online' ? '#D4AF37' : '#020905', color: billSubTab === 'online' ? '#03120C' : '#D4AF37', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Online Orders Billing
              </button>
            </div>

            <div style={{ background: '#020905', border: '1px solid #D4AF37', borderRadius: '8px', padding: '15px' }}>
              <h3 style={{ color: '#D4AF37', margin: '0 0 10px 0', fontSize: '15px' }}>
                {billSubTab === 'offline' ? '🛍️ Offline Counter POS' : '🌐 Online Customer Billing'}
              </h3>
              
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                <input type="text" placeholder="Customer Name *" value={custName} onChange={(e) => setCustName(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(212,175,55,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="tel" placeholder="Mobile Number *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(212,175,55,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                {billSubTab === 'online' && (
                  <input type="text" placeholder="Delivery Address" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(212,175,55,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                )}
              </div>

              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#D4AF37', marginBottom: '8px' }}>Select Items to Bill:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '15px' }}>
                {products.map((p) => (
                  <div key={p.id} onClick={() => addToPos(p)} style={{ background: '#061E15', border: '1px solid rgba(212,175,55,0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', opacity: p.stock > 0 ? 1 : 0.5 }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ color: '#D4AF37', fontSize: '11px' }}>₹{p.price - (p.discount || 0)}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Cart Items:</div>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', background: '#061E15', padding: '4px 8px', borderRadius: '4px' }}>
                    <span>{item.name} x {item.qty}</span>
                    <span style={{ color: '#D4AF37' }}>₹{(item.price - (item.discount || 0)) * item.qty}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#D4AF37', margin: '12px 0', fontSize: '16px' }}>
                <span>Total:</span>
                <span>₹{posTotal}</span>
              </div>

              <button onClick={handleGenerateBill} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Generate & Save Bill</button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 style={{ color: '#D4AF37', fontSize: '15px', marginBottom: '10px' }}>📜 Complete Bill History Log</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {bills.map((b) => (
                <div key={b.id} style={{ background: '#020905', border: '1px solid rgba(212,175,55,0.3)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#D4AF37', fontSize: '13px' }}>
                    <span>{b.invoice_no}</span>
                    <span>₹{b.total_amount}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#A0B2A6', marginTop: '4px' }}>
                    Customer: {b.customer_name} ({b.customer_phone || 'N/A'})
                  </div>
                  <div style={{ fontSize: '10px', color: '#7A8C82', marginTop: '4px' }}>
                    Date: {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profit' && (
          <div>
            <h3 style={{ color: '#D4AF37', fontSize: '15px', marginBottom: '10px' }}>📊 Day-Wise Revenue & Estimated Profit</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {getProfitData().map((day, idx) => (
                <div key={idx} style={{ background: '#020905', border: '1px solid rgba(212,175,55,0.3)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '13px' }}>📅 Date: {day.date}</div>
                    <div style={{ fontSize: '11px', color: '#A0B2A6', marginTop: '2px' }}>Total Bills: {day.bills}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '13px' }}>Sales: ₹{day.sales}</div>
                    <div style={{ color: '#2ECC71', fontWeight: 'bold', fontSize: '11px', marginTop: '2px' }}>Est. Profit: ₹{day.estProfit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
                          }
          
