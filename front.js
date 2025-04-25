const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3030;
const backendBaseUrl = 'http://localhost:3031'; // Backend server URL

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'additional/image/uploads/';
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html'));

// Middleware
app.use(express.static(path.join(__dirname, 'additional')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Debug middleware for logging POST requests
app.use((req, res, next) => {
    if (req.method === 'POST' && ['/adminlogin', '/login', '/register', '/modify-page', '/add-product', '/delete-product'].includes(req.path)) {
        console.log(`Raw ${req.path} request headers:`, req.headers);
        console.log(`Raw ${req.path} request body:`, req.body || 'No body parsed yet');
    }
    next();
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/already-logged-in');
    }
    next();
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    if (!req.session.user.isAdmin) {
        return res.send(`
            <script>
                alert("You can't access this page");
                window.location.href = "/home";
            </script>
        `);
    }
    next();
};

// Handle favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Temporary fix for search.png
app.get('/css/image/search.png', (req, res) => res.status(404).send('Search icon not found'));

app.get('/', async (req, res) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?newArrivals=true&popular=true`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
        res.render('home', {
            newArrivals: data.newArrivals || [],
            popular: data.popular || [],
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching home data:', error.message);
        res.status(500).send('Server error');
    }
});
// Home route
app.get('/home', async (req, res) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?newArrivals=true&popular=true`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
        res.render('home', {
            newArrivals: data.newArrivals || [],
            popular: data.popular || [],
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching home data:', error.message);
        res.status(500).send('Server error');
    }
});

// Static routes
const routes = {
    '/team': 'team.html',
    '/signup': 'signup.html',
    '/adminlogin': 'adminlogin.html',
    '/login': (req, res) => res.sendFile(path.join(__dirname, 'html', 'signin.html')),
    '/already-logged-in': (req, res) => res.sendFile(path.join(__dirname, 'html', 'already-logged-in.html'))
};
Object.entries(routes).forEach(([routePath, fileOrHandler]) => {
    app.get(routePath, (req, res) => {
        console.log(`Request at ${req.path}`);
        if (typeof fileOrHandler === 'function') {
            fileOrHandler(req, res);
        } else {
            res.sendFile(path.join(__dirname, 'html', fileOrHandler), err => {
                if (err) {
                    console.error(`Error sending file ${fileOrHandler}:`, err);
                    res.status(500).send('File not found or server error.');
                }
            });
        }
    });
});

// Category route
app.get('/category', async (req, res) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?groupByCategory=true`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch categories');
        res.render('category', {
            categories: data.categories || [],
            products: data.products || {},
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching category data:', error.message);
        res.status(500).send('Server error');
    }
});

// Modify-web route
app.get('/modify-web', isAdmin, async (req, res) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?groupByCategory=true`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
        res.render('modify-web', {
            categories: data.categories || [],
            products: data.products || {},
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching modify-web data:', error.message);
        res.status(500).send('Server error');
    }
});

// Modify-page route (GET)
app.get('/modify-page', isAdmin, async (req, res) => {
    const pid = req.query.pid;
    if (!pid) return res.status(400).send('Product ID is required');
    try {
        const response = await fetch(`${backendBaseUrl}/api/products/${pid}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch product');
        const product = data.product || {};
        // Ensure all fields have default values
        const safeProduct = {
            PID: product.PID || '',
            PName: product.PName || '',
            PShop: product.PShop || '',
            PCategory: product.PCategory || '',
            PRating: parseFloat(product.PRating) || 0,
            PPrice: parseFloat(product.PPrice) || 0,
            PSize: product.PSize || '',
            PMaterial: product.PMaterial || '',
            PYear: product.PYear || '',
            PQuantity: parseInt(product.PQuantity, 10) || 0,
            PImage: product.PImage || '',
            PDescription: product.PDescription || '',
            PSeries: product.PSeries || ''
        };
        res.render('modify-page', {
            user: req.session.user,
            product: safeProduct,
            error: null
        });
    } catch (error) {
        console.error('Error fetching product:', error.message);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

// Modify-page route (POST)
app.post('/modify-page', isAdmin, upload.single('mainImage'), async (req, res) => {
    try {
        console.log('Modify-page POST request body:', req.body);
        console.log('Uploaded file:', req.file);
        const {
            pid, PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription, PSeries, existingImage
        } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!pid) missingFields.push('Product ID');
        if (!PName) missingFields.push('Product name');
        if (!PShop) missingFields.push('Brand');
        if (!PCategory) missingFields.push('Category');
        if (!PRating && PRating !== '0') missingFields.push('Rating');
        if (!PPrice && PPrice !== '0') missingFields.push('Price');
        if (!PSize) missingFields.push('Size');
        if (!PYear) missingFields.push('Year');
        if (missingFields.length > 0) {
            console.error('Missing fields:', missingFields);
            return res.render('modify-page', {
                user: req.session.user,
                product: req.body,
                error: `Required fields are missing: ${missingFields.join(', ')}`
            });
        }

        // Validate numeric fields
        const PPriceNum = parseFloat(PPrice);
        const PRatingNum = parseFloat(PRating);
        const PYearNum = parseInt(PYear, 10);
        const PQuantityNum = parseInt(PQuantity, 10) || 0;
        if (isNaN(PPriceNum) || isNaN(PRatingNum) || isNaN(PYearNum) || PRatingNum < 0 || PRatingNum > 5) {
            console.error('Invalid numeric fields:', { PPrice, PRating, PYear });
            return res.render('modify-page', {
                user: req.session.user,
                product: req.body,
                error: 'Price, Rating (0–5), and Year must be valid numbers'
            });
        }

        // Prepare form data for backend
        const formData = new FormData();
        formData.append('PName', PName);
        formData.append('PShop', PShop);
        formData.append('PCategory', PCategory);
        formData.append('PRating', PRatingNum);
        formData.append('PPrice', PPriceNum);
        formData.append('PSize', PSize);
        if (PMaterial) formData.append('PMaterial', PMaterial);
        formData.append('PYear', PYearNum);
        formData.append('PQuantity', PQuantityNum);
        formData.append('PDescription', PSeries ? (PDescription ? `${PDescription}\nSeries: ${PSeries}` : `Series: ${PSeries}`) : PDescription || '');
        formData.append('existingImage', existingImage || '');
        if (req.file) {
            const fileStream = fs.createReadStream(path.join(__dirname, 'additional', 'image', 'uploads', req.file.filename));
            formData.append('mainImage', fileStream, req.file.originalname);
        }

        const response = await fetch(`${backendBaseUrl}/api/products/${pid}`, {
            method: 'PUT',
            body: formData
        });
        const data = await response.json();
        console.log('Backend modify-page response:', data);
        if (!response.ok) throw new Error(data.error || 'Failed to update product');
        res.redirect('/modify-web');
    } catch (error) {
        console.error('Error updating product:', error.message);
        res.render('modify-page', {
            user: req.session.user,
            product: req.body,
            error: `Server error: ${error.message}`
        });
    }
});

// Delete route
app.get('/delete', isAdmin, async (req, res) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products`);
        const products = await response.json();
        if (!response.ok) throw new Error(products.error || 'Failed to fetch products');
        res.render('delete-search', {
            products: products || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching delete data:', error.message);
        res.status(500).send('Server error');
    }
});

// Delete-product route
app.post('/delete-product', isAdmin, upload.none(), async (req, res) => {
    const { pid } = req.body;
    if (!pid) return res.status(400).send('Product ID is required');
    try {
        const response = await fetch(`${backendBaseUrl}/api/products/${pid}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete product');
        res.redirect('/delete');
    } catch (error) {
        console.error('Error deleting product:', error.message);
        res.status(500).send('Server error');
    }
});

// Add route
app.get('/add', isAdmin, (req, res) => {
    res.render('add', {
        user: req.session.user,
        error: null
    });
});

// Add-product route
app.post('/add-product', isAdmin, upload.single('mainImage'), async (req, res) => {
    try {
        console.log('Add-product request body:', req.body);
        console.log('Uploaded file:', req.file);
        const {
            PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription, PSeries
        } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!PName) missingFields.push('Product name');
        if (!PShop) missingFields.push('Brand');
        if (!PCategory) missingFields.push('Category');
        if (!PRating && PRating !== '0') missingFields.push('Rating');
        if (!PPrice && PPrice !== '0') missingFields.push('Price');
        if (!PSize) missingFields.push('Size');
        if (!PYear) missingFields.push('Year');
        if (!PDescription) missingFields.push('Description');
        if (!req.file) missingFields.push('Main image');
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            return res.render('add', {
                user: req.session.user,
                error: `Required fields are missing: ${missingFields.join(', ')}`
            });
        }

        // Validate numeric fields
        const PPriceNum = parseFloat(PPrice);
        const PRatingNum = parseFloat(PRating);
        const PYearNum = parseInt(PYear, 10);
        const PQuantityNum = parseInt(PQuantity, 10) || 0;
        if (isNaN(PPriceNum) || isNaN(PRatingNum) || isNaN(PYearNum) || PRatingNum < 0 || PRatingNum > 5) {
            console.log('Invalid numbers:', { PPrice, PRating, PYear });
            return res.render('add', {
                user: req.session.user,
                error: 'Price, Rating (0–5), and Year must be valid numbers'
            });
        }

        // Prepare FormData for backend
        const formData = new FormData();
        formData.append('PName', PName);
        formData.append('PShop', PShop);
        formData.append('PCategory', PCategory);
        formData.append('PRating', PRatingNum);
        formData.append('PPrice', PPriceNum);
        formData.append('PSize', PSize);
        if (PMaterial) formData.append('PMaterial', PMaterial);
        formData.append('PYear', PYearNum);
        formData.append('PQuantity', PQuantityNum);
        formData.append('PDescription', PSeries ? (PDescription ? `${PDescription}\nSeries: ${PSeries}` : `Series: ${PSeries}`) : PDescription || '');
        if (req.file) {
            const fileStream = fs.createReadStream(path.join(__dirname, 'additional', 'image', 'uploads', req.file.filename));
            formData.append('mainImage', fileStream, req.file.originalname);
        }

        const response = await fetch(`${backendBaseUrl}/api/products`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to add product');
        res.redirect('/modify-web');
    } catch (error) {
        console.error('Error adding product:', error.message);
        res.render('add', {
            user: req.session.user,
            error: `Server error: ${error.message}`
        });
    }
});

// Search suggestions route
app.get('/search-suggestions', async (req, res) => {
    const searchTerm = req.query.q || '';
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?q=${encodeURIComponent(searchTerm)}&suggestions=true`);
        const suggestions = await response.json();
        if (!response.ok) throw new Error(suggestions.error || 'Failed to fetch suggestions');
        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Search route
app.get('/search', async (req, res) => {
    const searchTerm = req.query.q || '';
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?q=${encodeURIComponent(searchTerm)}`);
        const products = await response.json();
        if (!response.ok) throw new Error(products.error || 'Failed to fetch search results');
        res.render('search', {
            searchTerm,
            products: products || [],
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching search results:', error.message);
        res.status(500).send('Server error');
    }
});

// Search-results route
app.get('/search-results', async (req, res) => {
    const { name, category, size, priceRange } = req.query;
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (category) params.append('category', category);
    if (size && size !== 'none') params.append('size', size);
    if (priceRange && priceRange !== 'none') params.append('priceRange', priceRange);
    try {
        const response = await fetch(`${backendBaseUrl}/api/products?${params.toString()}`);
        const products = await response.json();
        if (!response.ok) throw new Error(products.error || 'Failed to fetch search results');
        res.json(products);
    } catch (error) {
        console.error('Error fetching search results:', error.message);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Admin route
app.get('/admin', (req, res) => {
    if (!req.session.user) {
        console.log('No user in session, redirecting to login');
        return res.redirect('/login');
    }
    const user = req.session.user;
    console.log('Rendering admin page for user:', user.email);
    res.render('admin', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        user: req.session.user
    });
});

// Detail route
app.get('/detail', async (req, res) => {
    const pid = req.query.pid;
    if (!pid) {
        return res.render('detail', { product: null, recommended: [], user: req.session.user || null });
    }
    try {
        const response = await fetch(`${backendBaseUrl}/api/products/${pid}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch product details');
        const product = data.product || null;
        const recommended = data.recommended || [];
        res.render('detail', {
            product: product ? {
                pid: product.PID,
                name: product.PName,
                shop: product.PShop,
                category: product.PCategory,
                rating: product.PRating || 'N/A',
                price: parseFloat(product.PPrice) || 0,
                size: product.PSize || 'N/A',
                material: product.PMaterial || 'N/A',
                year: product.PYear || 'N/A',
                image: product.PImage,
                description: product.PDescription
            } : null,
            recommended,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.status(500).send('Server error');
    }
});

// Check login status
app.get('/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Register POST route
app.post('/register', upload.none(), async (req, res) => {
    console.log('Register request body:', req.body);
    try {
        const response = await fetch(`${backendBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        console.log('Backend register response:', data);
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login POST route
app.post('/login', upload.none(), async (req, res) => {
    console.log('Login request body:', req.body);
    try {
        const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        console.log('Backend login response:', data);
        if (!response.ok) throw new Error(data.error || 'Login failed');
        req.session.user = data.user;
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Admin login POST route
app.post('/adminlogin', upload.none(), async (req, res) => {
    console.log('Admin login request body:', req.body);
    try {
        const response = await fetch(`${backendBaseUrl}/api/auth/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        console.log('Backend admin login response:', data);
        if (!response.ok) throw new Error(data.error || 'Admin login failed');
        req.session.user = data.user;
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error during admin login:', error.message);
        res.status(500).json({ error: 'Admin login failed', details: error.message });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Logout failed');
        }
        console.log('User logged out successfully');
        res.redirect('/login');
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`404: Invalid access at ${req.path}`);
    res.status(404).sendFile(path.join(__dirname, 'html', 'error.html'), err => {
        if (err) {
            console.error('Server error:', err);
            res.status(500).send('Something went wrong!');
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Frontend server listening on port: ${port}`);
});