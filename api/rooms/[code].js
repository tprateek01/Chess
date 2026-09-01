// Vercel Serverless Function: /api/rooms/[code]
//
// Storage is Neon Postgres, accessed via @neondatabase/serverless — Neon's
// HTTP-based driver, which is what you want in a serverless function
// (a normal `pg` connection is a persistent TCP socket; serverless cold
// starts open one per invocation and will exhaust Neon's connection limit
// fast). Requires the `rooms` table to already exist — see the CREATE
// TABLE statement in DEPLOY.md, run once via Neon's SQL editor.
//
// Requires DATABASE_URL to be set:
//   - locally: in .env.local (gitignored — never commit real credentials)
//   - in production: Vercel → Project → Settings → Environment Variables

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const ROOM_TTL_HOURS = 24; // stale rooms are treated as gone after this long

module.exports = async (req, res) => {
  const code = String(req.query.code || '').toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'missing room code' });
    return;
  }

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT data FROM rooms
      WHERE code = ${code}
        AND updated_at > now() - interval '24 hours'
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.status(200).json(rows[0].data);
    return;
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'expected a JSON room object' });
      return;
    }
    await sql`
      INSERT INTO rooms (code, data, updated_at)
      VALUES (${code}, ${JSON.stringify(body)}::jsonb, now())
      ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM rooms WHERE code = ${code}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).json({ error: `method ${req.method} not allowed` });
};
