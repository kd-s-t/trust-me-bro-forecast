<p align="center">
  <img src="public/trust-me-bro-forecast.png" alt="Trust Me Bro Forecast" width="360" />
</p>

# trust-me-bro-forecast

Bitcoin price chart: history from **Postgres** (Kaggle), outlook from `forecast/`.

## Local setup

```bash
npm install
createdb trust-me-bro-forecast   # once
```

Copy `.env.example` → `.env` (`DATABASE_URL`, `KAGGLE_API_TOKEN`, `AUTH_SECRET`).

Sign in at `/login` — demo users: **kenn** / **john**, password **1234**.

```bash
npm run dev   # http://localhost:3000
```

Open the app and click **Update data** (top-left) to create tables and import from Kaggle.  
Optional locally: `npm run db:migrate` / `npm run db:sync` do the same thing as the button.

Sync only inserts rows newer than `MAX(time_ms)`. If the Kaggle dataset version is unchanged, download is skipped; if the CSV grew, only the new tail is parsed.

## Kaggle auth

Set on the host (Vercel env or `.env` locally):

- `KAGGLE_API_TOKEN` (`KGAT_…`), or
- `KAGGLE_USERNAME` + `KAGGLE_KEY`

## Vercel

1. Add **`DATABASE_URL`** (e.g. Neon) and **`KAGGLE_API_TOKEN`** in project settings.
2. Deploy — no CLI on the server.
3. Open the site → **Update data** for the first import (can take several minutes; use a plan with long function timeouts).

Tables are created automatically when you sync or load the chart.
