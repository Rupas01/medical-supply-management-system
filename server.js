const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;


// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Should be true if using https
}));

// MySQL Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'medic'
});

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the admin login page
app.get('/admin_login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Handle supplier registration
app.post('/supplier_register', (req, res) => {
    const { username, password, confirm_password, company_name, contact_info } = req.body;

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    connection.beginTransaction((err) => {
        if (err) {
            console.error("Transaction error:", err);
            return res.status(500).send('Error starting transaction');
        }

        connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, password, 'supplier'],
            (error, results) => {
                if (error) {
                    console.error("Error in query (users):", error);
                    return connection.rollback(() => {
                        res.status(500).send('Error registering user');
                    });
                }

                const userId = results.insertId;

                connection.query(
                    'INSERT INTO suppliers (user_id, company_name, contact_info) VALUES (?, ?, ?)',
                    [userId, company_name, contact_info],
                    (error, results) => {
                        if (error) {
                            console.error("Error in query (supplier):", error);
                            return connection.rollback(() => {
                                res.status(500).send('Error registering supplier');
                            });
                        }

                        connection.commit((err) => {
                            if (err) {
                                console.error("Commit error:", err);
                                return connection.rollback(() => {
                                    res.status(500).send('Error committing transaction');
                                });
                            }

                            res.sendFile(path.join(__dirname, 'public', 'supplier_login.html'));
                        });
                    }
                );
            }
        );
    });
});

// Handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    connection.query(
        'SELECT user_id, role FROM users WHERE username = ? AND password = ?',
        [username, password],
        (error, results) => {
            if (error) {
                console.error("Error in query:", error);
                return res.status(500).send('Error logging in');
            }

            if (results.length === 0) {
                // User not found or incorrect credentials
                return res.status(401).send('Invalid username or password');
            }

            const user = results[0];
            req.session.userId = user.user_id;
            req.session.role = user.role;
            console.log("userID", req.session.userId)

            if (user.role === 'SUPPLIER') {
                connection.query(
                    'SELECT supplier_id FROM suppliers WHERE user_id = ?',
                    [user.user_id],
                    (err, supplierResults) => {
                        if (err) {
                            console.error("Error in query:", err);
                            return res.status(500).send('Error logging in');
                        }

                        if (supplierResults.length === 0) {
                            return res.status(500).send('Supplier details not found');
                        }

                        req.session.supplierId = supplierResults[0].supplier_id;
                        console.log(req.session.supplierId)
                        res.redirect('/supplier_dashboard');
                    }
                );
            } else {
                // Redirect user based on their role
                switch (user.role) {
                    case 'CUSTOMER':
                        res.redirect('/customer_dashboard');
                        break;
                    case 'ADMIN':
                        res.redirect('/admin_dashboard');
                        break;
                    default:
                        res.status(403).send('Unknown role');
                }
            }
        }
    );
});

app.post('/customer_register', (req, res) => {
    const { username, password, confirm_password, contact_info } = req.body;
    console.log("Received data:", { username, password, confirm_password, contact_info });

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    connection.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, password, 'CUSTOMER'],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Error registering user');
            }
            const user_id = results.insertId;
            connection.query(
                'INSERT INTO customers (user_id, contact_info) VALUES (?, ?)',
                [user_id, contact_info],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error registering customer details');
                    }
                    res.send('Registration successful');
                }
            );
        }
    );
});

// Route for the medicines page
app.get('/medicines', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'medicines.html'));
});

// Handle adding medicines
app.post('/add_medicine', (req, res) => {
    if (!req.session.userId || req.session.role !== 'SUPPLIER') {
        return res.status(401).send('Unauthorized');
    }

    const { name, description } = req.body;

    connection.query(
        'INSERT INTO medicines (supplier_id, name, description) VALUES (?, ?, ?)',
        [req.session.supplierId, name, description],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Error adding medicine');
            }
            res.send('Medicine added successfully');
        }
    );
});


// Fetch all suppliers
app.get('/get_suppliers', (req, res) => {
    connection.query('SELECT supplier_id, company_name FROM suppliers', (error, results) => {
        if (error) {
            console.error("Error fetching suppliers:", error);
            return res.status(500).send('Error fetching suppliers');
        }
        res.json(results);
    });
});

// Fetch medicines for a specific supplier
app.get('/get_medicines', (req, res) => {
    const supplierId = req.query.supplier_id;
    connection.query('SELECT medicine_id, name, description FROM medicines WHERE supplier_id = ?', [supplierId], (error, results) => {
        if (error) {
            console.error("Error fetching medicines:", error);
            return res.status(500).send('Error fetching medicines');
        }
        res.json(results);
    });
});

// Handle purchase submission
app.post('/submit_purchase', (req, res) => {
    console.log(req.body); // Log the received request body
    const { medicines } = req.body;
    const userId = req.session.userId; // Customer's user ID

    if (!userId) {
        return res.status(401).send('User not logged in');
    }

    if (!medicines || medicines.length === 0) {
        return res.status(400).send('No medicines selected');
    }

    // Fetch customer_id based on userId from the Customers table
    connection.query('SELECT customer_id FROM Customers WHERE user_id = ?', [userId], (error, results) => {
        if (error) {
            console.error("Error fetching customer_id:", error);
            return res.status(500).send('Error fetching customer data');
        }

        if (results.length === 0) {
            return res.status(400).send('Customer not found');
        }

        const customerId = results[0].customer_id;
        let errorOccurred = false;
        let completedQueries = 0;

        medicines.forEach(medicine => {
            const { medicine_id, quantity } = medicine;

            // Fetch supplier_id based on medicine_id from the Medicines table
            connection.query('SELECT supplier_id FROM Medicines WHERE medicine_id = ?', [medicine_id], (error, results) => {
                if (error) {
                    console.error("Error fetching supplier_id:", error);
                    errorOccurred = true;
                    completedQueries++;
                    if (completedQueries === medicines.length) {
                        return res.status(500).send('Error submitting purchase');
                    }
                    return;
                }

                if (results.length === 0) {
                    console.error("Supplier not found for medicine_id:", medicine_id);
                    errorOccurred = true;
                    completedQueries++;
                    if (completedQueries === medicines.length) {
                        return res.status(500).send('Error submitting purchase');
                    }
                    return;
                }

                const supplierId = results[0].supplier_id;
                console.log("control is here")
                // Insert into Requests table
                connection.query('INSERT INTO Requests (customer_id, supplier_id, medicine_id, quantity, status) VALUES (?, ?, ?, ?, ?)', [customerId, supplierId, medicine_id, quantity, 'PENDING'], (error) => {
                    if (error) {
                        console.error("Error inserting request:", error);
                        errorOccurred = true;
                    }

                    completedQueries++;

                    if (completedQueries === medicines.length) {
                        if (errorOccurred) {
                            return res.status(500).send('Error submitting purchase');
                        } else {
                            res.send('Purchase request submitted successfully');
                        }
                    }
                });
            });
        });
    });
});



app.get('/get_status', (req, res) => {
    const customerId = req.session.userId; // Assuming customer's user_id is stored in session
    console.log("userId:" , customerId)
    const query = `
      SELECT 
            u.username AS customer_name,
            m.name AS medicine_name,
            r.quantity,
            r.status,
            r.request_date
        FROM 
            requests r
            JOIN customers c ON r.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN medicines m ON r.medicine_id = m.medicine_id
        WHERE 
            u.user_id = ?
        ORDER BY 
            r.request_date DESC
    `;
  
    connection.query(query, [customerId], (err, results) => {
      if (err) {
        console.error('Error fetching purchase requests:', err);
        res.status(500).json({ error: 'Failed to fetch purchase requests' });
        return;
      }
      console.log(results)
      res.json(results);
    });
  });

// Supplier dashboard
app.get('/supplier_dashboard', (req, res) => {
    if (!req.session.userId || req.session.role !== 'SUPPLIER') {
        return res.status(401).send('Unauthorized');
    }
    res.sendFile(path.join(__dirname, 'public', 'supplier_dashboard.html'));
});

// purchase
app.get('/purchase', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'purchase.html'));
});

// Customer dashboard
app.get('/customer_dashboard', (req, res) => {
    if (!req.session.userId || req.session.role !== 'CUSTOMER') {
        return res.status(401).send('Unauthorized');
    }
    res.sendFile(path.join(__dirname, 'public', 'customer_dashboard.html'));
});

// Admin dashboard
app.get('/admin_dashboard', (req, res) => {
    if (!req.session.userId || req.session.role !== 'ADMIN') {
        return res.status(401).send('Unauthorized');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// customer request
app.get('/customer_request', (req, res) => {
    if (!req.session.userId || req.session.role !== 'SUPPLIER') {
        return res.status(401).send('Unauthorized');
    }
    res.sendFile(path.join(__dirname, 'public', 'customer_request.html'));
});

// Route to get purchase requests for a specific supplier
app.get('/get_requests', (req, res) => {
    const supplierId = req.session.supplierId;
    console.log("Supplier ID from session:", supplierId); // Log supplierId to check

    // SQL query with placeholders for supplierId
    const sql = `
        SELECT
            u.username AS customer_name,
            c.contact_info,
            m.name AS medicine_name,
            r.quantity,
            r.request_date,
            r.request_id
        FROM
            requests r
        JOIN
            customers c ON r.customer_id = c.customer_id
        JOIN
            users u ON c.user_id = u.user_id
        JOIN
            medicines m ON r.medicine_id = m.medicine_id
        WHERE
            r.supplier_id = ?
    `;

    // Execute the SQL query with supplierId as parameter
    connection.query(sql, [supplierId], (error, results) => {
        if (error) {
            console.error("Error fetching requests:", error);
            return res.status(500).send('Error fetching requests');
        }

        console.log("Fetched requests:", results); // Log fetched results

        res.json(results); // Send fetched results as JSON response
    });
});



// Route to update request status
app.post('/update_request', (req, res) => {
    const { request_id, status } = req.body;
    console.log(req.body)
    connection.query('UPDATE Requests SET status = ? WHERE request_id = ?', [status, request_id], (error, results) => {
        if (error) {
            console.error("Error updating request status:", error);
            return res.status(500).send('Error updating request status');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('No request found or updated');
        }

        res.send('Request status updated successfully');
    });
});





// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
