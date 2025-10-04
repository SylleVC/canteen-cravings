// src/App.jsx
import React, { useEffect, useState } from "react";

/*
  Canteen Cravings - Polished full app
  - Paste into src/App.jsx and save
  - Works best with Tailwind CSS (recommended)
  - Includes nice product images, improved styling, toast messages, admin, upload, cancel/complete, persistent localStorage
*/

export default function App() {
  // prettier product starter with images (Unsplash placeholders)
  const starter = [
    { id: "p1", name: "Pandesal (3pcs)", price: 15, stock: 30, desc: "Warm pandesal, best paired with coffee.", image: "https://images.unsplash.com/photo-1615484473906-1bdfc3e0f2a3?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1c5d3d4e2b8b6f8be1b7c6b4b0ba6f4a" },
    { id: "p2", name: "Iced Tea (12 oz)", price: 25, stock: 20, desc: "Refreshing cold brew iced tea.", image: "https://images.unsplash.com/photo-1542444459-db2a7f3a6f90?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=c2a6cfc3f6c4c1d9f1b2b19b3b3c4e5d" },
    { id: "p3", name: "Beef Burger", price: 65, stock: 10, desc: "Juicy burger with lettuce & sauce.", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=6b45a5d238c9b4e9f4c2b9a0b8f7c6a2" },
    { id: "p4", name: "Siopao", price: 30, stock: 15, desc: "Soft steamed bun filled with pork.", image: "https://images.unsplash.com/photo-1604908177522-8b2e4e2f2e6b?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=9f6a7a7b5c4d3e2f1a0b9c8d7e6f5a4b" },
  ];

  const LS_PRODUCTS = "cc_products_v2";
  const LS_CART = "cc_cart_v2";
  const LS_ORDERS = "cc_orders_v2";
  const LS_ADMIN = "cc_is_admin_v2";

  const [products, setProducts] = useState(() => {
    try { const raw = localStorage.getItem(LS_PRODUCTS); return raw ? JSON.parse(raw) : starter; } catch { return starter; }
  });
  const [cart, setCart] = useState(() => {
    try { const raw = localStorage.getItem(LS_CART); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [orders, setOrders] = useState(() => {
    try { const raw = localStorage.getItem(LS_ORDERS); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try { const raw = sessionStorage.getItem(LS_ADMIN); return raw === "true"; } catch { return false; }
  });

  // UI
  const [message, setMessage] = useState("");
  const [toastType, setToastType] = useState("info"); // info | success | error
  const [view, setView] = useState("shop"); // shop | login | admin | receipt
  const [lastOrder, setLastOrder] = useState(null);
  const [shopQuery, setShopQuery] = useState("");
  const [adminQuery, setAdminQuery] = useState("");

  const [buyer, setBuyer] = useState({ name: "", contact: "", payment: "gcash" });

  useEffect(() => localStorage.setItem(LS_PRODUCTS, JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem(LS_CART, JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem(LS_ORDERS, JSON.stringify(orders)), [orders]);
  useEffect(() => sessionStorage.setItem(LS_ADMIN, isAdmin ? "true" : "false"), [isAdmin]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(t);
  }, [message]);

  // helpers
  const findProduct = (id) => products.find((p) => p.id === id);
  const reserved = (id) => (cart.find((c) => c.id === id)?.qty) || 0;
  const subtotal = cart.reduce((s, it) => { const p = findProduct(it.id); return s + (p ? p.price * it.qty : 0); }, 0);

  // CART
  function addToCart(id, qty = 1) {
    const p = findProduct(id); if (!p) return;
    const current = cart.find((c) => c.id === id)?.qty || 0;
    const newQty = current + qty;
    if (newQty > p.stock) return toast(`Only ${p.stock - current} more available`, "error");
    if (newQty <= 0) { setCart(cart.filter((c) => c.id !== id)); return toast("Removed from cart", "info"); }
    setCart((c) => {
      const exists = c.find((x) => x.id === id);
      if (exists) return c.map((x) => (x.id === id ? { ...x, qty: newQty } : x));
      return [...c, { id, qty }];
    });
    toast("Cart updated", "success");
  }

  function setCartQty(id, qty) {
    const p = findProduct(id); if (!p) return;
    if (qty > p.stock) return toast(`Cannot set more than available stock (${p.stock})`, "error");
    if (qty <= 0) { setCart(cart.filter((c) => c.id !== id)); return; }
    setCart(cart.map((c) => (c.id === id ? { ...c, qty } : c)));
  }

  function removeFromCart(id) { setCart(cart.filter((c) => c.id !== id)); toast("Item removed", "info"); }

  // CHECKOUT
  function checkout() {
    if (!buyer.name.trim() || !buyer.contact.trim()) return toast("Please enter buyer name and contact", "error");
    if (cart.length === 0) return toast("Cart is empty", "error");
    for (const it of cart) {
      const p = findProduct(it.id);
      if (!p || it.qty > p.stock) return toast(`Insufficient stock for ${p?.name || it.id}`, "error");
    }

    setProducts((prev) => prev.map((p) => {
      const inCart = cart.find((c) => c.id === p.id);
      return inCart ? { ...p, stock: p.stock - inCart.qty } : p;
    }));

    const order = {
      id: Date.now(),
      buyer: { ...buyer },
      items: cart.map((it) => {
        const p = findProduct(it.id);
        return { id: it.id, name: p?.name || it.id, price: p?.price || 0, qty: it.qty, image: p?.image || "" };
      }),
      total: subtotal,
      date: new Date().toLocaleString(),
      status: "Pending",
    };

    setOrders((o) => [...o, order]);
    setLastOrder(order);
    setCart([]);
    setBuyer({ name: "", contact: "", payment: "gcash" });
    setView("receipt");
    toast("Order placed (Pending)", "success");
  }

  // ADMIN
  function adminLogin(username, password) {
    if (username === "admin" && password === "1234") { setIsAdmin(true); setView("admin"); toast("Admin logged in", "success"); }
    else toast("Invalid admin credentials", "error");
  }
  function adminLogout() { setIsAdmin(false); setView("shop"); sessionStorage.setItem(LS_ADMIN, "false"); toast("Admin logged out", "info"); }

  function markCompleted(orderId) {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "Completed" } : o));
    toast("Order marked Completed", "success");
  }

  function cancelOrder(orderId, restoreStock = true) {
    const order = orders.find((o) => o.id === orderId); if (!order) return;
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "Canceled" } : o));
    if (restoreStock) {
      setProducts((prev) => {
        const copy = [...prev];
        for (const it of order.items) {
          const idx = copy.findIndex((p) => p.id === it.id);
          if (idx >= 0) copy[idx] = { ...copy[idx], stock: copy[idx].stock + it.qty };
        }
        return copy;
      });
    }
    toast("Order canceled and stocks restored", "info");
  }

  function uploadImageForProduct(id, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, image: base64 } : p));
      toast("Image uploaded", "success");
    };
    reader.readAsDataURL(file);
  }

  function updateProductField(id, field, value) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  }

  const visibleProducts = products.filter((p) => p.name.toLowerCase().includes(shopQuery.toLowerCase()));
  const adminVisible = products.filter((p) => p.name.toLowerCase().includes(adminQuery.toLowerCase()));

  // Toaster
  function toast(msg, type = "info") { setToastType(type); setMessage(msg); }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white pb-12">
      <div className="max-w-6xl mx-auto">
        <Header isAdmin={isAdmin} onLogin={() => setView("login")} onLogout={adminLogout} title="Canteen Cravings" />

        <main className="mt-6">
          {!isAdmin && view === "shop" && (
            <Shop
              products={visibleProducts}
              addToCart={addToCart}
              cart={cart}
              setCartQty={setCartQty}
              removeFromCart={removeFromCart}
              subtotal={subtotal}
              buyer={buyer}
              setBuyer={setBuyer}
              checkout={checkout}
              shopQuery={shopQuery}
              setShopQuery={setShopQuery}
              reserved={reserved}
            />
          )}

          {view === "login" && !isAdmin && <AdminLogin onLogin={adminLogin} onCancel={() => setView("shop")} />}

          {isAdmin && view === "admin" && (
            <AdminPanel
              orders={orders}
              products={adminVisible}
              allProducts={products}
              updateProductField={updateProductField}
              uploadImageForProduct={uploadImageForProduct}
              markCompleted={markCompleted}
              cancelOrder={cancelOrder}
              setAdminQuery={setAdminQuery}
              adminQuery={adminQuery}
            />
          )}

          {view === "receipt" && lastOrder && <ReceiptDisplay order={lastOrder} orders={orders} onBack={() => { setView("shop"); setLastOrder(null); }} />}
        </main>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed right-6 bottom-6 px-4 py-2 rounded shadow-lg text-sm ${toastType === "success" ? "bg-green-600 text-white" : toastType === "error" ? "bg-red-600 text-white" : "bg-black text-white"}`}>
          {message}
        </div>
      )}
    </div>
  );
}

/* Header */
function Header({ isAdmin, onLogin, onLogout, title }) {
  return (
    <header className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white shadow-sm mt-6">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🍽️</div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-xs text-gray-500">Order ahead • Fast pickup at the counter</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">Open: 8:00 AM - 2:00 PM</span>
        {isAdmin ? (
          <button onClick={onLogout} className="px-3 py-1 rounded bg-indigo-600 text-white">Logout</button>
        ) : (
          <button onClick={onLogin} className="px-3 py-1 rounded border">Admin Login</button>
        )}
      </div>
    </header>
  );
}

/* Shop */
function Shop({ products, addToCart, cart, setCartQty, removeFromCart, subtotal, buyer, setBuyer, checkout, shopQuery, setShopQuery, reserved }) {
  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <div className="flex items-center gap-3 mb-4">
          <input className="flex-1 border rounded px-3 py-2 shadow-sm" placeholder="Search products..." value={shopQuery} onChange={(e) => setShopQuery(e.target.value)} />
          <div className="text-sm text-gray-500">Items: <strong>{products.length}</strong></div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {products.map((p) => (
            <article key={p.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex gap-4">
              <div className="w-36 h-28 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {p.image ? <img src={p.image} alt={p.name} className="object-cover w-full h-full" /> : <div className="text-xs text-gray-400">No image</div>}
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div>
                    <div className="text-sm font-bold">₱{p.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">Stock: {p.stock}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => addToCart(p.id, -1)} className="px-3 py-1 bg-gray-100 rounded">-</button>
                    <button onClick={() => addToCart(p.id, 1)} disabled={p.stock - reserved(p.id) <= 0} className="px-3 py-1 rounded bg-indigo-600 text-white shadow">Add</button>
                    <div className="text-xs text-gray-500 ml-2">Avail: {p.stock - reserved(p.id)}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="bg-white rounded-2xl shadow p-4">
        <h4 className="font-semibold">Your Cart</h4>

        {cart.length === 0 ? (
          <div className="text-sm text-gray-500 mt-4">No items yet. Add something delicious 🥐</div>
        ) : (
          <div className="mt-3 space-y-3">
            {cart.map((it) => {
              const p = products.find((x) => x.id === it.id) || {};
              return (
                <div key={it.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name || it.id}</div>
                    <div className="text-xs text-gray-400">₱{(p.price || 0).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCartQty(it.id, it.qty - 1)} className="px-2 py-1 border rounded">-</button>
                    <input className="w-14 text-center border rounded px-1" type="number" value={it.qty} min={0} max={p.stock || 0} onChange={(e) => setCartQty(it.id, Number(e.target.value))} />
                    <button onClick={() => setCartQty(it.id, it.qty + 1)} className="px-2 py-1 border rounded">+</button>
                    <button onClick={() => removeFromCart(it.id)} className="text-xs text-indigo-600 underline">Remove</button>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-2 text-right font-semibold">Total: ₱{subtotal.toFixed(2)}</div>
          </div>
        )}

        <div className="mt-4 border-t pt-3">
          <h5 className="font-medium mb-2">Buyer Info</h5>
          <input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Full name" className="w-full border rounded px-2 py-1 mb-2" />
          <input value={buyer.contact} onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })} placeholder="Contact number" className="w-full border rounded px-2 py-1 mb-2" />
          <select value={buyer.payment} onChange={(e) => setBuyer({ ...buyer, payment: e.target.value })} className="w-full border rounded px-2 py-1 mb-3">
            <option value="gcash">GCash</option>
            <option value="counter">Pay at Counter</option>
          </select>

          <button onClick={() => checkout()} className="w-full py-2 rounded bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow">Place Order</button>
        </div>
      </aside>
    </div>
  );
}

/* Receipt */
function ReceiptDisplay({ order, orders, onBack }) {
  const current = orders.find((o) => o.id === order.id) || order;
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow mt-6 print:p-0 print:shadow-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Canteen Cravings — Receipt</h2>
          <div className="text-xs text-gray-500">{current.date}</div>
        </div>
        <div className={`px-3 py-1 rounded text-sm ${current.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : current.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {current.status}
        </div>
      </div>

      <div className="mt-3 text-sm">
        <div><strong>Name:</strong> {current.buyer.name}</div>
        <div><strong>Contact:</strong> {current.buyer.contact}</div>
        <div><strong>Payment:</strong> {current.buyer.payment === 'gcash' ? 'GCash' : 'Pay at Counter'}</div>
      </div>

      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Item</th>
            <th className="text-right p-2">Qty</th>
            <th className="text-right p-2">Price</th>
            <th className="text-right p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {current.items.map((it, i) => (
            <tr key={i} className="border-b">
              <td className="p-2 flex items-center gap-2">
                {it.image ? <img src={it.image} alt={it.name} className="w-12 h-8 object-cover rounded" /> : null}
                <span>{it.name}</span>
              </td>
              <td className="p-2 text-right">{it.qty}</td>
              <td className="p-2 text-right">₱{it.price.toFixed(2)}</td>
              <td className="p-2 text-right">₱{(it.qty * it.price).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="p-2 text-right font-semibold">Total</td>
            <td className="p-2 text-right font-semibold">₱{current.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded">Print Receipt</button>
        <button onClick={onBack} className="px-4 py-2 border rounded">Back to Shop</button>
      </div>
    </div>
  );
}

/* Admin Login */
function AdminLogin({ onLogin, onCancel }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow mt-6">
      <h2 className="text-lg font-semibold mb-3">Admin Login</h2>
      <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Username" value={user} onChange={(e) => setUser(e.target.value)} />
      <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={() => onLogin(user, pass)} className="flex-1 bg-indigo-600 text-white py-2 rounded">Login</button>
        <button onClick={onCancel} className="flex-1 border py-2 rounded">Cancel</button>
      </div>
      <div className="mt-3 text-xs text-gray-500">Hint: username: <strong>admin</strong>, password: <strong>1234</strong></div>
    </div>
  );
}

/* Admin Panel */
function AdminPanel({ orders, products, allProducts, updateProductField, uploadImageForProduct, markCompleted, cancelOrder, setAdminQuery, adminQuery }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-4 rounded-2xl shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Orders</h3>
        </div>

        {orders.length === 0 ? <div className="text-sm text-gray-500">No orders yet.</div> : (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {orders.map((o) => (
              <li key={o.id} className={`p-3 border rounded ${o.status === 'Pending' ? '' : 'opacity-60 bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{o.buyer.name} <span className="text-xs text-gray-500">({o.buyer.contact})</span></div>
                    <div className="text-xs text-gray-500">{o.date}</div>
                    <div className="text-xs mt-1">Payment: {o.buyer.payment === 'gcash' ? 'GCash' : 'Pay at Counter'}</div>
                  </div>

                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-sm ${o.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : o.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{o.status}</div>
                    <div className="text-xs mt-2">Total: ₱{o.total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {o.items.map((it, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{it.name}</td>
                          <td className="p-2 text-right">{it.qty}</td>
                          <td className="p-2 text-right">₱{it.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex gap-2">
                  <button disabled={o.status !== 'Pending'} onClick={() => markCompleted(o.id)} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">Mark Completed</button>
                  <button disabled={o.status === 'Canceled'} onClick={() => cancelOrder(o.id, true)} className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50">Cancel Order</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Inventory</h3>
          <input value={adminQuery} onChange={(e) => setAdminQuery(e.target.value)} placeholder="Search inventory..." className="border rounded px-2 py-1" />
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 border rounded">
              <div className="w-20 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                {p.image ? <img src={p.image} alt={p.name} className="object-cover w-full h-full" /> : <div className="text-xs text-gray-500">No image</div>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">₱<input type="number" value={p.price} onChange={(e) => updateProductLocal(p.id, 'price', e.target.value, updateProductField)} className="w-20 border rounded px-1 text-right" /></div>
                    <div className="text-xs">Stock: <input type="number" value={p.stock} onChange={(e) => updateProductLocal(p.id, 'stock', e.target.value, updateProductField)} className="w-20 border rounded px-1 text-right" /></div>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <label className="px-3 py-1 border rounded cursor-pointer">
                    Upload Image
                    <input type="file" accept="image/*" onChange={(e) => handleImageLocalUpload(p.id, e.target.files, uploadImageForProduct)} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // local helpers
  function handleImageLocalUpload(id, files, uploadFn) {
    if (!files || files.length === 0) return;
    uploadFn(id, files[0]);
  }
  function updateProductLocal(id, field, value, updater) {
    const val = (field === 'price' || field === 'stock') ? (Number(value) || 0) : value;
    updater(id, field, val);
  }
}
