const db = require('../config/db');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query(
            'SELECT user_id, role FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (users.length === 0) {
            return res.status(401).send('Invalid username or password');
        }

        const user = users[0];
        req.session.userId = user.user_id;
        req.session.role = user.role;

        if (user.role === 'SUPPLIER') {
            const [suppliers] = await db.query(
                'SELECT supplier_id FROM suppliers WHERE user_id = ?',
                [user.user_id]
            );

            if (suppliers.length === 0) {
                return res.status(500).send('Supplier details not found');
            }

            req.session.supplierId = suppliers[0].supplier_id;
            return res.redirect('/supplier_dashboard');
        }

        switch (user.role) {
            case 'CUSTOMER':
                return res.redirect('/customer_dashboard');
            case 'ADMIN':
                return res.redirect('/admin_dashboard');
            default:
                return res.status(403).send('Unknown role');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send('Error logging in');
    }
};

exports.registerSupplier = async (req, res) => {
    const { username, password, confirm_password, company_name, contact_info } = req.body;

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, password, 'SUPPLIER']
        );

        await connection.query(
            'INSERT INTO suppliers (user_id, company_name, contact_info) VALUES (?, ?, ?)',
            [userResult.insertId, company_name, contact_info]
        );

        await connection.commit();
        res.redirect('/supplier_login.html');
    } catch (error) {
        await connection.rollback();
        console.error('Supplier registration error:', error);
        res.status(500).send('Error registering supplier');
    } finally {
        connection.release();
    }
};

exports.registerCustomer = async (req, res) => {
    const { username, password, confirm_password, contact_info } = req.body;

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, password, 'CUSTOMER']
        );

        await connection.query(
            'INSERT INTO customers (user_id, contact_info) VALUES (?, ?)',
            [userResult.insertId, contact_info]
        );

        await connection.commit();
        res.send('Registration successful');
    } catch (error) {
        await connection.rollback();
        console.error('Customer registration error:', error);
        res.status(500).send('Error registering customer');
    } finally {
        connection.release();
    }
};