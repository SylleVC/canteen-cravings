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
  const [gcashNumber, setGcashNumber] = useState("09123456789");
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name:"", price:"", stock:"", image:"" });
  const receiptRef = useRef();

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

  // --- CART ---
  const addToCart = (product) => {
    const existing = cart.find(p => p.id === product.id);
    if(existing){
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
    await addDoc(collection(db, "orders"), order);
    // Deduct stock
    cart.forEach(async item => {
      const prodRef = doc(db, "products", item.id);
      await updateDoc(prodRef, { stock: item.stock - item.quantity });
    });
    setCart([]); setBuyerName(""); setContact("");
    alert("Order placed!");
    printReceipt(order);
  };

  // --- ADMIN LOGIN ---
  const handleAdminLogin = () => {
    if(adminUser === "admin" && adminPass === "1234") setAdminLogin(true);
    else alert("Invalid credentials");
  };
  const handleLogout = () => {
    setAdminLogin(false);
    setAdminUser(""); setAdminPass("");
  };

  // --- ORDER STATUS ---
  const updateOrderStatus = async (order, newStatus) => {
    const orderRef = doc(db, "orders", order.id);
    await updateDoc(orderRef, { status: newStatus });
    if(newStatus === "canceled"){
      // restore stock
      order.items.forEach(async item => {
        const prodRef = doc(db, "products", item.id);
        await updateDoc(prodRef, { stock: item.stock + item.quantity });
      });
    }
  };

  // --- DELETE ORDER ---
  const deleteOrder = async (orderId) => {
    if(!confirm("Delete order?")) return;
    await deleteDoc(doc(db, "orders", orderId));
  };

  // --- ADD/EDIT PRODUCT ---
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

  // --- IMAGE UPLOAD (BASE64) ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductForm({...productForm, image: reader.result});
    };
    reader.readAsDataURL(file);
  };

  // --- PRINT RECEIPT ---
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

  // --- TOTAL REVENUE ---
  const totalRevenue = orders.filter(o=>o.status==="done").reduce((acc,o)=>acc+o.total,0);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-yellow-400">Canteen Cravings</h1>

      {!adminLogin && (
        <div className="fixed top-4 right-4 p-2 bg-gray-800 rounded flex space-x-2">
          <input placeholder="Username" value={adminUser} onChange={e=>setAdminUser(e.target.value)} className="p-1 rounded bg-gray-700"/>
          <input placeholder="Password" type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} className="p-1 rounded bg-gray-700"/>
          <button onClick={handleAdminLogin} className="bg-green-600 p-1 rounded">Login</button>
        </div>
      )}

      {adminLogin ? (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <button onClick={handleLogout} className="bg-red-600 p-1 rounded">Logout</button>
          </div>

          {/* Seller GCash */}
          <div className="mb-4">
            <label>Seller GCash Number: </label>
            <input value={gcashNumber} onChange={e=>setGcashNumber(e.target.value)} className="p-1 rounded bg-gray-700"/>
          </div>

          {/* Products */}
          <div className="mb-4 border p-2 rounded bg-gray-800">
            <h3 className="font-bold mb-2">{editingProduct ? "Edit Product" : "Add Product"}</h3>
            <input placeholder="Name" value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} className="p-1 m-1 rounded w-full"/>
            <input placeholder="Price" type="number" value={productForm.price} onChange={e=>setProductForm({...productForm,price:Number(e.target.value)})} className="p-1 m-1 rounded w-full"/>
            <input placeholder="Stock" type="number" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:Number(e.target.value)})} className="p-1 m-1 rounded w-full"/>
            <input type="file" onChange={handleImageUpload} className="p-1 m-1 w-full text-white"/>
            {productForm.image && <img src={productForm.image} alt="preview" className="h-24 mb-2"/>}
            <button onClick={handleProductSubmit} className="bg-blue-600 p-1 rounded mt-2">{editingProduct?"Update":"Add"}</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {products.map(p => (
              <div key={p.id} className="border p-2 rounded bg-gray-700">
                <img src={p.image} className="h-24 w-full object-cover mb-2"/>
                <h4 className="font-bold">{p.name}</h4>
                <p>Price: ₱{p.price}</p>
                <p>Stock: {p.stock}</p>
                <div className="flex space-x-1 mt-1">
                  <button onClick={()=>{setEditingProduct(p); setProductForm(p)}} className="bg-yellow-500 p-1 rounded">Edit</button>
                  <button onClick={()=>deleteProduct(p.id)} className="bg-red-600 p-1 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Orders */}
          <h3 className="text-xl font-bold mb-2">Orders</h3>
          <p className="font-bold mb-2">Total Revenue: ₱{totalRevenue}</p>
          <div className="grid gap-2">
            {orders.map(o => (
              <div key={o.id} className="border p-2 rounded bg-gray-700">
                <p><b>Buyer:</b> {o.buyerName}</p>
                <p><b>Contact:</b> {o.contact}</p>
                <p><b>Payment:</b> {o.paymentMethod}</p>
                <p><b>Total:</b> ₱{o.total}</p>
                <p><b>Status:</b> {o.status}</p>
                <div className="flex space-x-1 mt-1">
                  {o.status === "pending" && <button onClick={()=>updateOrderStatus(o,"done")} className="bg-green-600 p-1 rounded">Done</button>}
                  {o.status !== "canceled" && <button onClick={()=>updateOrderStatus(o,"canceled")} className="bg-red-600 p-1 rounded">Cancel</button>}
                  <button onClick={()=>deleteOrder(o.id)} className="bg-gray-500 p-1 rounded">Delete</button>
                  <button onClick={()=>printReceipt(o)} className="bg-blue-600 p-1 rounded">Print Receipt</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        // BUYER VIEW
        <div>
          <h2 className="text-xl font-bold mb-2">Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {products.map(p => (
              <div key={p.id} className="border p-2 rounded bg-gray-800">
                <img src={p.image} className="h-24 w-full object-cover mb-2"/>
                <h4 className="font-bold">{p.name}</h4>
                <p>Price: ₱{p.price}</p>
                <p>Stock: {p.stock}</p>
                <button onClick={()=>addToCart(p)} className="bg-blue-600 p-1 rounded mt-2">Add to Cart</button>
              </div>
            ))}
          </div>

          {/* Cart */}
          <div className="mb-4 border p-2 rounded bg-gray-800">
            <h3 className="font-bold mb-2">Your Cart</h3>
            {cart.map(c => (
              <div key={c.id} className="flex justify-between mb-1">
                <span>{c.name} x {c.quantity}</span>
                <span>₱{c.price*c.quantity}</span>
                <button onClick={()=>removeFromCart(c.id)} className="bg-red-600 p-1 rounded">Remove</button>
              </div>
            ))}
            <p className="font-bold mt-2">Total: ₱{cartTotal}</p>
          </div>

          {/* Buyer Info */}
          <div className="mb-4 border p-2 rounded bg-gray-800">
            <input placeholder="Your Name" className="p-1 m-1 w-full" value={buyerName} onChange={e=>setBuyerName(e.target.value)} />
            <input placeholder="Contact Number" className="p-1 m-1 w-full" value={contact} onChange={e=>setContact(e.target.value)} />
            <select className="p-1 m-1 w-full" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
              <option>GCash</option>
              <option>At the counter</option>
            </select>
            {paymentMethod === "GCash" && <p>Pay to seller number: {gcashNumber}</p>}
            <button onClick={placeOrder} className="bg-green-600 p-2 rounded mt-2 w-full">Place Order & Print Receipt</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
