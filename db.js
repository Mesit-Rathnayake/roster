const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }  // Neon requires SSL in production
    : false
});

/**
 * Create the rosters table if it doesn't already exist.
 * Called once on server startup.
 */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rosters (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      title       TEXT        NOT NULL DEFAULT 'Duty Roster',
      data        JSONB       NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Database ready');
}

module.exports = { pool, initDb };
