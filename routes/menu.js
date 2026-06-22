import { Router } from 'express';
import menuData from '../data/menu.js';

const router = Router();

// GET /api/menu — returns full menu with categories and items
router.get('/', (req, res) => {
  try {
    res.json(menuData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu' });
  }
});

export default router;
