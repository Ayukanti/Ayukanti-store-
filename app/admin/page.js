'use client';
import { useState, useEffect } from 'react';
import { supabaseFetch } from '../../lib/supabase';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const ADMIN_PIN = "1234"; // Default Admin PIN

  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Product Form State (Add / Edit)
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
      alert('Galat Security PIN! Please try again.');
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
      // EDIT EXISTING PRODUCT
      await supabaseFetch(`products?id=eq.${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(productPayload)
      });
      alert('Product update ho gaya!');
    } else {
      // ADD NEW PRODUCT
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

  // POS Cart Functions
  const addToPos = (prod) => {
    if (prod.stock <= 0) return alert('Yeh product Out of Stock hai!');
    setCart((prev) => {
      const exist = prev.find((i) => i.id === prod.id);
      if (exist) {
        if (exist.qty >= prod.stock) {
          alert('Stock me itna hi maal available hai!');
          return prev;
        }
        return prev.map((i) => (i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const updatePosQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            if (newQty > item.stock) {
              alert('Stock limit reached!');
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const posTotal = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.qty, 0);

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || !custName) return alert('Cart khali hai ya Customer Name nahi daala!');

    const invoiceNo = 'AYU-POS-' + Date.now().toString().slice(-6);

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

        alert(`Bill Successfully Generated! Invoice: ${invoiceNo}`);
        setCart([]);
        setCustName('');
        setCustPhone('');
        loadData();
      }
    } catch (err) {
      alert('Error generating bill');
    }
  };

  // SECURITY PIN SCREEN
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#041710', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: '#082017', border: '1px solid #D4AF37', padding: '30px', borderRadius: '12px', textAlign: 'center', width: '300px' }}>
          <h2 style={{ color: '#D4AF37', fontFamily: "'Cinzel', serif", margin: '0 0 10px 0' }}>AYUKANTI ADMIN</h2>
          <p style={{ color: '#A0B2A6', fontSize: '13px', marginBottom: '20px' }}>Enter Security PIN (Default: 1234)</p>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '6px', textAlign: 'center', fontSize: '18px', letterSpacing: '4px', boxSizing: 'border-box', marginBottom: '15px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#D4AF37', color: '#041710', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#041710', color: '#F6F1E8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header style={{ background: '#020e0a', borderBottom: '1px solid rgba(212,175,55,0.3)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#D4AF37', fontFamily: "'Cinzel', serif", fontSize: '24px' }}>AYUKANTI POS</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#A0B2A6' }}>ADMINISTRATOR PANEL</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('pos')} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D4AF37', background: activeTab === 'pos' ? '#D4AF37' : 'transparent', color: activeTab === 'pos' ? '#041710' : '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}>Billing (POS)</button>
          <button onClick={() => setActiveTab('products')} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D4AF37', background: activeTab === 'products' ? '#D4AF37' : 'transparent', color: activeTab === 'products' ? '#041710' : '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}>Products</button>
          <button onClick={() => setActiveTab('bills')} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D4AF37', background: activeTab === 'bills' ? '#D4AF37' : 'transparent', color: activeTab === 'bills' ? '#041710' : '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}>Bill History</button>
          <button onClick={() => setIsAuthenticated(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E74C3C', background: '#E74C3C', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}>Lock 🔒</button>
        </div>
      </header>

      <main style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'pos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '25px' }}>
            <div>
              <h2 style={{ color: '#D4AF37', marginBottom: '15px' }}>Select Products</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {products.map((p) => (
                  <div key={p.id} onClick={() => addToPos(p)} style={{ background: '#082017', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', padding: '12px', cursor: 'pointer', opacity: p.stock > 0 ? 1 : 0.6 }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '80px', background: '#041710', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: '24px', marginBottom: '8px' }}>🌿</div>
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Status: {p.stock > 0 ? <span style={{ color: '#2ECC71' }}>🟢 In Stock ({p.stock})</span> : <span style={{ color: '#E74C3C' }}>🔴 Out of Stock</span>}
                    </div>
                    <div style={{ fontSize: '16px', color: '#D4AF37', fontWeight: 'bold', marginTop: '6px' }}>₹{p.price - (p.discount || 0)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#082017', border: '1px solid #D4AF37', borderRadius: '10px', padding: '20px', height: 'fit-content' }}>
              <h2 style={{ color: '#D4AF37', margin: '0 0 15px 0' }}>Current Bill</h2>
              
              <div style={{ marginBottom: '15px' }}>
                <input type="text" placeholder="Customer Name *" value={custName} onChange={(e) => setCustName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#041710', border: '1px solid rgba(212,175,55,0.3)', color: '#FFF', borderRadius: '4px', boxSizing: 'border-box' }} />
                <input type="tel" placeholder="Mobile Number" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={{ width: '100%', padding: '8px', background: '#041710', border: '1px solid rgba(212,175,55,0.3)', color: '#FFF', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ minHeight: '150px', maxHeight: '250px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '10px 0' }}>
                {cart.length === 0 ? <p style={{ color: '#A0B2A6', textAlign: 'center' }}>Cart is empty.</p> : cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '14px', background: '#041710', padding: '8px', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ color: '#D4AF37', fontSize: '12px' }}>₹{(item.price - (item.discount || 0)) * item.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => updatePosQty(item.id, -1)} style={{ background: '#082017', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updatePosQty(item.id, 1)} style={{ background: '#082017', border: '1px solid #D4AF37', color: '#D4AF37', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', margin: '15px 0', color: '#D4AF37' }}>
                <span>Total:</span>
                <span>₹{posTotal}</span>
              </div>

              <button onClick={handleGenerateBill} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #D4AF37, #AA7C11)', color: '#041710', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Print & Save Bill</button>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <form onSubmit={handleSaveProduct} style={{ background: '#082017', border: '1px solid rgba(212,175,55,0.3)', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input type="text" placeholder="Product Name *" value={pName} onChange={(e) => setPName(e.target.value)} required style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              <input type="text" placeholder="Category" value={pCat} onChange={(e) => setPCat(e.target.value)} style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              <input type="number" placeholder="Price (₹) *" value={pPrice} onChange={(e) => setPPrice(e.target.value)} required style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              <input type="number" placeholder="Discount (₹)" value={pDisc} onChange={(e) => setPDisc(e.target.value)} style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              <input type="number" placeholder="Stock Qty *" value={pStock} onChange={(e) => setPStock(e.target.value)} required style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              <input type="url" placeholder="Image URL (http...)" value={pImg} onChange={(e) => setPImg(e.target.value)} style={{ padding: '8px', background: '#041710', border: '1px solid #D4AF37', color: '#FFF', borderRadius: '4px' }} />
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="submit" style={{ flex: 1, padding: '8px', background: '#D4AF37', color: '#041710', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingId ? '✓ Update' : '+ Add Item'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} style={{ padding: '8px', background: '#7A8C82', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                )}
              </div>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#082017' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D4AF37', textAlign: 'left', color: '#D4AF37' }}>
                  <th style={{ padding: '10px' }}>Image</th>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Price</th>
                  <th style={{ padding: '10px' }}>Stock Status</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: '#041710', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌿</div>
                      )}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.name}</td>
                    <td style={{ padding: '10px' }}>{p.category}</td>
                    <td style={{ padding: '10px' }}>₹{p.price - (p.discount || 0)}</td>
                    <td style={{ padding: '10px' }}>
                      {p.stock > 0 ? <span style={{ color: '#2ECC71', fontWeight: 'bold' }}>🟢 In Stock ({p.stock})</span> : <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>🔴 Out of Stock</span>}
                    </td>
                    <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEditProduct(p)} style={{ background: '#3498DB', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>✏️ Edit</button>
                      <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bills' && (
          <div>
            <h2 style={{ color: '#D4AF37' }}>Recent Bills & Sales</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {bills.map((b) => (
                <div key={b.id} style={{ background: '#082017', border: '1px solid rgba(212,175,55,0.2)', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#D4AF37' }}>
                    <span>{b.invoice_no}</span>
                    <span>₹{b.total_amount}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#A0B2A6', marginTop: '5px' }}>
                    Customer: {b.customer_name} ({b.customer_phone || 'N/A'})
                  </div>
                  <div style={{ fontSize: '11px', color: '#7A8C82', marginTop: '5px' }}>
                    Date: {new Date(b.created_at).toLocaleString()}
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
    
