const db = require('../config/db');

exports.getStatus = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.username AS customer_name, m.name AS medicine_name,
                    r.quantity, r.status, r.request_date
             FROM requests r
             JOIN customers c ON r.customer_id = c.customer_id
             JOIN users u ON c.user_id = u.user_id
             JOIN medicines m ON r.medicine_id = m.medicine_id
             WHERE u.user_id = ?
             ORDER BY r.request_date DESC`,
            [req.session.userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching purchase requests:', error);
        res.status(500).json({ error: 'Failed to fetch purchase requests' });
    }
};

exports.submitPurchase = async (req, res) => {
    const { medicines } = req.body;
    const userId = req.session.userId;

    if (!medicines || medicines.length === 0) {
        return res.status(400).send('No medicines selected');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [customers] = await connection.query(
            'SELECT customer_id FROM Customers WHERE user_id = ?',
            [userId]
        );

        if (customers.length === 0) {
            await connection.rollback();
            return res.status(400).send('Customer profile not found');
        }

        const customerId = customers[0].customer_id;

        for (const item of medicines) {
            const [medRows] = await connection.query(
                'SELECT supplier_id FROM Medicines WHERE medicine_id = ?',
                [item.medicine_id]
            );

            if (medRows.length === 0) {
                throw new Error(`Supplier not found for medicine_id: ${item.medicine_id}`);
            }

            await connection.query(
                'INSERT INTO Requests (customer_id, supplier_id, medicine_id, quantity, status) VALUES (?, ?, ?, ?, ?)',
                [customerId, medRows[0].supplier_id, item.medicine_id, item.quantity, 'PENDING']
            );
        }

        await connection.commit();
        res.send('Purchase request submitted successfully');
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting purchase:', error);
        res.status(500).send('Error submitting purchase');
    } finally {
        connection.release();
    }
};