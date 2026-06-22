import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MENU_PATH = join(__dirname, '..', 'data', 'menu.json');

// Read menu data from JSON file
function readMenu() {
  try {
    const raw = readFileSync(MENU_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { categories: [], items: [] };
  }
}

// Write menu data to JSON file
function writeMenu(data) {
  writeFileSync(MENU_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const router = Router();

// GET /api/menu — returns full menu with categories and items
router.get('/', (req, res) => {
  try {
    const menuData = readMenu();
    res.json(menuData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu' });
  }
});

// ── Category CRUD ──

// POST /api/menu/categories — add a new category
router.post('/categories', (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'Category id and name are required' });
    }
    const menuData = readMenu();
    if (menuData.categories.find((c) => c.id === id)) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    menuData.categories.push({ id, name });
    writeMenu(menuData);
    res.status(201).json({ id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH /api/menu/categories/:id — update a category
router.patch('/categories/:id', (req, res) => {
  try {
    const { name } = req.body;
    const menuData = readMenu();
    const cat = menuData.categories.find((c) => c.id === req.params.id);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (name) cat.name = name;
    writeMenu(menuData);
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/menu/categories/:id — delete a category
router.delete('/categories/:id', (req, res) => {
  try {
    const menuData = readMenu();
    const idx = menuData.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }
    menuData.categories.splice(idx, 1);
    // Also remove items in this category
    menuData.items = menuData.items.filter((item) => item.category !== req.params.id);
    writeMenu(menuData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ── Item CRUD ──

// POST /api/menu/items — add a new menu item
router.post('/items', (req, res) => {
  try {
    const { name, description, price, image, available, category } = req.body;
    if (!name || price == null || !category) {
      return res.status(400).json({ error: 'name, price, and category are required' });
    }
    const menuData = readMenu();
    const cat = menuData.categories.find((c) => c.id === category);
    if (!cat) {
      return res.status(400).json({ error: 'Category does not exist' });
    }
    const item = {
      id: `item-${uuidv4().slice(0, 8)}`,
      name,
      description: description || {},
      price,
      image: image || '',
      available: available !== false,
      category,
    };
    menuData.items.push(item);
    writeMenu(menuData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PATCH /api/menu/items/:id — update a menu item (price, name, available, etc.)
router.patch('/items/:id', (req, res) => {
  try {
    const menuData = readMenu();
    const item = menuData.items.find((i) => i.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const { name, description, price, image, available, category } = req.body;
    if (name) item.name = name;
    if (description) item.description = description;
    if (price != null) item.price = price;
    if (image != null) item.image = image;
    if (available != null) item.available = available;
    if (category) {
      const cat = menuData.categories.find((c) => c.id === category);
      if (!cat) {
        return res.status(400).json({ error: 'Category does not exist' });
      }
      item.category = category;
    }
    writeMenu(menuData);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/menu/items/:id — delete a menu item
router.delete('/items/:id', (req, res) => {
  try {
    const menuData = readMenu();
    const idx = menuData.items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    menuData.items.splice(idx, 1);
    writeMenu(menuData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;
