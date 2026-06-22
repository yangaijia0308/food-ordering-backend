import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();

// Lazy-initialise Stripe so the server can start without a valid key
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

// In-memory store for payment intents (maps paymentIntentId → { orderId, status })
const payments = new Map();

// Reference to orders store — will be set from server.js
let ordersMap;

export function setOrdersStore(store) {
  ordersMap = store;
}

// POST /api/payment/create-payment-intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ error: 'Amount must be a positive integer in cents' });
    }
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { orderId },
    });

    payments.set(paymentIntent.id, { orderId, status: 'requires_confirmation' });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    const message = error.type === 'StripeAuthenticationError'
      ? 'Stripe authentication failed — check your API key'
      : error.message || 'Failed to create payment intent';
    res.status(500).json({ error: message });
  }
});

// POST /api/payment/confirm
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ error: 'paymentIntentId and orderId are required' });
    }

    const stripe = getStripe();

    // Retrieve the payment intent from Stripe to verify its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: `Payment not completed. Status: ${paymentIntent.status}` });
    }

    // Update local payment record
    payments.set(paymentIntentId, { orderId, status: 'succeeded' });

    // Update order payment status if orders store is available
    if (ordersMap && ordersMap.has(orderId)) {
      const order = ordersMap.get(orderId);
      order.paymentStatus = 'paid';
      order.updatedAt = new Date().toISOString();
    }

    res.json({ paymentIntentId, orderId, status: 'succeeded' });
  } catch (error) {
    const message = error.type === 'StripeAuthenticationError'
      ? 'Stripe authentication failed — check your API key'
      : error.message || 'Failed to confirm payment';
    res.status(500).json({ error: message });
  }
});

export default router;
