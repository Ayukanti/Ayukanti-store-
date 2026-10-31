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

  // Search & Filters State
  const [posSearch, setPosSearch] = useState('');
  const [historySubTab, setHistorySubTab] = useState('online');
  const [selectedBillDetails, setSelectedBillDetails] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [profitSubTab, setProfitSubTab] = useState('daily');

  // POS State
  const [cart, setCart] = useState([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Product Form State
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
    setPName(''); setPCat(''); setPPrice(''); setPDisc(''); setPStock(''); setPImg('');
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
      return [...prev, { ...prod, qty: 1, unit: 'Pcs' }];
    });
  };

  const updateCartUnit = (id, newUnit) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, unit: newUnit } : item));
  };

  const updatePosQty = (id, delta) => {
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

  const posTotal = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.qty, 0);

  const handleGenerateBill = async (shouldShare = false) => {
    if (cart.length === 0 || !custName) return alert('Customer Name aur Cart Items zaroori hain!');

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
          product_name: `${item.name} (${item.unit || 'Pcs'})`,
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

        if (shouldShare && custPhone) {
          let msg = `*AYUKANTI OFFICIAL RECEIPT*\n`;
          msg += `Invoice: ${invoiceNo}\n`;
          msg += `Customer: ${custName}\n`;
          msg += `Phone: ${custPhone}\n\n`;
          msg += `*ITEMS:*\n`;
          cart.forEach(i => {
            msg += `- ${i.name} (${i.unit || 'Pcs'}) x ${i.qty} = ₹${(i.price - (i.discount || 0)) * i.qty}\n`;
          });
          msg += `\n*TOTAL AMOUNT: ₹${posTotal}*\nThank you for shopping with Ayukanti!🌿`;

          const cleanPhone = custPhone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
          alert(`Bill Saved Successfully! Invoice: ${invoiceNo}`);
        }

        setCart([]); setCustName(''); setCustPhone(''); setCustAddress('');
        loadData();
      }
    } catch (err) {
      alert('Error generating bill');
    }
  };
    const handleDeleteBill = async (billId) => {
    if (confirm('Kya aap sach mein is bill ko permanent delete karna chahte hain?')) {
      try {
        await supabaseFetch(`bills?id=eq.${billId}`, { method: 'DELETE' });
        alert('Bill delete ho gaya!');
        setSelectedBillDetails(null);
        loadData();
      } catch (err) {
        alert('Error deleting bill');
      }
    }
  };

  const handleUpdateBillSubmit = async (e) => {
    e.preventDefault();
    if (!editingBill) return;
    try {
      await supabaseFetch(`bills?id=eq.${editingBill.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          customer_name: editingBill.customer_name,
          customer_phone: editingBill.customer_phone,
          total_amount: parseFloat(editingBill.total_amount) || 0
        })
      });
      alert('Bill successfully update ho gaya!');
      setEditingBill(null);
      loadData();
    } catch (err) {
      alert('Error updating bill');
    }
  };

  const getDailyProfit = () => {
    const dailyMap = {};
    bills.forEach((b) => {
      const dateStr = new Date(b.created_at).toLocaleDateString();
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { sales: 0, count: 0 };
      dailyMap[dateStr].sales += parseFloat(b.total_amount || 0);
      dailyMap[dateStr].count += 1;
    });
    return Object.entries(dailyMap).map(([date, data]) => ({
      label: date, sales: data.sales, count: data.count, profit: Math.round(data.sales * 0.35)
    }));
  };

  const getMonthlyProfit = () => {
    const monthlyMap = {};
    bills.forEach((b) => {
      const d = new Date(b.created_at);
      const monthStr = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { sales: 0, count: 0 };
      monthlyMap[monthStr].sales += parseFloat(b.total_amount || 0);
      monthlyMap[monthStr].count += 1;
    });
    return Object.entries(monthlyMap).map(([month, data]) => ({
      label: month, sales: data.sales, count: data.count, profit: Math.round(data.sales * 0.35)
    }));
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#061E15', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: '#020905', border: '2px solid #FFD700', padding: '25px', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: '320px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌿</div>
          <h2 style={{ color: '#FFD700', fontFamily: "'Cinzel', serif", margin: '0 0 10px 0', fontSize: '20px' }}>AYUKANTI ADMIN</h2>
          <p style={{ color: '#A0B2A6', fontSize: '12px', marginBottom: '20px' }}>Security Access</p>
          <input
            type="password"
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '6px', textAlign: 'center', fontSize: '16px', letterSpacing: '2px', boxSizing: 'border-box', marginBottom: '15px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#061E15', color: '#F6F1E8', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>
      <header style={{ background: '#03120C', borderBottom: '2px solid #FFD700', padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌿</span>
            <h1 style={{ margin: 0, color: '#FFD700', fontFamily: "'Cinzel', serif", fontSize: '18px', letterSpacing: '1px' }}>AYUKANTI ADMIN</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#E74C3C', color: '#FFF', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Lock 🔒</button>
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
                border: activeTab === tab.id ? '2px solid #FFD700' : '1px solid rgba(255,215,0,0.3)',
                background: activeTab === tab.id ? '#FFD700' : '#020905',
                color: activeTab === tab.id ? '#03120C' : '#FFD700',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* TAB 1: PRODUCT */}
        {activeTab === 'products' && (
          <div>
            <div style={{ background: '#020905', border: '1px solid #FFD700', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#FFD700', fontSize: '15px' }}>
                {editingId ? '✏️ Edit Product Details' : '➕ Add New Product'}
              </h3>
              <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Product Name *" value={pName} onChange={(e) => setPName(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Category" value={pCat} onChange={(e) => setPCat(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Price (₹) *" value={pPrice} onChange={(e) => setPPrice(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Discount (₹)" value={pDisc} onChange={(e) => setPDisc(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="number" placeholder="Stock Qty *" value={pStock} onChange={(e) => setPStock(e.target.value)} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="url" placeholder="Image URL (http...)" value={pImg} onChange={(e) => setPImg(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {editingId ? '✓ Update Product' : '+ Add Product'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} style={{ padding: '10px 15px', background: '#555', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ color: '#FFD700', fontSize: '15px', marginBottom: '10px' }}>📦 Product Inventory List</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {products.map((p) => (
                <div key={p.id} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.4)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', background: '#061E15', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌿</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#FFF' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#FFD700' }}>₹{p.price - (p.discount || 0)} | {p.category}</div>
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

        {/* TAB 2: BILLS (POS) WITH SEARCH & UNITS & SAVE / SHARE OPTIONS */}
        {activeTab === 'bills' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setBillSubTab('offline')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: billSubTab === 'offline' ? '#FFD700' : '#020905', color: billSubTab === 'offline' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Offline Billing (POS)
              </button>
              <button
                onClick={() => setBillSubTab('online')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: billSubTab === 'online' ? '#FFD700' : '#020905', color: billSubTab === 'online' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Online Orders Billing
              </button>
            </div>

            <div style={{ background: '#020905', border: '1px solid #FFD700', borderRadius: '8px', padding: '15px' }}>
              <h3 style={{ color: '#FFD700', margin: '0 0 10px 0', fontSize: '15px' }}>
                {billSubTab === 'offline' ? '🛍️ Offline Counter POS' : '🌐 Online Customer Billing'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input type="text" placeholder="Customer Name *" value={custName} onChange={(e) => setCustName(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(255,215,0,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="tel" placeholder="WhatsApp Mobile Number *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(255,215,0,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                {billSubTab === 'online' && (
                  <input type="text" placeholder="Delivery Address" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} style={{ padding: '8px', background: '#061E15', border: '1px solid rgba(255,215,0,0.4)', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                )}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search product for billing..."
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#FFD700', marginBottom: '8px' }}>Select Products:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '15px' }}>
  {
        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setHistorySubTab('online')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: historySubTab === 'online' ? '#FFD700' : '#020905', color: historySubTab === 'online' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                🌐 Online Bills
              </button>
              <button
                onClick={() => setHistorySubTab('offline')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: historySubTab === 'offline' ? '#FFD700' : '#020905', color: historySubTab === 'offline' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                🛍️ Offline Bills
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {bills
                .filter(b => historySubTab === 'online' ? b.invoice_no.includes('ON') : !b.invoice_no.includes('ON'))
                .map((b) => (
                  <div key={b.id} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.4)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', fontSize: '13px' }}>
                      <span>{b.invoice_no}</span>
                      <span>₹{b.total_amount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#FFF' }}>{b.customer_name} ({b.customer_phone || 'N/A'})</span>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setSelectedBillDetails(b)} style={{ background: '#3498DB', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>View 🔍</button>
                        <button onClick={() => setEditingBill(b)} style={{ background: '#F39C12', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Edit ✏️</button>
                        <button onClick={() => handleDeleteBill(b.id)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Delete 🗑️</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#7A8C82', marginTop: '4px' }}>
                      Date: {new Date(b.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: PROFIT */}
        {activeTab === 'profit' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setProfitSubTab('daily')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: profitSubTab === 'daily' ? '#FFD700' : '#020905', color: profitSubTab === 'daily' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                📅 Daily Total Profit
              </button>
              <button
                onClick={() => setProfitSubTab('monthly')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #FFD700', background: profitSubTab === 'monthly' ? '#FFD700' : '#020905', color: profitSubTab === 'monthly' ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                📊 Monthly Total Profit
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {(profitSubTab === 'daily' ? getDailyProfit() : getMonthlyProfit()).map((row, idx) => (
                <div key={idx} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.4)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '13px' }}>{profitSubTab === 'daily' ? '📅 Date:' : '📊 Month:'} {row.label}</div>
                    <div style={{ fontSize: '11px', color: '#A0B2A6', marginTop: '2px' }}>Total Bills: {row.count}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '13px' }}>Sales: ₹{row.sales}</div>
                    <div style={{ color: '#2ECC71', fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>Est. Profit: ₹{row.profit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* BILL DETAILS MODAL */}
      {selectedBillDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: '#020905', border: '2px solid #FFD700', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FFD700', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#FFD700', fontSize: '16px' }}>Invoice: {selectedBillDetails.invoice_no}</h3>
              <button onClick={() => setSelectedBillDetails(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ fontSize: '12px', marginBottom: '10px' }}>
              <div><strong>Type:</strong> {selectedBillDetails.invoice_no.includes('ON') ? '🌐 ONLINE ORDER' : '🛍️ OFFLINE POS'}</div>
              <div><strong>Customer:</strong> {selectedBillDetails.customer_name}</div>
              <div><strong>Phone:</strong> {selectedBillDetails.customer_phone || 'N/A'}</div>
              <div><strong>Date:</strong> {new Date(selectedBillDetails.created_at).toLocaleString()}</div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#FFD700', marginBottom: '6px' }}>Bill Items:</div>
              {selectedBillDetails.bill_items && selectedBillDetails.bill_items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>{item.product_name} x {item.quantity}</span>
                  <span style={{ color: '#FFD700' }}>₹{item.total_price}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', fontSize: '15px', borderTop: '1px solid #FFD700', paddingTop: '8px' }}>
              <span>Total Amount:</span>
              <span>₹{selectedBillDetails.total_amount}</span>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BILL MODAL */}
      {editingBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <form onSubmit={handleUpdateBillSubmit} style={{ background: '#020905', border: '2px solid #FFD700', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FFD700', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#FFD700', fontSize: '16px' }}>Edit Bill: {editingBill.invoice_no}</h3>
              <button type="button" onClick={() => setEditingBill(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#FFD700' }}>Customer Name:</label>
                <input type="text" value={editingBill.customer_name || ''} onChange={(e) => setEditingBill({ ...editingBill, customer_name: e.target.value })} required style={{ width: '100%', padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#FFD700' }}>Customer Phone:</label>
                <input type="tel" value={editingBill.customer_phone || ''} onChange={(e) => setEditingBill({ ...editingBill, customer_phone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#FFD700' }}>Total Amount (₹):</label>
                <input type="number" value={editingBill.total_amount || 0} onChange={(e) => setEditingBill({ ...editingBill, total_amount: e.target.value })} required style={{ width: '100%', padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', color: '#03120C', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              ✓ Update & Save Changes
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
