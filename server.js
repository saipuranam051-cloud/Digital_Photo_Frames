const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mongoose = require('mongoose');
const multer = require('multer');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/divine_frames').then(() => {
    console.log('Successfully connected to MongoDB.');
    seedProducts(); // Seed initial data if empty
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// --- Mongoose Schemas & Models ---

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Note: In a real app, passwords should be hashed
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: String, required: true },
    discount: { type: Number, default: 0 },
    badge: { type: String, default: '' },
    image: { type: String, required: true },
    images: [{ type: String }],
    stock: { type: Number, default: 50 },
    sold: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

const reviewSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    image: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String, default: '' },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'Pending' },
    paymentMethod: { type: String, default: 'Online' },
    orderStatus: { type: String, default: 'Order Confirmed' }, // e.g. Tracking Enum
    trackingId: { type: String, default: '' },
    paymentProof: { type: String, default: '' },
    deliveryAgentName: { type: String, default: '' },
    deliveryAgentPhone: { type: String, default: '' },
    proofOfDelivery: { type: String, default: '' },
    items: [{ title: String, quantity: Number, price: String }],
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// --- Initialization / Seeding ---
async function seedProducts() {
    const count = await Product.countDocuments();
    if (count === 0) {
        console.log('Seeding initial products...');
        const initialProducts = [
            {
                title: 'Ganesha Premium Wood Frame',
                price: '₹2,499',
                badge: 'New Arrival',
                image: 'product_ganesha.png',
                stock: 20, sold: 0
            },
            {
                title: 'Radha Krishna Gold Plated',
                price: '₹3,999',
                badge: 'Bestseller',
                image: 'product_krishna.png',
                stock: 15, sold: 0
            },
            {
                title: 'Shiva Meditating Minimalist',
                price: '₹1,899',
                badge: '',
                image: 'product_ganesha.png',
                stock: 30, sold: 0
            },
            {
                title: 'Saraswati Abstract Art Frame',
                price: '₹2,199',
                badge: '',
                image: 'product_krishna.png',
                stock: 25, sold: 0
            },
            {
                title: 'Tirupati Balaji Vintage Finish',
                price: '₹4,499',
                badge: 'Premium',
                image: 'product_ganesha.png',
                stock: 10, sold: 0
            },
            {
                title: 'Laxmi Devi Festive Edition',
                price: '₹2,999',
                badge: '',
                image: 'product_krishna.png',
                stock: 12, sold: 0
            },
            {
                title: 'Hanuman Chalisa Etched Glass',
                price: '₹3,299',
                badge: '',
                image: 'product_ganesha.png',
                stock: 18, sold: 0
            },
            {
                title: 'Om Symbol LED Frame',
                price: '₹1,599',
                badge: 'Trending',
                image: 'product_krishna.png',
                stock: 40, sold: 0
            }
        ];

        await Product.insertMany(initialProducts);
        console.log('Products seeded successfully.');
    } else {
        console.log('Products already exist, skipping seed.');
    }
}

// --- API Endpoints ---

// GET /api/products : Returns the list of products from MongoDB
app.get('/api/products', async (req, res) => {
    try {
        const productsDB = await Product.find({});
        res.json({ success: true, data: productsDB });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching products' });
    }
});

// GET /api/products/:id : Returns a single product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching product' });
    }
});

// GET /api/reviews/:productId
app.get('/api/reviews/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
        res.json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
});

// POST /api/reviews : Submit a new review
app.post('/api/reviews', upload.single('image'), async (req, res) => {
    try {
        const { productId, customerName, rating, comment } = req.body;
        let image = '';

        if (req.file) {
            image = '/uploads/' + req.file.filename;
        }

        const newReview = new Review({
            productId, customerName, rating, comment, image
        });
        await newReview.save();
        res.status(201).json({ success: true, review: newReview });
    } catch (error) {
        console.error('Review Error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
});

// POST /api/auth/signup : Register a new user in MongoDB
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { fname, lname, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Save new user
        const newUser = new User({ fname, lname, email, password });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: newUser._id, fname: newUser.fname, email: newUser.email }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
});

// POST /api/auth/login : Authenticate a user against MongoDB
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email, password });

        if (user) {
            res.json({
                success: true,
                message: 'Login successful',
                user: { id: user._id, fname: user.fname, email: user.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// POST /api/orders : Process a new order
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, email, phone, address, amount, paymentMethod, items } = req.body;

        const orderId = 'ORD' + Date.now().toString().slice(-6);

        // Update successful payment logic: reduce stock, increase sold count
        let totalSold = 0;
        if (items && items.length > 0) {
            for (let item of items) {
                const qty = item.quantity || 1;
                totalSold += qty;
                await Product.findOneAndUpdate(
                    { title: item.title },
                    { $inc: { stock: -qty, sold: qty } }
                );
            }
        }

        const newOrder = new Order({
            orderId, customerName, email, phone, address, amount,
            paymentStatus: 'Paid', paymentMethod, items
        });
        await newOrder.save();
        res.status(201).json({ success: true, message: 'Order created', orderId });
    } catch (error) {
        console.error('Order logic error:', error);
        res.status(500).json({ success: false, message: 'Server error processing order' });
    }
});

// GET /api/orders/track/:orderId : Get order tracking data
app.get('/api/orders/track/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error retrieving order' });
    }
});

// GET /api/orders/user/:email : Get all orders for a specific user
app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const orders = await Order.find({ email: req.params.email }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching user orders' });
    }
});

// GET /api/admin/dashboard : Fetch admin metrics
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const allOrders = await Order.find({});
        const todayOrders = await Order.find({ createdAt: { $gte: today } });
        const monthOrders = await Order.find({ createdAt: { $gte: startOfMonth } });

        const totalRevenue = allOrders.reduce((acc, order) => acc + order.amount, 0);
        const salesToday = todayOrders.reduce((acc, order) => acc + order.amount, 0);
        const salesMonth = monthOrders.reduce((acc, order) => acc + order.amount, 0);

        const framesSoldToday = todayOrders.reduce((acc, order) => {
            let count = 0;
            if (order.items) order.items.forEach(i => count += (i.quantity || 1));
            return acc + count;
        }, 0);

        const allProducts = await Product.find({});
        const currentStockLeft = allProducts.reduce((acc, p) => acc + p.stock, 0);

        res.json({
            success: true,
            data: {
                totalRevenue, salesToday, salesMonth,
                totalOrdersToday: todayOrders.length,
                totalOrdersOverall: allOrders.length,
                framesSoldToday, currentStockLeft,
                recentOrders: allOrders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/orders/search?q=... : Search orders by orderId, name, phone, or email
app.get('/api/admin/orders/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.json({ success: true, orders: [] });
        }
        const regex = new RegExp(q.trim(), 'i');
        const orders = await Order.find({
            $or: [
                { orderId: regex },
                { customerName: regex },
                { phone: regex },
                { email: regex }
            ]
        }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// PUT /api/admin/orders/:orderId/status
app.put('/api/admin/orders/:orderId/status', async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { orderStatus },
            { new: true }
        );
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });

        // Simulate Email notifications (SMS Removed)
        console.log(`[EMAIL SENT] To Customer ${updatedOrder.phone || updatedOrder.email} - Order ${updatedOrder.orderId} status updated to: ${orderStatus}`);

        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
});

// POST /api/admin/orders/:id/assign (Assign to Delivery Agent)
app.post('/api/admin/orders/:orderId/assign', async (req, res) => {
    try {
        const { deliveryAgentName, deliveryAgentPhone } = req.body;
        if (!deliveryAgentName || !deliveryAgentPhone) {
            return res.status(400).json({ success: false, message: 'Agent name and phone required' });
        }

        const trackingId = 'TRK' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            {
                deliveryAgentName,
                deliveryAgentPhone,
                trackingId,
                orderStatus: 'Out for Delivery'
            },
            { new: true }
        );

        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });

        // Simulate Notifications (SMS Removed)
        console.log(`[EMAIL SENT] To Customer ${updatedOrder.phone || updatedOrder.email} - Order ${updatedOrder.orderId} is Out for Delivery! Tracking ID: ${trackingId}, Agent: ${deliveryAgentName} (${deliveryAgentPhone})`);

        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to assign delivery agent' });
    }
});

// GET /api/agent/orders/:phone (Get Assigned Orders)
app.get('/api/agent/orders/:phone', async (req, res) => {
    try {
        const phone = req.params.phone.trim();
        const orders = await Order.find({ deliveryAgentPhone: phone }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch agent orders' });
    }
});

// PUT /api/agent/orders/:orderId/status (Delivery Agent Updates Status)
app.put('/api/agent/orders/:orderId/status', upload.single('proof'), async (req, res) => {
    try {
        const { orderStatus } = req.body;
        let updateData = { orderStatus };

        if (req.file) {
            updateData.proofOfDelivery = '/uploads/' + req.file.filename;
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            updateData,
            { new: true }
        );

        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });

        // Simulate Notifications (SMS Removed)
        console.log(`[EMAIL SENT] To Customer ${updatedOrder.phone || updatedOrder.email} - Order ${updatedOrder.orderId} status updated to: ${orderStatus} by Agent`);

        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
});

// Admin Product APIs

// POST /api/admin/products
app.post('/api/admin/products', upload.array('images', 5), async (req, res) => {
    try {
        const { title, price, discount, badge, stock } = req.body;

        let image = '';
        let images = [];

        if (req.files && req.files.length > 0) {
            image = '/uploads/' + req.files[0].filename;
            images = req.files.map(file => '/uploads/' + file.filename);
        } else {
            // Default fallback if no image uploaded
            image = 'product_ganesha.png';
        }

        const newProduct = new Product({
            title, price, discount, badge, image, images, stock
        });
        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add product' });
    }
});

// PUT /api/admin/products/:id
app.put('/api/admin/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, price, discount, badge, stock } = req.body;

        const updateData = { title, price, discount, badge, stock };

        if (req.files && req.files.length > 0) {
            updateData.image = '/uploads/' + req.files[0].filename;
            updateData.images = req.files.map(file => '/uploads/' + file.filename);
        }

        const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.json({ success: true, product: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
});

// DELETE /api/admin/products/:id
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
});

// Fallback to index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
