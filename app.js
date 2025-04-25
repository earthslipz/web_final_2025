const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();

const port = 3030;
const app = express();

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

// Database connection
const connection = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'shuttle.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    port: process.env.DB_PORT || 30033,
    password: process.env.DB_PASS || 'bgVkUfXGSBFnOOalvmRxtcWAFslIIarx',
    database: process.env.DB_NAME || 'railway'
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
    const newArrivalQuery = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PID IN ('PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
        ORDER BY FIELD(PID, 'PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
    `;
    const popularQuery = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PID IN ('PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                      'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
        ORDER BY FIELD(PID, 'PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                            'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
    `;
    connection.query(newArrivalQuery, (err, newArrivals) => {
        if (err) {
            console.error('Database error fetching new arrivals:', err);
            return res.status(500).send('Server error');
        }
        connection.query(popularQuery, (err, popular) => {
            if (err) {
                console.error('Database error fetching popular products:', err);
                return res.status(500).send('Server error');
            }
            newArrivals.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
            });
            popular.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
            });
            res.render('home', {
                newArrivals,
                popular,
                user: req.session.user || null
            });
        });
    });
});

// Home rout
// Home route
app.get('/home', (req, res) => {
    const newArrivalQuery = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PID IN ('PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
        ORDER BY FIELD(PID, 'PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
    `;
    const popularQuery = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PID IN ('PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                      'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
        ORDER BY FIELD(PID, 'PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                            'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
    `;
    connection.query(newArrivalQuery, (err, newArrivals) => {
        if (err) {
            console.error('Database error fetching new arrivals:', err);
            return res.status(500).send('Server error');
        }
        connection.query(popularQuery, (err, popular) => {
            if (err) {
                console.error('Database error fetching popular products:', err);
                return res.status(500).send('Server error');
            }
            newArrivals.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
            });
            popular.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
            });
            res.render('home', {
                newArrivals,
                popular,
                user: req.session.user || null
            });
        });
    });
});

// Static routes
const routes = {
    '/team': 'team.html',
    '/signup': 'signup.html',
    '/adminlogin': 'adminlogin.html'
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
app.get('/category', (req, res) => {
    const categoryQuery = 'SELECT DISTINCT PCategory FROM postOfProduct WHERE PCategory IS NOT NULL';
    connection.query(categoryQuery, (err, categories) => {
        if (err) {
            console.error('Database error fetching categories:', err);
            return res.status(500).send('Server error');
        }
        const productQuery = `
            SELECT PID, PName, PPrice, PImage, PCategory
            FROM postOfProduct
            WHERE PName IS NOT NULL 
              AND PPrice IS NOT NULL 
              AND PImage IS NOT NULL 
              AND PCategory IS NOT NULL
            ORDER BY PCategory, PName
        `;
        connection.query(productQuery, (err, products) => {
            if (err) {
                console.error('Database error fetching products:', err);
                return res.status(500).send('Server error');
            }
            const groupedProducts = {};
            products.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
                if (!groupedProducts[product.PCategory]) {
                    groupedProducts[product.PCategory] = [];
                }
                groupedProducts[product.PCategory].push(product);
            });
            res.render('category', {
                categories: categories.map(cat => cat.PCategory),
                products: groupedProducts,
                user: req.session.user || null
            });
        });
    });
});

// Modify-web route
app.get('/modify-web', isAdmin, (req, res) => {
    const categoryQuery = `
        SELECT DISTINCT PCategory 
        FROM postOfProduct 
        WHERE PCategory IS NOT NULL 
          AND PName IS NOT NULL 
          AND PPrice IS NOT NULL 
          AND PImage IS NOT NULL
    `;
    connection.query(categoryQuery, (err, categories) => {
        if (err) {
            console.error('Database error fetching categories:', err);
            return res.status(500).send('Server error');
        }
        const productQuery = `
            SELECT PID, PName, PPrice, PImage, PCategory
            FROM postOfProduct
            WHERE PName IS NOT NULL 
              AND PPrice IS NOT NULL 
              AND PImage IS NOT NULL 
              AND PCategory IS NOT NULL
            ORDER BY PCategory, PName
        `;
        connection.query(productQuery, (err, products) => {
            if (err) {
                console.error('Database error fetching products:', err);
                return res.status(500).send('Server error');
            }
            const groupedProducts = {};
            products.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
                if (!groupedProducts[product.PCategory]) {
                    groupedProducts[product.PCategory] = [];
                }
                groupedProducts[product.PCategory].push(product);
            });
            res.render('modify-web', {
                categories: categories.map(cat => cat.PCategory),
                products: groupedProducts,
                user: req.session.user
            });
        });
    });
});

// Modify-page route (GET)
app.get('/modify-page', isAdmin, (req, res) => {
    const pid = req.query.pid;
    if (!pid) {
        return res.status(400).send('Product ID is required');
    }
    const query = `
        SELECT PID, PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PImage, PDescription
        FROM postOfProduct
        WHERE PID = ?
    `;
    connection.query(query, [pid], (err, results) => {
        if (err) {
            console.error('Database error fetching product:', err);
            return res.status(500).send('Server error');
        }
        if (results.length === 0) {
            return res.status(404).send('Product not found');
        }
        const product = results[0];
        product.PPrice = parseFloat(product.PPrice);
        res.render('modify-page', {
            user: req.session.user,
            product
        });
    });
});

// Modify-page route (POST)
app.post('/modify-page', isAdmin, upload.single('mainImage'), (req, res) => {
    const {
        pid, PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription, PSeries
    } = req.body;
    // Validation
    if (!pid || !PName || !PShop || !PCategory || !PPrice || !PSize || !PYear) {
        return res.status(400).send('Required fields are missing');
    }
    const PPriceNum = parseFloat(PPrice);
    const PYearNum = parseInt(PYear);
    const PQuantityNum = parseInt(PQuantity) || 0;
    if (isNaN(PPriceNum) || isNaN(PYearNum)) {
        return res.status(400).send('Price and Year must be valid numbers');
    }
    // Handle image
    let PImage = req.body.existingImage;
    if (req.file) {
        PImage = `/image/uploads/${req.file.filename}`;
        if (req.body.existingImage && req.body.existingImage.startsWith('/image/uploads/')) {
            fs.unlink(path.join(__dirname, 'additional', req.body.existingImage.slice(1)), err => {
                if (err) console.error('Error deleting old image:', err);
            });
        }
    }
    // Append Series to Description if provided
    const finalDescription = PSeries ? 
        (PDescription ? `${PDescription}\nSeries: ${PSeries}` : `Series: ${PSeries}`) : 
        PDescription;
    const query = `
        UPDATE postOfProduct
        SET 
            PName = ?,
            PShop = ?,
            PCategory = ?,
            PPrice = ?,
            PSize = ?,
            PMaterial = ?,
            PYear = ?,
            PQuantity = ?,
            PImage = ?,
            PDescription = ?
        WHERE PID = ?
    `;
    const values = [
        PName,
        PShop,
        PCategory,
        PPriceNum,
        PSize,
        PMaterial || null,
        PYearNum,
        PQuantityNum,
        PImage,
        finalDescription || null,
        pid
    ];
    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Database error updating product:', err);
            return res.status(500).send('Server error');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Product not found');
        }
        res.redirect('/modify-web');
    });
});

// Delete route
app.get('/delete', isAdmin, (req, res) => {
    const query = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PName IS NOT NULL 
          AND PPrice IS NOT NULL 
          AND PImage IS NOT NULL
        ORDER BY PName
    `;
    connection.query(query, (err, products) => {
        if (err) {
            console.error('Database error fetching products:', err);
            return res.status(500).send('Server error');
        }
        products.forEach(product => {
            product.PPrice = parseFloat(product.PPrice);
        });
        res.render('delete-search', {
            products,
            user: req.session.user
        });
    });
});

// Delete-product route
app.post('/delete-product', isAdmin, (req, res) => {
    const { pid } = req.body;
    if (!pid) {
        return res.status(400).send('Product ID is required');
    }
    // Delete dependent records first
    const deleteReviewsQuery = 'DELETE FROM CustomerReview WHERE PID_FK = ?';
    const deleteProductsQuery = 'DELETE FROM Products WHERE PID_FK = ?';
    const deleteProductQuery = 'DELETE FROM postOfProduct WHERE PID = ?';
    
    connection.query(deleteReviewsQuery, [pid], (err) => {
        if (err) {
            console.error('Error deleting reviews:', err);
            return res.status(500).send('Server error');
        }
        connection.query(deleteProductsQuery, [pid], (err) => {
            if (err) {
                console.error('Error deleting products:', err);
                return res.status(500).send('Server error');
            }
            connection.query(deleteProductQuery, [pid], (err, result) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).send('Server error');
                }
                if (result.affectedRows === 0) {
                    return res.status(404).send('Product not found');
                }
                res.redirect('/delete');
            });
        });
    });
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
    const {
        PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription, PSeries
    } = req.body;

    // Debug logging
    console.log('Form data:', {
        PName, PShop, PCategory, PPrice, PSize, PYear, PDescription, PSeries, PMaterial, PQuantity
    });
    console.log('File:', req.file);

    // Validation
    const missingFields = [];
    if (!PName) missingFields.push('Product name');
    if (!PShop) missingFields.push('Brand');
    if (!PCategory) missingFields.push('Category');
    if (!PPrice) missingFields.push('Price');
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

    const PPriceNum = parseFloat(PPrice);
    const PYearNum = parseInt(PYear);
    const PQuantityNum = parseInt(PQuantity) || 0;

    if (isNaN(PPriceNum) || isNaN(PYearNum)) {
        console.log('Invalid numbers:', { PPrice, PYear });
        return res.render('add', {
            user: req.session.user,
            error: 'Price and Year must be valid numbers'
        });
    }

    // Generate PID
    const PID = await generatePID();

    // Handle image
    const PImage = `/image/uploads/${req.file.filename}`;

    // Append Series to Description if provided
    const finalDescription = PSeries ? 
        (PDescription ? `${PDescription}\nSeries: ${PSeries}` : `Series: ${PSeries}`) : 
        PDescription;

    const query = `
        INSERT INTO postOfProduct (
            PID, PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PImage, PDescription
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        PID,
        PName,
        PShop,
        PCategory,
        PPriceNum,
        PSize,
        PMaterial || null,
        PYearNum,
        PQuantityNum,
        PImage,
        finalDescription || null
    ];

    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Database error inserting product:', err);
            return res.status(500).render('add', {
                user: req.session.user,
                error: 'Failed to add product due to server error'
            });
        }
        res.redirect('/modify-web');
    });
});

// Generate PID
const generatePID = async () => {
    const query = 'SELECT PID FROM postOfProduct ORDER BY PID DESC LIMIT 1';
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            if (err) return reject(err);
            let newID = 'PRD00001';
            if (results.length > 0) {
                const lastID = results[0].PID;
                const num = parseInt(lastID.replace('PRD', '')) + 1;
                newID = `PRD${String(num).padStart(5, '0')}`;
            }
            resolve(newID);
        });
    });
};

// Search suggestions route
app.get('/search-suggestions', (req, res) => {
    const searchTerm = req.query.q || '';
    const query = `
        SELECT PID, PName, PImage
        FROM postOfProduct
        WHERE PName LIKE ? OR PCategory LIKE ?
        LIMIT 5
    `;
    connection.query(query, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Database error fetching suggestions:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(results);
    });
});

// Search route
app.get('/search', (req, res) => {
    const searchTerm = req.query.q || '';
    const query = `
        SELECT PID, PName, PPrice, PImage, PCategory, PShop, PRating
        FROM postOfProduct
        WHERE PName LIKE ? OR PCategory LIKE ? OR PShop LIKE ?
        ORDER BY PName
    `;
    connection.query(query, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Database error fetching search results:', err);
            return res.status(500).send('Server error');
        }
        results.forEach(product => {
            product.PPrice = parseFloat(product.PPrice);
            product.PRating = product.PRating ? parseFloat(product.PRating) : null;
        });
        res.render('search', {
            searchTerm: searchTerm,
            products: results,
            user: req.session.user || null
        });
    });
});

// Search-results route
app.get('/search-results', (req, res) => {
    const { name, category, size, priceRange } = req.query;
    let query = `
        SELECT PID, PName, PPrice, PImage, PCategory, PSize
        FROM postOfProduct
        WHERE 1=1
    `;
    const params = [];
    if (name) {
        query += ' AND PName LIKE ?';
        params.push(`%${name}%`);
    }
    if (category) {
        query += ' AND PCategory LIKE ?';
        params.push(`%${category}%`);
    }
    if (size && size !== 'none') {
        query += ' AND PSize = ?';
        params.push(size);
    }
    if (priceRange && priceRange !== 'none') {
        const [min, max] = priceRange.split('-');
        if (max) {
            query += ' AND PPrice BETWEEN ? AND ?';
            params.push(parseFloat(min), parseFloat(max));
        } else {
            query += ' AND PPrice >= ?';
            params.push(parseFloat(min));
        }
    }
    query += ' ORDER BY PName';
    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error fetching search results:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        results.forEach(product => {
            product.PPrice = parseFloat(product.PPrice);
        });
        res.json(results);
    });
});

// Login GET route
app.get('/login', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signin.html'));
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
app.get('/detail', (req, res) => {
    const pid = req.query.pid;
    if (!pid) {
        return res.render('detail', { product: null, recommended: [], user: req.session.user || null });
    }
    const productQuery = `
        SELECT PID, PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PImage, PDescription
        FROM postOfProduct
        WHERE PID = ?
    `;
    const recommendedQuery = `
        SELECT PID, PName, PPrice, PImage
        FROM postOfProduct
        WHERE PID IN ('PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010')
        ORDER BY FIELD(PID, 'PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010')
    `;
    connection.query(productQuery, [pid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Server error');
        }
        connection.query(recommendedQuery, (err, recommended) => {
            if (err) {
                console.error('Database error fetching recommended:', err);
                return res.status(500).send('Server error');
            }
            recommended.forEach(product => {
                product.PPrice = parseFloat(product.PPrice);
            });
            if (results.length === 0) {
                return res.render('detail', { product: null, recommended, user: req.session.user || null });
            }
            const product = results[0];
            res.render('detail', {
                product: {
                    pid: product.PID,
                    name: product.PName,
                    shop: product.PShop,
                    category: product.PCategory,
                    rating: product.PRating || 'N/A',
                    price: parseFloat(product.PPrice),
                    size: product.PSize || 'N/A',
                    material: product.PMaterial || 'N/A',
                    year: product.PYear || 'N/A',
                    image: product.PImage,
                    description: product.PDescription
                },
                recommended,
                user: req.session.user || null
            });
        });
    });
});

// Check login status
app.get('/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Already logged-in route
app.get('/already-logged-in', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'already-logged-in.html'));
});

// Register POST route
app.post('/register', upload.none(), async (req, res) => {
    console.log('Parsed request body:', req.body);
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is missing or empty.' });
    }
    const { UsFname, UsLname, UsUsername, UsPassword, UsEmail, UsAddress } = req.body;
    if (!UsFname || !UsLname || !UsUsername || !UsPassword) {
        return res.status(400).json({ error: 'First name, last name, username, and password are required.' });
    }
    try {
        const UsID = await generateUsID();
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(UsPassword, saltRounds);
        const query = `
            INSERT INTO UserInfo (UsID, UsFname, UsLname, UsUsername, UsPassword, UsEmail, UsAddress)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [UsID, UsFname, UsLname, UsUsername, hashedPassword, UsEmail || null, UsAddress || null];
        connection.query(query, values, (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Username or email already exists.' });
                }
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Registration failed due to server error.' });
            }
            console.log(`User ${UsUsername} registered successfully with ID ${UsID}!`);
            res.status(201).json({ message: `Registration successful! Welcome, ${UsUsername}. Please log in.` });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Registration failed due to server error.' });
    }
});

// Login POST route
app.post('/login', upload.none(), async (req, res) => {
    console.log('Login request body:', req.body);
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is missing or empty.' });
    }
    const { UsEmail, UsPassword } = req.body;
    if (!UsEmail || !UsPassword) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const query = 'SELECT * FROM UserInfo WHERE UsEmail = ?';
        connection.query(query, [UsEmail], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Login failed due to server error.' });
            }
            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const user = results[0];
            const passwordMatch = await bcrypt.compare(UsPassword, user.UsPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            req.session.user = {
                id: user.UsID,
                firstName: user.UsFname,
                lastName: user.UsLname,
                email: user.UsEmail,
                isAdmin: false
            };
            console.log('User logged in, session set:', req.session.user);
            res.status(200).json({ message: `Welcome back, ${user.UsUsername}!` });
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Login failed due to server error.' });
    }
});

// Admin login POST route
app.post('/adminlogin', upload.none(), async (req, res) => {
    console.log('Admin login request body:', req.body);
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is missing or empty.' });
    }
    const { AdEmail, AdPassword } = req.body;
    if (!AdEmail || !AdPassword) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const query = 'SELECT * FROM adminInfo WHERE AdEmail = ?';
        connection.query(query, [AdEmail], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Login failed due to server error.' });
            }
            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const admin = results[0];
            const passwordMatch = await bcrypt.compare(AdPassword, admin.AdPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            req.session.user = {
                id: admin.AdID,
                firstName: admin.AdFname,
                lastName: admin.AdLname,
                email: admin.AdEmail,
                isAdmin: true
            };
            console.log('Admin logged in, session set:', req.session.user);
            const AdIDLog = await generateAdIDLog();
            const logQuery = `
                INSERT INTO adminLogin (AdIDLog, Adtime, Addate, AdID_FK)
                VALUES (?, CURTIME(), CURDATE(), ?)
            `;
            connection.query(logQuery, [AdIDLog, admin.AdID], (err) => {
                if (err) console.error('Error logging admin login:', err);
            });
            res.status(200).json({ message: `Welcome back, ${admin.AdUsername}!` });
        });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Login failed due to server error.' });
    }
});

// Generate UsID
const generateUsID = async () => {
    const query = 'SELECT UsID FROM UserInfo ORDER BY UsID DESC LIMIT 1';
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            if (err) return reject(err);
            let newID = 'USR00001';
            if (results.length > 0) {
                const lastID = results[0].UsID;
                const num = parseInt(lastID.replace('USR', '')) + 1;
                newID = `USR${String(num).padStart(5, '0')}`;
            }
            resolve(newID);
        });
    });
};

// Generate AdIDLog
const generateAdIDLog = async () => {
    const query = 'SELECT AdIDLog FROM adminLogin ORDER BY AdIDLog DESC LIMIT 1';
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            if (err) return reject(err);
            let newID = 'LOG00001';
            if (results.length > 0) {
                const lastID = results[0].AdIDLog;
                const num = parseInt(lastID.replace('LOG', '')) + 1;
                newID = `LOG${String(num).padStart(5, '0')}`;
            }
            resolve(newID);
        });
    });
};

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

// Task 3: Web Services
// 1. Authentication Web Service
// Test Case 1:
// method: POST
// URL: http://localhost:3030/api/auth/admin
// body: raw JSON
// {
//     "AdEmail": "admin@example.com",
//     "AdPassword": "admin123"
// }
// Expected: 200, { "message": "Login successful", "adminId": "<AdID>" }

// Test Case 2:
// method: POST
// URL: http://localhost:3030/api/auth/admin
// body: raw JSON
// {
//     "AdEmail": "admin@example.com",
//     "AdPassword": "wrongpass"
// }
// Expected: 401, { "error": "Invalid email or password" }

app.post('/api/auth/admin', upload.none(), async (req, res) => {
    const { AdEmail, AdPassword } = req.body;
    if (!AdEmail || !AdPassword) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const query = 'SELECT * FROM adminInfo WHERE AdEmail = ?';
        connection.query(query, [AdEmail], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Login failed due to server error' });
            }
            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const admin = results[0];
            const passwordMatch = await bcrypt.compare(AdPassword, admin.AdPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            req.session.user = {
                id: admin.AdID,
                firstName: admin.AdFname,
                lastName: admin.AdLname,
                email: admin.AdEmail,
                isAdmin: true
            };
            const AdIDLog = await generateAdIDLog();
            const logQuery = `
                INSERT INTO adminLogin (AdIDLog, Adtime, Addate, AdID_FK)
                VALUES (?, CURTIME(), CURDATE(), ?)
            `;
            connection.query(logQuery, [AdIDLog, admin.AdID], (err) => {
                if (err) console.error('Error logging admin login:', err);
            });
            res.status(200).json({ message: 'Login successful', adminId: admin.AdID });
        });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Login failed due to server error' });
    }
});

// 2. Product/Service Search and Details Web Service
// Test Case 1 (No criteria search):
// method: GET
// URL: http://localhost:3030/api/products
// body: {}
// Expected: 200, Returns all products (e.g., [{ "PID": "PRD00001", "PName": "Product 1", ... }, ...])

// Test Case 2 (Criteria search):
// method: GET
// URL: http://localhost:3030/api/products?name=Phone&category=Electronics&maxPrice=1000
// body: {}
// Expected: 200, Returns products matching criteria (e.g., [{ "PID": "PRD00002", "PName": "Smartphone", ... }])

app.get('/api/products', (req, res) => {
    const { name, category, maxPrice } = req.query;
    let query = `
        SELECT PID, PName, PPrice, PImage, PCategory, PShop, PSize, PYear, PDescription
        FROM postOfProduct
        WHERE 1=1
    `;
    const params = [];
    if (name) {
        query += ' AND PName LIKE ?';
        params.push(`%${name}%`);
    }
    if (category) {
        query += ' AND PCategory = ?';
        params.push(category);
    }
    if (maxPrice) {
        query += ' AND PPrice <= ?';
        params.push(parseFloat(maxPrice));
    }
    query += ' ORDER BY PName';
    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error fetching products:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        results.forEach(product => {
            product.PPrice = parseFloat(product.PPrice);
        });
        res.status(200).json(results);
    });
});

// 3. Product/Service Management Web Service
// 3.1 Insert Product
// Test Case 1:
// method: POST
// URL: http://localhost:3030/api/products
// body: raw JSON
// {
//     "product": {
//         "PName": "Smartwatch",
//         "PShop": "TechBrand",
//         "PCategory": "Electronics",
//         "PPrice": 199.99,
//         "PSize": "Medium",
//         "PYear": 2023,
//         "PQuantity": 50,
//         "PDescription": "Latest smartwatch model"
//     }
// }
// Headers: { "Authorization": "Bearer <session-id>" } (ensure admin is logged in via session)
// Expected: 201, { "message": "Product added", "product": { "PID": "<generated>", ... } }

// Test Case 2:
// method: POST
// URL: http://localhost:3030/api/products
// body: raw JSON
// {
//     "product": {
//         "PName": "",
//         "PShop": "TechBrand",
//         "PCategory": "Electronics",
//         "PPrice": 199.99
//     }
// }
// Headers: { "Authorization": "Bearer <session-id>" }
// Expected: 400, { "error": "Required fields are missing" }

app.post('/api/products', isAdmin, upload.single('PImage'), async (req, res) => {
    const { PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription } = req.body.product || {};
    // Validation
    const missingFields = [];
    if (!PName) missingFields.push('Product name');
    if (!PShop) missingFields.push('Brand');
    if (!PCategory) missingFields.push('Category');
    if (!PPrice) missingFields.push('Price');
    if (!PSize) missingFields.push('Size');
    if (!PYear) missingFields.push('Year');
    if (!req.file) missingFields.push('Image');
    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Required fields are missing: ${missingFields.join(', ')}` });
    }
    const PPriceNum = parseFloat(PPrice);
    const PYearNum = parseInt(PYear);
    const PQuantityNum = parseInt(PQuantity) || 0;
    if (isNaN(PPriceNum) || isNaN(PYearNum)) {
        return res.status(400).json({ error: 'Price and Year must be valid numbers' });
    }
    try {
        const PID = await generatePID();
        const PImage = `/image/uploads/${req.file.filename}`;
        const query = `
            INSERT INTO postOfProduct (
                PID, PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PImage, PDescription
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            PID,
            PName,
            PShop,
            PCategory,
            PPriceNum,
            PSize,
            PMaterial || null,
            PYearNum,
            PQuantityNum,
            PImage,
            PDescription || null
        ];
        connection.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error inserting product:', err);
                return res.status(500).json({ error: 'Failed to add product' });
            }
            res.status(201).json({
                message: 'Product added',
                product: { PID, PName, PShop, PCategory, PPrice: PPriceNum, PSize, PYear: PYearNum, PQuantity: PQuantityNum, PImage, PDescription }
            });
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3.2 Update Product
// Test Case 1:
// method: PUT
// URL: http://localhost:3030/api/products/PRD00001
// body: raw JSON
// {
//     "product": {
//         "PName": "Updated Laptop",
//         "PShop": "TechBrand",
//         "PCategory": "Electronics",
//         "PPrice": 1099.99,
//         "PSize": "Large",
//         "PYear": 2024,
//         "PQuantity": 20,
//         "PDescription": "Updated model"
//     }
// }
// Headers: { "Authorization": "Bearer <session-id>" }
// Expected: 200, { "message": "Product updated", "product": { "PID": "PRD00001", ... } }

// Test Case 2:
// method: PUT
// URL: http://localhost:3030/api/products/PRD99999
// body: raw JSON
// {
//     "product": {
//         "PName": "Nonexistent Product",
//         "PShop": "TechBrand",
//         "PCategory": "Electronics",
//         "PPrice": 999.99
//     }
// }
// Headers: { "Authorization": "Bearer <session-id>" }
// Expected: 404, { "error": "Product not found" }

app.put('/api/products/:pid', isAdmin, upload.single('PImage'), (req, res) => {
    const pid = req.params.pid;
    const { PName, PShop, PCategory, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription } = req.body.product || {};
    // Validation
    const missingFields = [];
    if (!PName) missingFields.push('Product name');
    if (!PShop) missingFields.push('Brand');
    if (!PCategory) missingFields.push('Category');
    if (!PPrice) missingFields.push('Price');
    if (!PSize) missingFields.push('Size');
    if (!PYear) missingFields.push('Year');
    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Required fields are missing: ${missingFields.join(', ')}` });
    }
    const PPriceNum = parseFloat(PPrice);
    const PYearNum = parseInt(PYear);
    const PQuantityNum = parseInt(PQuantity) || 0;
    if (isNaN(PPriceNum) || isNaN(PYearNum)) {
        return res.status(400).json({ error: 'Price and Year must be valid numbers' });
    }
    // Handle image
    let PImage = null;
    if (req.file) {
        PImage = `/image/uploads/${req.file.filename}`;
    }
    const query = `
        UPDATE postOfProduct
        SET 
            PName = ?,
            PShop = ?,
            PCategory = ?,
            PPrice = ?,
            PSize = ?,
            PMaterial = ?,
            PYear = ?,
            PQuantity = ?,
            PImage = COALESCE(?, PImage),
            PDescription = ?
        WHERE PID = ?
    `;
    const values = [
        PName,
        PShop,
        PCategory,
        PPriceNum,
        PSize,
        PMaterial || null,
        PYearNum,
        PQuantityNum,
        PImage,
        PDescription || null,
        pid
    ];
    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Database error updating product:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({
            message: 'Product updated',
            product: { PID: pid, PName, PShop, PCategory, PPrice: PPriceNum, PSize, PYear: PYearNum, PQuantity: PQuantityNum, PImage: PImage || 'unchanged', PDescription }
        });
    });
});

// 3.3 Delete Product
// Test Case 1:
// method: DELETE
// URL: http://localhost:3030/api/products/PRD00001
// Headers: { "Authorization": "Bearer <session-id>" }
// Expected: 200, { "message": "Product deleted" }

// Test Case 2:
// method: DELETE
// URL: http://localhost:3030/api/products/PRD99999
// Headers: { "Authorization": "Bearer <session-id>" }
// Expected: 404, { "error": "Product not found" }

app.delete('/api/products/:pid', isAdmin, (req, res) => {
    const pid = req.params.pid;
    const deleteReviewsQuery = 'DELETE FROM CustomerReview WHERE PID_FK = ?';
    const deleteProductsQuery = 'DELETE FROM Products WHERE PID_FK = ?';
    const deleteProductQuery = 'DELETE FROM postOfProduct WHERE PID = ?';
    connection.query(deleteReviewsQuery, [pid], (err) => {
        if (err) {
            console.error('Error deleting reviews:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        connection.query(deleteProductsQuery, [pid], (err) => {
            if (err) {
                console.error('Error deleting products:', err);
                return res.status(500).json({ error: 'Server error' });
            }
            connection.query(deleteProductQuery, [pid], (err, result) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).json({ error: 'Server error' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }
                res.status(200).json({ message: 'Product deleted' });
            });
        });
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

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something went wrong!');
});

// Start server
connection.getConnection((err, conn) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to database successfully!');
    conn.release();
    app.listen(port, () => {
        console.log(`Server listening on port: ${port}`);
    });
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down server...');
    connection.end(() => {
        console.log('Database pool closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
