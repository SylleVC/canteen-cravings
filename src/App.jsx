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
    <div className="p-4 max-w-7xl mx-auto text-white bg-gray-900 min-h-screen">
      {/* SITE TITLE */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-yellow-400 text-center sm:text-left break-words">
        Canteen Cravings
      </h1>

      {/* ADMIN LOGIN */}
      {!adminLogin && (
        <div className="fixed top-4 right-4 p-2 bg-gray-800 rounded flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-36 sm:w-auto z-50">
          <input
            placeholder="Username"
            value={adminUser}
            onChange={e => setAdminUser(e.target.value)}
            className="p-1 rounded bg-gray-700 text-xs sm:text-base"
          />
          <input
            placeholder="Password"
            type="password"
            value={adminPass}
            onChange={e => setAdminPass(e.target.value)}
            className="p-1 rounded bg-gray-700 text-xs sm:text-base"
          />
          <button
            onClick={handleAdminLogin}
            className="bg-green-600 p-1 rounded text-xs sm:text-base"
          >
            Login
          </button>
        </div>
      )}

      {adminLogin ? (
        <div>
          {/* Admin Panel */}
          {/* ... (same as previous full admin panel code) */}
        </div>
      ) : (
        // BUYER VIEW
        <div>
          {/* Menu, Cart, Buyer Info (same as previous full code) */}
        </div>
      )}
    </div>
  );
}

export default App;
