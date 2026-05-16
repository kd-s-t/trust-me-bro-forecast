# bitcoin-forecast

Next.js app: local JSON under `histories/`, chart, optional forecast series from `forecast/`.

## Run the app

```bash
npm install
npm run dev
```

Open the URL Next prints (default `http://localhost:3000`).

## Refresh price history from Kaggle

Export pulls the dataset, parses the matching CSV inside the ZIP, and writes **`histories/kaggle_bitcoin.json`** (mergeable with other `histories/*.json` files).

### Command

```bash
npm run kaggle:export
```

Pass CLI flags **after** `--`:

```bash
npm run kaggle:export -- --help
npm run kaggle:export -- --all
npm run kaggle:export -- --max-rows 50000
npm run kaggle:export -- --csv /absolute/path/to/file.csv
npm run kaggle:export -- --out histories/custom.json
```

### Auth (ZIP download only)

One of:

- **`KAGGLE_API_TOKEN`** in `bitcoin-forecast/.env` (token must start with `KGAT_`)
- **`KAGGLE_USERNAME`** and **`KAGGLE_KEY`** in the environment
- **`~/.kaggle/kaggle.json`** with `"username"` and `"key"`

Local CSV mode (`--csv`) does not call Kaggle.

### Defaults

Without `--all`, only the **last 30 000** rows are kept for a smaller JSON. With **`--all`**, every streamed row is written (large file and long runtime; the dev server may need more heap to load it).
# trust-me-bro-forecast
