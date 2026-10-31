'use client';
import { useState, useEffect } from 'react';
import { supabaseFetch } from '../../lib/supabase';

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState('products');
  const [billType, setBillType] = useState('offline');
  const [historyType, setHistoryType] = useState('online');
  const [profitType, setProfitType] = useState('daily');
  
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  const [cust, setCust] = useState({ name: '', phone: '', addr: '' });
  const [pForm, setPForm] = useState({ id: null, name: '', cat: '', price: '', disc: '', stock: '', img: '' });
  const [viewBill, setViewBill] = useState(null);
  const [editBill, setEditBill] = useState(null);

  useEffect(() => { if (auth) loadData(); }, [auth]);

  const loadData = async () => {
    try {
      const p = await supabaseFetch('products?select=*&order=id.desc');
      if (Array.isArray(p)) setProducts(p);
      const b = await supabaseFetch('bills?select=*,bill_items(*)&order=created_at.desc');
      if (Array.isArray(b)) setBills(b);
    } catch (e) { console.error(e); }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!pForm.name || !pForm.price) return;
    const body = { name: pForm.name, category: pForm.cat || 'General', price: parseFloat(pForm.price), discount: parseFloat(pForm.disc) || 0, stock: parseInt(pForm.stock) || 0, image_url: pForm.img || '' };
    if (pForm.id) {
      await supabaseFetch(`products?id=eq.${pForm.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await supabaseFetch('products', { method: 'POST', body: JSON.stringify([body]) });
    }
    setPForm({ id: null, name: '', cat: '', price: '', disc: '', stock: '', img: '' });
    loadData();
  };

  const handleDeleteProd = async (id) => {
    if (confirm('Delete this product?')) {
      await supabaseFetch(`products?id=eq.${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  const addToCart = (p) => {
    if (p.stock <= 0) return alert('Out of stock!');
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...p, qty: 1, unit: 'Pcs' }];
    });
  };

  const posTotal = cart.reduce((s, i) => s + (i.price - (i.discount || 0)) * i.qty, 0);

  const handleBillSubmit = async (share = false) => {
    if (!cart.length || !cust.name) return alert('Customer Name aur Cart Items zaroori hain!');
    const inv = (billType === 'online' ? 'AYU-ON-' : 'AYU-OFF-') + Date.now().toString().slice(-6);
    try {
      const res = await supabaseFetch('bills', {
        method: 'POST',
        body: JSON.stringify([{ invoice_no: inv, customer_name: cust.name, customer_phone: cust.phone, total_amount: posTotal }])
      });
      if (res && res[0]) {
        const bId = res[0].id;
        const items = cart.map((i) => ({ bill_id: bId, product_id: i.id, product_name: `${i.name} (${i.unit})`, unit_price: i.price - (i.discount || 0), quantity: i.qty, total_price: (i.price - (i.discount || 0)) * i.qty }));
        await supabaseFetch('bill_items', { method: 'POST', body: JSON.stringify(items) });
        for (const i of cart) {
          await supabaseFetch(`products?id=eq.${i.id}`, { method: 'PATCH', body: JSON.stringify({ stock: Math.max(0, i.stock - i.qty) }) });
        }
        if (share && cust.phone) {
          let msg = `*AYUKANTI RECEIPT*\nInvoice: ${inv}\nName: ${cust.name}\nPhone: ${cust.phone}\n\n*ITEMS:*\n`;
          cart.forEach((i) => { msg += `- ${i.name} (${i.unit}) x ${i.qty} = ₹${(i.price - (i.discount || 0)) * i.qty}\n`; });
          msg += `\n*TOTAL: ₹${posTotal}*`;
          window.open(`https://wa.me/91${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
          alert(`Bill Saved! Invoice: ${inv}`);
        }
        setCart([]); setCust({ name: '', phone: '', addr: '' }); loadData();
      }
    } catch (err) { alert('Error generating bill'); }
  };
    const handleDeleteBill = async (id) => {
    if (confirm('Delete this bill permanently?')) {
      await supabaseFetch(`bills?id=eq.${id}`, { method: 'DELETE' });
      setViewBill(null); loadData();
    }
  };

  const handleUpdateBill = async (e) => {
    e.preventDefault();
    if (!editBill) return;
    await supabaseFetch(`bills?id=eq.${editBill.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ customer_name: editBill.customer_name, customer_phone: editBill.customer_phone, total_amount: parseFloat(editBill.total_amount) || 0 })
    });
    alert('Bill updated!'); setEditBill(null); loadData();
  };

  const getProfitData = (type) => {
    const map = {};
    bills.forEach((b) => {
      const d = new Date(b.created_at);
      const k = type === 'daily' ? d.toLocaleDateString() : d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!map[k]) map[k] = { sales: 0, count: 0 };
      map[k].sales += parseFloat(b.total_amount || 0);
      map[k].count += 1;
    });
    return Object.entries(map).map(([k, v]) => ({ label: k, sales: v.sales, count: v.count, profit: Math.round(v.sales * 0.35) }));
  };

  if (!auth) {
    return (
      <div style={{ minHeight: '100vh', background: '#061E15', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', color: '#FFF', fontFamily: 'sans-serif' }}>
        <form onSubmit={(e) => { e.preventDefault(); pin === 'ayukanti@333' ? setAuth(true) : alert('Galat PIN'); }} style={{ background: '#020905', border: '2px solid #FFD700', padding: '25px', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: '300px' }}>
          <div style={{ fontSize: '32px' }}>🌿</div>
          <h2 style={{ color: '#FFD700', margin: '10px 0' }}>AYUKANTI ADMIN</h2>
          <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} required style={{ width: '100%', padding: '10px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '6px', textAlign: 'center', fontSize: '16px', marginBottom: '15px', boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #FFD700, #AA7C11)', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Unlock Panel</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#061E15', color: '#F6F1E8', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#03120C', borderBottom: '2px solid #FFD700', padding: '10px 15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, color: '#FFD700', fontSize: '18px' }}>🌿 AYUKANTI ADMIN</h1>
          <button onClick={() => setAuth(false)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Lock 🔒</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {['products', 'bills', 'history', 'profit'].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 2px', borderRadius: '6px', border: tab === t ? '2px solid #FFD700' : '1px solid rgba(255,215,0,0.3)', background: tab === t ? '#FFD700' : '#020905', color: tab === t ? '#03120C' : '#FFD700', fontWeight: 'bold', fontSize: '12px', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '800px', margin: '0 auto' }}>
        {tab === 'products' && (
          <div>
            <div style={{ background: '#020905', border: '1px solid #FFD700', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#FFD700', fontSize: '14px' }}>{pForm.id ? '✏️ Edit Product' : '➕ Add Product'}</h3>
              <form onSubmit={handleSaveProduct} style={{ display: 'grid', gap: '8px' }}>
                <input type="text" placeholder="Name *" value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <input type="text" placeholder="Category" value={pForm.cat} onChange={(e) => setPForm({ ...pForm, cat: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="number" placeholder="Price (₹) *" value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                  <input type="number" placeholder="Discount (₹)" value={pForm.disc} onChange={(e) => setPForm({ ...pForm, disc: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="number" placeholder="Stock Qty *" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} required style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                  <input type="url" placeholder="Image URL" value={pForm.img} onChange={(e) => setPForm({ ...pForm, img: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="submit" style={{ flex: 1, padding: '8px', background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px' }}>Save Product</button>
                  {pForm.id && <button type="button" onClick={() => setPForm({ id: null, name: '', cat: '', price: '', disc: '', stock: '', img: '' })} style={{ padding: '8px', background: '#555', color: '#FFF', border: 'none', borderRadius: '4px' }}>Cancel</button>}
                </div>
              </form>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {products.map((p) => (
                <div key={p.id} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.3)', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#FFD700' }}>₹{p.price - (p.discount || 0)} | Stock: {p.stock}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setPForm({ id: p.id, name: p.name, cat: p.category || '', price: p.price, disc: p.discount || 0, stock: p.stock || 0, img: p.image_url || '' })} style={{ background: '#3498DB', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Edit</button>
                    <button onClick={() => handleDeleteProd(p.id)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
                  {tab === 'bills' && (
          <div style={{ background: '#020905', border: '1px solid #FFD700', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button onClick={() => setBillType('offline')} style={{ flex: 1, padding: '6px', background: billType === 'offline' ? '#FFD700' : '#061E15', color: billType === 'offline' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>Offline POS</button>
              <button onClick={() => setBillType('online')} style={{ flex: 1, padding: '6px', background: billType === 'online' ? '#FFD700' : '#061E15', color: billType === 'online' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>Online Billing</button>
            </div>

            <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
              <input type="text" placeholder="Customer Name *" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
              <input type="tel" placeholder="WhatsApp Number *" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
              {billType === 'online' && <input type="text" placeholder="Delivery Address" value={cust.addr} onChange={(e) => setCust({ ...cust, addr: e.target.value })} style={{ padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />}
            </div>

            <input type="text" placeholder="🔍 Search product..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px', maxHeight: '140px', overflowY: 'auto', marginBottom: '10px' }}>
              {products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
                <div key={p.id} onClick={() => addToCart(p)} style={{ background: '#061E15', border: '1px solid rgba(255,215,0,0.3)', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ color: '#FFD700' }}>₹{p.price - (p.discount || 0)}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Cart Items:</div>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px', background: '#061E15', padding: '4px 6px', borderRadius: '4px' }}>
                  <span>{item.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select value={item.unit || 'Pcs'} onChange={(e) => setCart(cart.map((i) => i.id === item.id ? { ...i, unit: e.target.value } : i))} style={{ background: '#020905', color: '#FFD700', border: '1px solid #FFD700', fontSize: '10px' }}>
                      <option value="Pcs">Pcs</option>
                      <option value="Bottle">Bottle</option>
                      <option value="Pack">Pack</option>
                      <option value="Kg">Kg</option>
                      <option value="Gm">Gm</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Box">Box</option>
                    </select>
                    <span>₹{(item.price - (item.discount || 0)) * item.qty}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
              <span>Total:</span><span>₹{posTotal}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button onClick={() => handleBillSubmit(false)} style={{ padding: '10px', background: '#27AE60', color: '#FFF', border: 'none', fontWeight: 'bold', borderRadius: '4px', fontSize: '11px' }}>💾 Save Bill Only</button>
              <button onClick={() => handleBillSubmit(true)} style={{ padding: '10px', background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px', fontSize: '11px' }}>📲 Save & Share WhatsApp</button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button onClick={() => setHistoryType('online')} style={{ flex: 1, padding: '6px', background: historyType === 'online' ? '#FFD700' : '#020905', color: historyType === 'online' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>🌐 Online Bills</button>
              <button onClick={() => setHistoryType('offline')} style={{ flex: 1, padding: '6px', background: historyType === 'offline' ? '#FFD700' : '#020905', color: historyType === 'offline' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>🛍️ Offline Bills</button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {bills.filter((b) => (historyType === 'online' ? b.invoice_no.includes('ON') : !b.invoice_no.includes('ON'))).map((b) => (
                <div key={b.id} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', fontSize: '12px' }}>
                    <span>{b.invoice_no}</span><span>₹{b.total_amount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px' }}>{b.customer_name} ({b.customer_phone || 'N/A'})</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => setViewBill(b)} style={{ background: '#3498DB', color: '#FFF', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>View 🔍</button>
                      <button onClick={() => setEditBill(b)} style={{ background: '#F39C12', color: '#FFF', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>Edit ✏️</button>
                      <button onClick={() => handleDeleteBill(b.id)} style={{ background: '#E74C3C', color: '#FFF', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>Delete 🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'profit' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button onClick={() => setProfitType('daily')} style={{ flex: 1, padding: '6px', background: profitType === 'daily' ? '#FFD700' : '#020905', color: profitType === 'daily' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>📅 Daily Profit</button>
              <button onClick={() => setProfitType('monthly')} style={{ flex: 1, padding: '6px', background: profitType === 'monthly' ? '#FFD700' : '#020905', color: profitType === 'monthly' ? '#000' : '#FFD700', border: '1px solid #FFD700', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>📊 Monthly Profit</button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {getProfitData(profitType).map((row, idx) => (
                <div key={idx} style={{ background: '#020905', border: '1px solid rgba(255,215,0,0.3)', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{row.label}</div>
                    <div style={{ fontSize: '10px', color: '#A0B2A6' }}>Bills: {row.count}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '12px' }}>Sales: ₹{row.sales}</div>
                    <div style={{ color: '#2ECC71', fontWeight: 'bold', fontSize: '11px' }}>Profit: ₹{row.profit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {viewBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: '#020905', border: '2px solid #FFD700', borderRadius: '10px', padding: '15px', width: '100%', maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FFD700', paddingBottom: '6px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#FFD700' }}>Invoice: {viewBill.invoice_no}</h4>
              <button onClick={() => setViewBill(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
              <div><strong>Name:</strong> {viewBill.customer_name}</div>
              <div><strong>Phone:</strong> {viewBill.customer_phone || 'N/A'}</div>
              <div><strong>Date:</strong> {new Date(viewBill.created_at).toLocaleString()}</div>
            </div>
            <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginBottom: '8px' }}>
              {viewBill.bill_items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                  <span>{item.product_name} x {item.quantity}</span>
                  <span style={{ color: '#FFD700' }}>₹{item.total_price}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#FFD700', borderTop: '1px solid #FFD700', paddingTop: '6px' }}>
              <span>Total:</span><span>₹{viewBill.total_amount}</span>
            </div>
          </div>
        </div>
      )}

      {editBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <form onSubmit={handleUpdateBill} style={{ background: '#020905', border: '2px solid #FFD700', borderRadius: '10px', padding: '15px', width: '100%', maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FFD700', paddingBottom: '6px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#FFD700' }}>Edit {editBill.invoice_no}</h4>
              <button type="button" onClick={() => setEditBill(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
              <input type="text" value={editBill.customer_name || ''} onChange={(e) => setEditBill({ ...editBill, customer_name: e.target.value })} required style={{ padding: '6px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
              <input type="tel" value={editBill.customer_phone || ''} onChange={(e) => setEditBill({ ...editBill, customer_phone: e.target.value })} style={{ padding: '6px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
              <input type="number" value={editBill.total_amount || 0} onChange={(e) => setEditBill({ ...editBill, total_amount: e.target.value })} required style={{ padding: '6px', background: '#061E15', border: '1px solid #FFD700', color: '#FFF', borderRadius: '4px', fontSize: '12px' }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '8px', background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px', fontSize: '12px' }}>Save Changes</button>
          </form>
        </div>
      )}
    </div>
  );
                }
                    
