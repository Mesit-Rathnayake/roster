require('dotenv').config();   // loads .env in local dev (no-op in production)
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { pool, initDb } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────────

/**
 * GET /api/rosters
 * Returns list of all rosters (id, title, dates only — no data payload).
 */
app.get('/api/rosters', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM rosters
       ORDER BY updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

/**
 * POST /api/rosters
 * Creates a new roster. Body: { title, data }
 * Returns the created roster row.
 */
app.post('/api/rosters', async (req, res) => {
  const { title, data } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO rosters (title, data)
       VALUES ($1, $2)
       RETURNING id, title, created_at, updated_at`,
      [title || 'Duty Roster', data || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create roster' });
  }
});

/**
 * GET /api/rosters/:id
 * Returns a full roster including data payload.
 */
app.get('/api/rosters/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rosters WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

/**
 * PUT /api/rosters/:id
 * Updates title and/or data. Body: { title?, data? }
 */
app.put('/api/rosters/:id', async (req, res) => {
  const { title, data } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rosters
       SET title      = COALESCE($1, title),
           data       = COALESCE($2, data),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, updated_at`,
      [title || null, data || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save roster' });
  }
});

/**
 * DELETE /api/rosters/:id
 */
app.delete('/api/rosters/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM rosters WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
});

// ── SPA fallback ──────────────────────────────────────────────────
// All non-API routes serve the frontend (enables ?id= URL sharing)
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🏥 MedRoster running → http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database init failed:', err.message);
    process.exit(1);
  });
