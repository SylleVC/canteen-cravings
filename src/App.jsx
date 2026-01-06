import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc 
} from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [buyerName, setBuyerName] = useState("");
  const [contact, setContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [orders, setOrders] = useState([]);
  const [adminLogin, setAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [gcashNumber, setGcashNumber] = useState(""); // Initially empty, fetched from DB
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name:"", price:"", stock:"", image:"" });

  // --- FETCH PRODUCTS ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // --- FETCH ORDERS ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // --- FETCH SETTINGS (GCash Number) ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "adminConfig"), (snapshot) => {
      if (snapshot.exists()) {
        setGcashNumber(snapshot.data().gcashNumber);
      }
    });
    return () => unsub();
  }, []);

  // --- CART LOGIC ---
  const addToCart = (product) => {
    if (product.stock <= 0) return alert("Out of stock!");
    const existing = cart.find(p => p.id === product.id);
    if(existing){
      if(existing.quantity >= product.stock) return alert("Not enough stock!");
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
    } else {
      setCart([...cart, {...product, quantity:1}]);
    }
  };
  const removeFromCart = (id) => setCart(cart.filter(p => p.id !== id));
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // --- PLACE ORDER ---
  const placeOrder = async () => {
    if(!buyerName || !contact || cart.length === 0) return alert("Fill all fields & add products");
    
    const order = {
      buyerName,
      contact,
      paymentMethod,
      items: cart,
      total: cartTotal,
      status: "pending",
      timestamp: new Date()
    };

    try {
      await addDoc(collection(db, "orders"), order);
      // Deduct stock
      for (const item of cart) {
        const prodRef = doc(db, "products", item.id);
        await updateDoc(prodRef, { stock: item.stock - item.quantity });
      }
      setCart([]); setBuyerName(""); setContact("");
      alert("Order placed!");
      printReceipt(order);
    } catch (e) {
      alert("Error placing order: " + e.message);
    }
  };

  // --- ADMIN SETTINGS SAVE ---
  const saveAdminSettings = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "settings", "adminConfig"), {
        gcashNumber: gcashNumber
      });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Error saving settings.");
    }
    setIsSaving(false);
  };

  // --- ADMIN LOGIN ---
  const handleAdminLogin = () => {
    if(adminUser === "CanteenAdmin" && adminPass === "admIn555") setAdminLogin(true);
    else alert("Invalid credentials");
  };
  const handleLogout = () => {
    setAdminLogin(false);
    setAdminUser(""); setAdminPass("");
  };

  // --- ORDER STATUS & STOCK FIX ---
  const updateOrderStatus = async (order, newStatus) => {
    // Prevent double-restoring stock if already canceled
    if (order.status === "canceled" && newStatus === "canceled") return;

    const orderRef = doc(db, "orders", order.id);
    await updateDoc(orderRef, { status: newStatus });

    // Restore stock only when moving from non-canceled to canceled
    if(newStatus === "canceled" && order.status !== "canceled"){
      for (const item of order.items) {
        const prodRef = doc(db, "products", item.id);
        // Find current product stock from our state to be safe
        const currentProd = products.find(p => p.id === item.id);
        if (currentProd) {
          await updateDoc(prodRef, { stock: currentProd.stock + item.quantity });
        }
      }
    }
  };

  const deleteOrder = async (orderId) => {
    if(!confirm("Delete order record?")) return;
    await deleteDoc(doc(db, "orders", orderId));
  };

  // --- PRODUCT MANAGEMENT ---
  const handleProductSubmit = async () => {
    if(!productForm.name || !productForm.price || !productForm.stock || !productForm.image){
      return alert("Fill all product fields and upload an image");
    }
    if(editingProduct){
      await updateDoc(doc(db, "products", editingProduct.id), productForm);
      setEditingProduct(null);
    } else {
      await addDoc(collection(db, "products"), productForm);
    }
    setProductForm({ name:"", price:"", stock:"", image:"" });
  };

  const deleteProduct = async (id) => {
    if(!confirm("Delete product?")) return;
    await deleteDoc(doc(db, "products", id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProductForm({...productForm, image: reader.result});
    reader.readAsDataURL(file);
  };

  const printReceipt = (order) => {
    const receiptWindow = window.open('', 'Print Receipt', 'width=400,height=600');
    receiptWindow.document.write(`<h2>Canteen Cravings</h2>`);
    receiptWindow.document.write(`<p>Buyer: ${order.buyerName}</p>`);
    receiptWindow.document.write(`<p>Contact: ${order.contact}</p>`);
    receiptWindow.document.write(`<p>Payment: ${order.paymentMethod}</p>`);
    receiptWindow.document.write('<hr/>');
    order.items.forEach(i => {
      receiptWindow.document.write(`<p>${i.name} x ${i.quantity} - ₱${i.price * i.quantity}</p>`);
    });
    receiptWindow.document.write('<hr/>');
    receiptWindow.document.write(`<p>Total: ₱${order.total}</p>`);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const totalRevenue = orders.filter(o=>o.status==="done").reduce((acc,o)=>acc+o.total,0);

  return (
    <div className={`p-4 max-w-7xl mx-auto text-white bg-gray-900 min-h-screen ${!adminLogin ? "pt-32 sm:pt-4" : ""}`}>
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-yellow-400 text-center sm:text-left">Canteen Cravings</h1>

      {!adminLogin ? (
        <div className="fixed top-4 right-4 p-2 bg-gray-800 rounded flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-40 sm:w-auto z-50 shadow-lg">
          <input placeholder="Admin User" value={adminUser} onChange={e => setAdminUser(e.target.value)} className="p-1 rounded bg-gray-700 text-sm"/>
          <input placeholder="Password" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="p-1 rounded bg-gray-700 text-sm"/>
          <button onClick={handleAdminLogin} className="bg-green-600 p-1 rounded text-sm font-bold">Login</button>
        </div>
      ) : null}

      {adminLogin ? (
        <div>
          <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded">
            <h2 className="text-2xl font-bold text-green-400">Admin Dashboard</h2>
            <button onClick={handleLogout} className="bg-red-600 px-4 py-1 rounded font-bold">Logout</button>
          </div>

          {/* PERSISTENT SETTINGS */}
          <div className="mb-6 p-4 border-2 border-yellow-500 rounded bg-gray-800 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">General Settings</h3>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm mb-1 text-gray-300">Merchant GCash Number</label>
                <input 
                  value={gcashNumber} 
                  onChange={e => setGcashNumber(e.target.value)} 
                  className="p-2 rounded bg-gray-700 w-full border border-gray-600 focus:border-yellow-500 outline-none"
                />
              </div>
              <button 
                onClick={saveAdminSettings} 
                disabled={isSaving}
                className="bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded font-bold transition-colors w-full sm:w-auto disabled:bg-gray-600"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* PRODUCT MANAGEMENT */}
          <div className="mb-6 border p-4 rounded bg-gray-800">
            <h3 className="font-bold mb-2 text-lg">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input placeholder="Name" value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} className="p-2 rounded bg-gray-700"/>
              <input placeholder="Price" type="number" value={productForm.price} onChange={e=>setProductForm({...productForm,price:Number(e.target.value)})} className="p-2 rounded bg-gray-700"/>
              <input placeholder="Stock" type="number" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:Number(e.target.value)})} className="p-2 rounded bg-gray-700"/>
            </div>
            <input type="file" onChange={handleImageUpload} className="my-2 block text-sm"/>
            {productForm.image && <img src={productForm.image} alt="preview" className="h-20 mb-2 rounded border"/>}
            <button onClick={handleProductSubmit} className="bg-blue-600 px-6 py-2 rounded font-bold">{editingProduct?"Update Product":"Add Product"}</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {products.map(p => (
              <div key={p.id} className="border p-2 rounded bg-gray-700 flex flex-col">
                <img src={p.image} className="h-28 w-full object-cover rounded mb-2"/>
                <h4 className="font-bold">{p.name}</h4>
                <p className="text-sm">₱{p.price} | Stock: {p.stock}</p>
                <div className="flex gap-1 mt-auto pt-2">
                  <button onClick={()=>{setEditingProduct(p); setProductForm(p)}} className="bg-yellow-500 flex-1 text-xs py-1 rounded">Edit</button>
                  <button onClick={()=>deleteProduct(p.id)} className="bg-red-600 flex-1 text-xs py-1 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* ORDERS MANAGEMENT */}
          <h3 className="text-2xl font-bold mb-2 text-blue-400">Customer Orders</h3>
          <p className="font-bold mb-4 bg-green-900/30 p-2 inline-block rounded">Total Revenue (Done): ₱{totalRevenue}</p>
          <div className="grid gap-4">
            {orders.sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds).map(o => (
              <div key={o.id} className={`border-l-4 p-4 rounded bg-gray-800 ${o.status === 'done' ? 'border-green-500' : o.status === 'canceled' ? 'border-red-500' : 'border-yellow-500'}`}>
                <div className="flex justify-between flex-wrap">
                  <div>
                    <p><b>Buyer:</b> {o.buyerName} ({o.contact})</p>
                    <p><b>Payment:</b> {o.paymentMethod}</p>
                    <p><b>Items:</b> {o.items.map(i => `${i.name} (x${i.quantity})`).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-yellow-400">₱{o.total}</p>
                    <p className="uppercase text-xs font-black">{o.status}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  {o.status === "pending" && <button onClick={()=>updateOrderStatus(o,"done")} className="bg-green-600 px-3 py-1 rounded text-sm">Mark Done</button>}
                  {o.status !== "canceled" && <button onClick={()=>updateOrderStatus(o,"canceled")} className="bg-red-600 px-3 py-1 rounded text-sm">Cancel Order</button>}
                  <button onClick={()=>printReceipt(o)} className="bg-blue-600 px-3 py-1 rounded text-sm">Print</button>
                  <button onClick={()=>deleteOrder(o.id)} className="bg-gray-600 px-3 py-1 rounded text-sm text-gray-300">Delete Record</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // BUYER VIEW
        <div>
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2 text-yellow-400">Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {products.map(p => (
              <div key={p.id} className="border p-2 rounded bg-gray-800 hover:scale-105 transition-transform">
                <img src={p.image} className="h-32 w-full object-cover rounded mb-2"/>
                <h4 className="font-bold text-lg">{p.name}</h4>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-yellow-400 font-bold text-xl">₱{p.price}</p>
                  <p className={`text-xs ${p.stock < 5 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>Stock: {p.stock}</p>
                </div>
                <button 
                  onClick={()=>addToCart(p)} 
                  disabled={p.stock <= 0}
                  className={`w-full mt-2 py-2 rounded font-bold ${p.stock <= 0 ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {p.stock <= 0 ? "Sold Out" : "Add to Cart"}
                </button>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {/* Cart Section */}
            <div className="p-4 border-2 border-dashed border-gray-700 rounded bg-gray-800/50">
              <h3 className="font-bold text-xl mb-4 text-blue-400">Your Cart</h3>
              {cart.length === 0 ? <p className="text-gray-500">Cart is empty...</p> : (
                <>
                  {cart.map(c => (
                    <div key={c.id} className="flex justify-between items-center mb-2 bg-gray-700 p-2 rounded">
                      <span>{c.name} <b className="text-yellow-400">x{c.quantity}</b></span>
                      <div className="flex items-center gap-3">
                        <span>₱{c.price*c.quantity}</span>
                        <button onClick={()=>removeFromCart(c.id)} className="text-red-400 font-bold">X</button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 mt-4 pt-2 flex justify-between font-black text-xl">
                    <span>TOTAL:</span>
                    <span className="text-yellow-400">₱{cartTotal}</span>
                  </div>
                </>
              )}
            </div>

            {/* Checkout Section */}
            <div className="p-4 rounded bg-gray-800 shadow-2xl border border-gray-700">
              <h3 className="font-bold text-xl mb-4 text-green-400">Checkout Info</h3>
              <input placeholder="Your Full Name" className="p-2 mb-2 w-full rounded bg-gray-700 border border-gray-600" value={buyerName} onChange={e=>setBuyerName(e.target.value)} />
              <input placeholder="Contact Number / Grade & Section" className="p-2 mb-2 w-full rounded bg-gray-700 border border-gray-600" value={contact} onChange={e=>setContact(e.target.value)} />
              <label className="text-xs text-gray-400">Payment Method:</label>
              <select className="p-2 mb-3 w-full rounded bg-gray-700 border border-gray-600" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
                <option>GCash</option>
                <option>At the counter</option>
              </select>
              {paymentMethod === "GCash" && (
                <div className="bg-blue-900/40 p-3 rounded mb-3 border border-blue-500">
                  <p className="text-sm">Please pay to GCash Number:</p>
                  <p className="text-lg font-bold text-center tracking-widest">{gcashNumber || "Loading..."}</p>
                </div>
              )}
              <button 
                onClick={placeOrder} 
                className="bg-green-600 hover:bg-green-500 p-3 rounded font-black w-full text-lg shadow-lg"
              >
                PLACE ORDER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
