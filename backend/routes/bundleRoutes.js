// routes/bundleRoutes.js
const express = require('express');
const router = express.Router();
const {
  getBundles, getBundle, getBundlesByProduct,
  createBundle, updateBundle, deleteBundle,
  toggleBundle, getAdminBundles
} = require('../controllers/bundleController');

const { protect, adminOnly } = require('../middleware/auth');
// NOTE: ye apne existing auth middleware ke same names use karo
// agar tumhara middleware alag naam se hai jaise `isAdmin` to wahan replace karo

// ── Public routes ──────────────────────────────
router.get('/',                       getBundles);
router.get('/admin',   protect, adminOnly, getAdminBundles);  // admin list (includes inactive)
router.get('/by-product/:productId',  getBundlesByProduct);   // for product detail page
router.get('/:id',                    getBundle);

// ── Admin routes ───────────────────────────────
router.post('/',             protect, adminOnly, createBundle);
router.put('/:id',           protect, adminOnly, updateBundle);
router.delete('/:id',        protect, adminOnly, deleteBundle);
router.patch('/:id/toggle',  protect, adminOnly, toggleBundle);

module.exports = router;

/*
  server.js mein add karo:
  ─────────────────────────
  const bundleRoutes = require('./routes/bundleRoutes');
  app.use('/api/bundles', bundleRoutes);
*/