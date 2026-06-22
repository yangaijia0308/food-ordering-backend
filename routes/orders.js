import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import menuData from '../data/menu.js';

const router = Router();

// In-memory order store
const orders = new Map();

// Helper: validate order items against the menu
function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Items must be a non-empty array' };
  }

  const menuMap = new Map(menuData.items.map((item) => [item.id, item]));

  for (const entry of items) {
    if (!entry.id || !entry.quantity) {
      return { valid: false, error: 'Each item must have id and quantity' };
    }
    const menuItem = menuMap.get(entry.id);
    if (!menuItem) {
      return { valid: false, error: `Menu item not found: ${entry.id}` };
    }
    if (!menuItem.available) {
      return { valid: false, error: `Menu item unavailable: ${entry.id}` };
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      return { valid: false, error: `Invalid quantity for item: ${entry.id}` };
    }
  }

  return { valid: true };
}

// Helper: compute total price in cents
function computeTotal(items) {
  const menuMap = new Map(menuData.items.map((item) => [item.id, item]));
  return items.reduce((sum, entry) => sum + menuMap.get(entry.id).price * entry.quantity, 0);
}

// POST /api/orders — create a new order
router.post('/', (req, res) => {
  try {
    const { items, customer } = req.body;

    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Customer name, phone, and address are required' });
    }

    const validation = validateOrderItems(items);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const id = uuidv4();
    const total = computeTotal(items);

    const order = {
      id,
      items,
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes || '',
      },
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.set(id, order);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders — list all orders
router.get('/', (req, res) => {
  try {
    res.json(Array.from(orders.values()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// GET /api/orders/:id — get a specific order
router.get('/:id', (req, res) => {
  try {
    const order = orders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', (req, res) => {
  try {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = orders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export { orders };
export default router;
