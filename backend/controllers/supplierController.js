const db = require('../config/db');

exports.getSuppliers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT supplier_id, company_name FROM suppliers');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).send('Error fetching suppliers');
    }
};

exports.getMedicinesBySupplier = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT medicine_id, name, description FROM medicines WHERE supplier_id = ?',
            [req.query.supplier_id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching medicines:', error);
        res.status(500).send('Error fetching medicines');
    }
};

exports.addMedicine = async (req, res) => {
    const { name, description } = req.body;
    try {
        await db.query(
            'INSERT INTO medicines (supplier_id, name, description) VALUES (?, ?, ?)',
            [req.session.supplierId, name, description]
        );
        res.send('Medicine added successfully');
    } catch (error) {
        console.error('Error adding medicine:', error);
        res.status(500).send('Error adding medicine');
    }
};

exports.getRequests = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.username AS customer_name, c.contact_info, m.name AS medicine_name,
                    r.quantity, r.request_date, r.request_id
             FROM requests r
             JOIN customers c ON r.customer_id = c.customer_id
             JOIN users u ON c.user_id = u.user_id
             JOIN medicines m ON r.medicine_id = m.medicine_id
             WHERE r.supplier_id = ?`,
            [req.session.supplierId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).send('Error fetching requests');
    }
};

exports.updateRequest = async (req, res) => {
    const { request_id, status } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE Requests SET status = ? WHERE request_id = ?',
            [status, request_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send('No request found or updated');
        }
        res.send('Request status updated successfully');
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).send('Error updating request status');
    }
};