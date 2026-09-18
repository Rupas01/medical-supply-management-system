require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/authRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const { requireRole } = require('./middleware/authMiddleware');

const app = express();

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// API Routes
app.use('/', authRoutes);
app.use('/', supplierRoutes);
app.use('/', customerRoutes);

// Protected HTML Dashboard Navigation
app.get('/supplier_dashboard', requireRole('SUPPLIER'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/supplier_dashboard.html'));
});

app.get('/customer_dashboard', requireRole('CUSTOMER'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/customer_dashboard.html'));
});

app.get('/admin_dashboard', requireRole('ADMIN'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin_dashboard.html'));
});

app.get('/medicines', requireRole('SUPPLIER'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/medicines.html'));
});

app.get('/customer_request', requireRole('SUPPLIER'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/customer_request.html'));
});

app.get('/purchase', requireRole('CUSTOMER'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/purchase.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;