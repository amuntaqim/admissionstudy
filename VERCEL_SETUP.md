# Moving nextgate-exam-tracker from Netlify to Vercel (GitHub)

Your frontend (`index.html`, fonts, icons) is **not touched at all**. Only the
backend function had to be rewritten, because Vercel can't run Netlify
Functions or use Netlify Blobs — it needs its own equivalents. The site will
look and behave identically.

## 1. What changed and why

| Netlify piece | Vercel replacement | Why |
|---|---|---|
| `netlify/functions/data.mjs` | `api/data.js` | Vercel's serverless function folder is `/api`, not `netlify/functions` |
| `@netlify/blobs` (storage) | `@vercel/kv` (storage) | Netlify Blobs doesn't exist on Vercel; Vercel KV is the closest equivalent (a small Redis-backed key/value store) — perfect for your single `state` JSON blob |
| `netlify.toml` | `vercel.json` | Vercel's config file format |
| `package.json` dependency | swapped to `@vercel/kv` | new storage client library |

Your `index.html` calls `fetch('/.netlify/functions/data')` — I didn't change
that line. Instead, `vercel.json` **rewrites** that exact URL to the new
`/api/data` function behind the scenes, so nothing in your JS needed editing.

## 2. Files to put in your GitHub repo

Repo root (same layout as your Netlify repo):
```
/
├── index.html                (unchanged — your existing file)
├── favicon.png, favicon-16.png, favicon-32.png, apple-touch-icon.png  (unchanged)
├── AdorNoirrit-*.woff         (all 10 font files, unchanged)
├── package.json               (updated — @vercel/kv instead of @netlify/blobs)
├── vercel.json                (new — replaces netlify.toml)
└── api/
    └── data.js                (new — replaces netlify/functions/data.mjs)
```

You can delete `netlify.toml` and the old `netlify/functions/` folder from
the repo — Vercel ignores them anyway, but no harm keeping them if you want a
quick way back to Netlify later.

## 3. Set up Vercel KV (storage)

Netlify Blobs was auto-provisioned; on Vercel you connect a KV store once:

1. Push this repo to GitHub, then import it in Vercel ("Add New Project" →
   pick the repo).
2. In the new Vercel project: **Storage** tab → **Create Database** →
   **KV** → give it a name → Create.
3. Vercel automatically adds the required env vars
   (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.) to your project — you don't
   need to set these yourself.

## 4. Set your admin password

Same as on Netlify, just in a different dashboard:

- Vercel project → **Settings** → **Environment Variables**
- Add `ADMIN_PASSWORD` = (the same value you used on Netlify, or a new one)
- Redeploy

## 5. Deploy

Once the KV store is attached and `ADMIN_PASSWORD` is set, click **Deploy**
(or push to `main` — Vercel auto-deploys on every push once connected).

## 6. Verify

- Visit your new Vercel URL — the site should load exactly as before.
- Open dev tools → Network tab → confirm the call to
  `/.netlify/functions/data` returns `200` (this proves the rewrite to
  `/api/data` is working).
- Try saving something from the admin panel to confirm `POST` + KV writes
  work.

## Note on old data

Data stored in Netlify Blobs does **not** carry over automatically — it's a
separate storage system. If you have existing exam data you want to keep,
open your Netlify site's admin panel, export/copy that data first, then
re-enter or import it once the Vercel site + KV store are live.
