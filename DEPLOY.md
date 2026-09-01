# Chessify — Vercel deployment

This project is a static frontend (`index.html`) plus two Vercel
Serverless Functions (`api/rooms/[code].js`, `api/health.js`) backed by
Neon Postgres for online-room storage. Deploying to Vercel serves both
together from one project — no separate backend host needed.

The `server/` folder (a standalone Express server) is **not used** by
this deployment — it was an earlier local-dev-only setup. You can
delete it, or keep it around if you ever want to self-host on a plain
VPS/Render/Railway instead of Vercel.

## 1. Push to GitHub

```
git init
git add .
git commit -m "Chessify"
```

Create a new empty repo on GitHub (github.com → New repository — don't
initialize it with a README, since you already have one), then:

```
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## 2. Import into Vercel

1. Go to vercel.com → log in (GitHub login is easiest) → **Add New… → Project**.
2. Select the repo you just pushed.
3. Framework preset: leave as **Other** (this isn't Next.js/React/etc.,
   just a static HTML file + serverless functions — Vercel handles
   that fine with no build step).
4. Click **Deploy**. It'll succeed, but Online rooms won't work yet —
   there's no KV store connected.

## 3. Set up Neon and connect it

1. Go to neon.tech → create a project (free tier is fine).
2. In the Neon console, open the **SQL Editor** for that project and run
   once:
   ```sql
   CREATE TABLE IF NOT EXISTS rooms (
     code TEXT PRIMARY KEY,
     data JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```
3. Copy the connection string from the Neon dashboard (**Connection
   Details**, pooled connection). It looks like
   `postgres://<user>:<password>@<host>/<database>?sslmode=require`.
4. **Do not put this in a committed `.env` file.** In Vercel: project →
   **Settings → Environment Variables** → add `DATABASE_URL` → paste
   the connection string → save for Production (and Preview/Development
   too, if you want previews and `vercel dev` to hit the same database).

   (Alternative: Vercel's **Storage** tab also offers Neon as a native
   integration — *Create Database → Postgres (powered by Neon)* — which
   creates the Neon project and wires `DATABASE_URL` in automatically.
   Either path works; the manual one just gives you a Neon account you
   control directly.)
5. Go to **Deployments**, open the latest one, and **Redeploy** (env
   vars only take effect on a fresh deployment).

## 4. Test it

Open your `*.vercel.app` URL:
- `Vs. computer` / `Pass and play` should work immediately (no backend
  needed for those).
- `Online room` → Create room → open the same URL in a second tab/device
  → Join with the code. Moves should sync within ~1.2s (polling
  interval).
- `/api/health` should return `{"ok":true}`.

## 5. Custom domain (optional)

Project → **Settings → Domains** → add your domain, follow the DNS
instructions Vercel shows you.

## Local development (optional)

```
npm install -g vercel     # if you don't have the CLI yet
vercel link                 # connect this folder to the Vercel project you created
vercel env pull .env.local  # pulls the real DATABASE_URL down locally (gitignored file)
vercel dev                  # runs the static site + /api functions together, matching production
```

`.env.example` shows the shape of what's needed if you'd rather create
`.env.local` by hand instead of `vercel env pull`.

Then open the URL `vercel dev` prints (usually `http://localhost:3000`).
This replaces the old Live Server + `node server.js` workflow — one
command now runs both the frontend and the API, against the same KV
store production uses.

## Making future changes

Any push to `main` on GitHub auto-deploys on Vercel. For a preview
without touching `main`, push a branch and open a PR — Vercel comments
a preview URL on it automatically.
