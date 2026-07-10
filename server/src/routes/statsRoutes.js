/**
 * @fileoverview Statistics routes — mounted at `/api/stats` in `app.js`.
 *
 * Purpose:
 *   Supply aggregated post counts for the client Statistics page (D3 charts):
 *   posts grouped by group name, and posts grouped by calendar month.
 *
 * Controllers (`statsController`):
 *   - getPostsByGroup — aggregation for the bar chart (count per group)
 *   - getPostsByMonth — aggregation for the line chart (count per YYYY-MM)
 *
 * Middleware:
 *   - `protect` — both endpoints require a valid JWT
 *
 * Public vs protected:
 *   - ALL routes here are PROTECTED.
 *
 * Query params vs route params:
 *   - Neither endpoint uses route params or query strings; both run fixed
 *     MongoDB aggregations and return JSON arrays for the charts.
 *
 * Route-order note:
 *   Paths are static literals only (`/posts-by-group`, `/posts-by-month`).
 *   There is no `/:id` in this router, so ordering between them does not
 *   affect matching — both are unambiguous fixed paths.
 */

const express = require('express');
const {
  getPostsByGroup,
  getPostsByMonth
} = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Data for the D3 charts on the Statistics page
router.get('/posts-by-group', protect, getPostsByGroup);
router.get('/posts-by-month', protect, getPostsByMonth);

module.exports = router;
