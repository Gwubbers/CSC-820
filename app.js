const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

//Database Setup
const db = new Database(process.env.DB_PATH || './orders.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id         TEXT PRIMARY KEY,
    customer   TEXT NOT NULL,
    product    TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL
  )
`);

//Async Utility: Simulated Payment Gateway
function simulatePaymentGateway(orderId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ orderId, authorized: true, transactionId: uuidv4() });
    }, 500); 
  });
}

//POST /orders
app.post('/orders', async (req, res) => {
  const { customer, product, quantity } = req.body;

  if (!customer || !product || !quantity) {
    return res.status(400).json({
      error: 'Missing required fields: customer, product, quantity'
    });
  }

  if (typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  try {
    // Non-blocking async call — simulates a payment gateway authorization
    const payment = await simulatePaymentGateway(uuidv4());

    if (!payment.authorized) {
      return res.status(402).json({ error: 'Payment authorization failed' });
    }

    const newOrder = {
      id: uuidv4(),
      customer,
      product,
      quantity,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO orders (id, customer, product, quantity, status, created_at)
      VALUES (@id, @customer, @product, @quantity, @status, @created_at)
    `).run(newOrder);

    return res.status(201).json({
      message: 'Order created successfully',
      transactionId: payment.transactionId,
      order: newOrder
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

//GET /orders
app.get('/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return res.status(200).json({ count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

//GET /orders/:id
app.get('/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: `Order with id '${req.params.id}' not found` });
    }
    return res.status(200).json(order);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

//PATCH /orders/:id
const VALID_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

app.patch('/orders/:id', (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Missing required field: status' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Order with id '${req.params.id}' not found` });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    return res.status(200).json({ message: 'Order status updated', order: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

//DELETE /orders/:id 
app.delete('/orders/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Order with id '${req.params.id}' not found` });
    }

    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    return res.status(200).json({ message: `Order '${req.params.id}' successfully deleted` });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

//404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

//Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Order Management API running on http://localhost:${PORT}`);
});

module.exports = app;
// pipeline test Sat, Apr  4, 2026  1:13:58 AM
