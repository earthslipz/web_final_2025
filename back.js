const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3031;

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

// Middleware
app.use(cors({ origin: 'http://localhost:3030', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    if (err) {
        console.error('File filter error:', err);
        return res.status(400).json({ error: err.message });
    }
    next();
});

// Database connection
const connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    port: process.env.DB_PORT || 3306,
    password: process.env.DB_PASS || 'admin12345',
    database: process.env.DB_NAME || 'collectopia'
});

// Middleware to check if user is admin (for API routes)
const isAdmin = (req, res, next) => {
    // Note: Admin check is done via frontend session. For production, use JWT.
    next();
};

// Authentication Web Service
app.post('/api/auth/register', upload.none(), async (req, res) => {
    console.log('Received /api/auth/register request:', req.body);
    const { UsFname, UsLname, UsUsername, UsPassword, UsEmail, UsAddress } = req.body;
    if (!UsFname || !UsLname || !UsUsername || !UsPassword) {
        return res.status(400).json({ error: 'First name, last name, username, and password are required.' });
    }
    try {
        const UsID = await generateUsID();
        const hashedPassword = await bcrypt.hash(UsPassword, 10);
        const query = `
            INSERT INTO UserInfo (UsID, UsFname, UsLname, UsUsername, UsPassword, UsEmail, UsAddress)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(query, [UsID, UsFname, UsLname, UsUsername, hashedPassword, UsEmail || null, UsAddress || null], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Username or email already exists.' });
                }
                console.error('Database error in /api/auth/register:', err);
                return res.status(500).json({ error: 'Registration failed.', details: err.message });
            }
            res.status(201).json({ message: `Registration successful! Welcome, ${UsUsername}.` });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Registration failed.', details: error.message });
    }
});

app.post('/api/auth/login', upload.none(), async (req, res) => {
    const { UsEmail, UsPassword } = req.body;
    if (!UsEmail || !UsPassword) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const query = 'SELECT * FROM UserInfo WHERE UsEmail = ?';
        connection.query(query, [UsEmail], async (err, results) => {
            if (err) {
                console.error('Database error in /api/auth/login:', err);
                return res.status(500).json({ error: 'Login failed.', details: err.message });
            }
            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            const user = results[0];
            const passwordMatch = await bcrypt.compare(UsPassword, user.UsPassword);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
            res.status(200).json({
                message: `Welcome back, ${user.UsUsername}!`,
                user: {
                    id: user.UsID,
                    firstName: user.UsFname,
                    lastName: user.UsLname,
                    email: user.UsEmail,
                    isAdmin: false
                }
            });
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Login failed.', details: error.message });
    }
});

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
            const AdIDLog = await generateAdIDLog();
            const logQuery = `
                INSERT INTO adminLogin (AdIDLog, Adtime, Addate, AdID_FK)
                VALUES (?, CURTIME(), CURDATE(), ?)
            `;
            connection.query(logQuery, [AdIDLog, admin.AdID], (err) => {
                if (err) console.error('Error logging admin login:', err);
            });
            res.status(200).json({
                message: 'Login successful',
                adminId: admin.AdID,
                user: {
                    id: admin.AdID,
                    firstName: admin.AdFname,
                    lastName: admin.AdLname,
                    email: admin.AdEmail,
                    isAdmin: true
                }
            });
        });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Login failed due to server error' });
    }
});

// Product Search and Details Web Service
app.get('/api/products', (req, res) => {
    const { q, name, category, size, priceRange, maxPrice, newArrivals, popular, groupByCategory, suggestions } = req.query;
    try {
        if (newArrivals || popular) {
            const newArrivalQuery = `
                SELECT PID, PName, PPrice, PImage, PRating
                FROM postOfProduct
                WHERE PID IN ('PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
                ORDER BY FIELD(PID, 'PRD00001', 'PRD00002', 'PRD00003', 'PRD00004', 'PRD00005')
            `;
            const popularQuery = `
                SELECT PID, PName, PPrice, PImage, PRating
                FROM postOfProduct
                WHERE PID IN ('PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                              'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
                ORDER BY FIELD(PID, 'PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010',
                                    'PRD00011', 'PRD00012', 'PRD00013', 'PRD00014', 'PRD00015')
            `;
            connection.query(newArrivalQuery, (err, newArrivals) => {
                if (err) {
                    console.error('New arrivals query error:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                connection.query(popularQuery, (err, popular) => {
                    if (err) {
                        console.error('Popular query error:', err);
                        return res.status(500).json({ error: 'Database error', details: err.message });
                    }
                    newArrivals.forEach(product => {
                        product.PPrice = parseFloat(product.PPrice) || 0;
                        product.PRating = parseFloat(product.PRating) || 0;
                    });
                    popular.forEach(product => {
                        product.PPrice = parseFloat(product.PPrice) || 0;
                        product.PRating = parseFloat(product.PRating) || 0;
                    });
                    res.status(200).json({ newArrivals, popular });
                });
            });
            return;
        }
        if (groupByCategory) {
            const categoryQuery = 'SELECT DISTINCT PCategory FROM postOfProduct WHERE PCategory IS NOT NULL';
            const productQuery = `
                SELECT PID, PName, PPrice, PImage, PCategory, PRating
                FROM postOfProduct
                WHERE PName IS NOT NULL 
                  AND PPrice IS NOT NULL 
                  AND PImage IS NOT NULL 
                  AND PCategory IS NOT NULL
                ORDER BY PCategory, PName
            `;
            connection.query(categoryQuery, (err, categories) => {
                if (err) {
                    console.error('Category query error:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                connection.query(productQuery, (err, products) => {
                    if (err) {
                        console.error('Product query error:', err);
                        return res.status(500).json({ error: 'Database error', details: err.message });
                    }
                    const groupedProducts = {};
                    products.forEach(product => {
                        product.PPrice = parseFloat(product.PPrice) || 0;
                        product.PRating = parseFloat(product.PRating) || 0;
                        if (!groupedProducts[product.PCategory]) {
                            groupedProducts[product.PCategory] = [];
                        }
                        groupedProducts[product.PCategory].push(product);
                    });
                    res.status(200).json({
                        categories: categories.map(cat => cat.PCategory),
                        products: groupedProducts
                    });
                });
            });
            return;
        }
        if (suggestions) {
            const query = `
                SELECT PID, PName, PImage, PRating
                FROM postOfProduct
                WHERE PName LIKE ? OR PCategory LIKE ?
                LIMIT 5
            `;
            connection.query(query, [`%${q}%`, `%${q}%`], (err, results) => {
                if (err) {
                    console.error('Suggestions query error:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                results.forEach(product => {
                    product.PRating = parseFloat(product.PRating) || 0;
                });
                res.status(200).json(results);
            });
            return;
        }
        let query = `
            SELECT PID, PName, PPrice, PImage, PCategory, PShop, PSize, PMaterial, PYear, PQuantity, PRating, PDescription
            FROM postOfProduct
            WHERE 1=1
        `;
        const params = [];
        if (q) {
            query += ' AND (PName LIKE ? OR PCategory LIKE ? OR PShop LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (name) {
            query += ' AND PName LIKE ?';
            params.push(`%${name}%`);
        }
        if (category) {
            query += ' AND PCategory = ?';
            params.push(category);
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
        if (maxPrice) {
            query += ' AND PPrice <= ?';
            params.push(parseFloat(maxPrice));
        }
        query += ' ORDER BY PName';
        connection.query(query, params, (err, results) => {
            if (err) {
                console.error('Database error in /api/products:', err);
                return res.status(500).json({ error: 'Server error', details: err.message });
            }
            results.forEach(product => {
                product.PPrice = parseFloat(product.PPrice) || 0;
                product.PRating = parseFloat(product.PRating) || 0;
                product.PQuantity = parseInt(product.PQuantity, 10) || 0;
                product.PYear = parseInt(product.PYear, 10) || null;
            });
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Unexpected error in /api/products:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.get('/api/products/:pid', (req, res) => {
    const pid = req.params.pid;
    try {
        const query = `
            SELECT PID, PName, PPrice, PImage, PCategory, PShop, PSize, PMaterial, PYear, PQuantity, PRating, PDescription
            FROM postOfProduct
            WHERE PID = ?
        `;
        connection.query(query, [pid], (err, results) => {
            if (err) {
                console.error('Database error in /api/products/:pid:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            const product = results[0];
            product.PPrice = parseFloat(product.PPrice) || 0;
            product.PRating = parseFloat(product.PRating) || 0;
            product.PQuantity = parseInt(product.PQuantity, 10) || 0;
            product.PYear = parseInt(product.PYear, 10) || null;
            const recommendedQuery = `
                SELECT PID, PName, PPrice, PImage
                FROM postOfProduct
                WHERE PID IN ('PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010')
                ORDER BY FIELD(PID, 'PRD00006', 'PRD00007', 'PRD00008', 'PRD00009', 'PRD00010')
            `;
            connection.query(recommendedQuery, (err, recommended) => {
                if (err) {
                    console.error('Error fetching recommended products:', err);
                    recommended = [];
                }
                recommended.forEach(item => {
                    item.PPrice = parseFloat(item.PPrice) || 0;
                });
                res.status(200).json({
                    product,
                    recommended
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error in /api/products/:pid:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Product Management Web Service
app.post('/api/products', upload.single('mainImage'), async (req, res) => {
    console.log('Received /api/products POST request:', {
        body: req.body,
        file: req.file
    });
    const { PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription } = req.body;
    const missingFields = [];
    if (!PName) missingFields.push('Product name');
    if (!PShop) missingFields.push('Brand');
    if (!PCategory) missingFields.push('Category');
    if (!PRating && PRating !== '0') missingFields.push('Rating');
    if (!PPrice && PPrice !== '0') missingFields.push('Price');
    if (!PSize) missingFields.push('Size');
    if (!PYear) missingFields.push('Year');
    if (!req.file) missingFields.push('Image');
    if (missingFields.length > 0) {
        console.error('Missing fields in POST /api/products:', missingFields);
        return res.status(400).json({ error: `Required fields are missing: ${missingFields.join(', ')}` });
    }
    const PPriceNum = parseFloat(PPrice);
    const PRatingNum = parseFloat(PRating);
    const PYearNum = parseInt(PYear, 10);
    const PQuantityNum = parseInt(PQuantity, 10) || 0;
    if (isNaN(PPriceNum) || isNaN(PRatingNum) || isNaN(PYearNum) || PRatingNum < 0 || PRatingNum > 5) {
        console.error('Invalid numeric fields in POST /api/products:', { PPrice, PRating, PYear });
        return res.status(400).json({ error: 'Price, Rating (0–5), and Year must be valid numbers' });
    }
    try {
        const PID = await generatePID();
        const PImage = `/image/uploads/${req.file.filename}`;
        const query = `
            INSERT INTO postOfProduct (
                PID, PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PQuantity, PImage, PDescription
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(query, [
            PID, PName, PShop, PCategory, PRatingNum, PPriceNum, PSize, PMaterial || null, PYearNum, PQuantityNum, PImage, PDescription || null
        ], (err) => {
            if (err) {
                console.error('Database error in /api/products POST:', err);
                return res.status(500).json({ error: 'Failed to add product', details: err.message });
            }
            res.status(201).json({
                message: 'Product added',
                product: { PID, PName, PShop, PCategory, PRating: PRatingNum, PPrice: PPriceNum, PSize, PMaterial, PYear: PYearNum, PQuantity: PQuantityNum, PImage, PDescription }
            });
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.put('/api/products/:pid', upload.single('mainImage'), (req, res) => {
    console.log('Received /api/products/:pid PUT request:', {
        body: req.body,
        file: req.file
    });
    const pid = req.params.pid;
    const { PName, PShop, PCategory, PRating, PPrice, PSize, PMaterial, PYear, PQuantity, PDescription, existingImage } = req.body;
    const missingFields = [];
    if (!PName) missingFields.push('Product name');
    if (!PShop) missingFields.push('Brand');
    if (!PCategory) missingFields.push('Category');
    if (!PRating && PRating !== '0') missingFields.push('Rating');
    if (!PPrice && PPrice !== '0') missingFields.push('Price');
    if (!PSize) missingFields.push('Size');
    if (!PYear) missingFields.push('Year');
    if (missingFields.length > 0) {
        console.error(`Missing fields for PID ${pid}:`, missingFields);
        return res.status(400).json({ error: `Required fields are missing: ${missingFields.join(', ')}` });
    }
    const PPriceNum = parseFloat(PPrice);
    const PRatingNum = parseFloat(PRating);
    const PYearNum = parseInt(PYear, 10);
    const PQuantityNum = parseInt(PQuantity, 10) || 0;
    if (isNaN(PPriceNum) || isNaN(PRatingNum) || isNaN(PYearNum) || PRatingNum < 0 || PRatingNum > 5) {
        console.error(`Invalid numeric fields for PID ${pid}:`, { PPrice, PRating, PYear });
        return res.status(400).json({ error: 'Price, Rating (0–5), and Year must be valid numbers' });
    }
    let PImage = existingImage || null;
    if (req.file) {
        PImage = `/image/uploads/${req.file.filename}`;
        if (existingImage && existingImage.startsWith('/image/uploads/')) {
            fs.unlink(path.join(__dirname, 'additional', existingImage.slice(1)), err => {
                if (err) console.error('Error deleting old image:', err);
            });
        }
    }
    const query = `
        UPDATE postOfProduct
        SET 
            PName = ?,
            PShop = ?,
            PCategory = ?,
            PRating = ?,
            PPrice = ?,
            PSize = ?,
            PMaterial = ?,
            PYear = ?,
            PQuantity = ?,
            PImage = ?,
            PDescription = ?
        WHERE PID = ?
    `;
    connection.query(query, [
        PName, PShop, PCategory, PRatingNum, PPriceNum, PSize, PMaterial || null, PYearNum, PQuantityNum, PImage, PDescription || null, pid
    ], (err, result) => {
        if (err) {
            console.error('Database error in /api/products/:pid PUT:', err);
            return res.status(500).json({ error: 'Server error', details: err.message });
        }
        if (result.affectedRows === 0) {
            console.warn(`No product found for PID ${pid}`);
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({
            message: 'Product updated',
            product: { PID: pid, PName, PShop, PCategory, PRating: PRatingNum, PPrice: PPriceNum, PSize, PMaterial, PYear: PYearNum, PQuantity: PQuantityNum, PImage, PDescription }
        });
    });
});

app.delete('/api/products/:pid', (req, res) => {
    const pid = req.params.pid;
    const deleteReviewsQuery = 'DELETE FROM CustomerReview WHERE PID_FK = ?';
    const deleteProductsQuery = 'DELETE FROM Products WHERE PID_FK = ?';
    const deleteProductQuery = 'DELETE FROM postOfProduct WHERE PID = ?';
    connection.query(deleteReviewsQuery, [pid], (err) => {
        if (err) {
            console.error('Error deleting reviews:', err);
            return res.status(500).json({ error: 'Server error', details: err.message });
        }
        connection.query(deleteProductsQuery, [pid], (err) => {
            if (err) {
                console.error('Error deleting products:', err);
                return res.status(500).json({ error: 'Server error', details: err.message });
            }
            connection.query(deleteProductQuery, [pid], (err, result) => {
                if (err) {
                    console.error('Error deleting product:', err);
                    return res.status(500).json({ error: 'Server error', details: err.message });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }
                res.status(200).json({ message: 'Product deleted' });
            });
        });
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

// 404 handler
app.use((req, res) => {
    console.log(`404: Invalid access at ${req.path}`);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
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
        console.log(`Backend server listening on port: ${port}`);
    });
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down backend server...');
    connection.end(() => {
        console.log('Database pool closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);