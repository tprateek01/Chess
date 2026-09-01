// GET /api/health -> confirms the API is deployed and the database is reachable.
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;
    res.status(200).json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(200).json({ ok: true, db: 'unreachable', error: e.message });
  }
};
