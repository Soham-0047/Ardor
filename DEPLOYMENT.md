# 🚀 FanForge — Setup & Deployment Guide

Everything here is **optional-by-design**: FanForge runs fully offline with zero API keys and zero installed databases. Add services only for the features you want live. Every service below has a **free tier with no credit card**.

---

## 1. Local setup (2 minutes, no accounts)

**Prerequisite:** Node.js ≥ 20 → [nodejs.org](https://nodejs.org) or via [nvm](https://github.com/nvm-sh/nvm) (`nvm install 20`).

```bash
git clone <your-repo-url> fanforge && cd fanforge
npm install
npm run dev
```

- Dashboard → **http://localhost:5173** (Vite dev server, proxies the API)
- API → **http://localhost:4000**

First boot auto-starts an **in-memory MongoDB** and ingests + scores the seeded dataset — the app is fully populated with no configuration. Verify everything with `npm run smoke` (15 end-to-end assertions).

---

## 2. Optional services — where to sign up, what to copy

Copy the env template first:

```bash
cp .env.example server/.env
```

| Feature | Service | Sign up at | Free tier | Env vars |
|---|---|---|---|---|
| AI passion scoring | **Google AI Studio (Gemini)** | [aistudio.google.com](https://aistudio.google.com) | 1,500 req/day, permanent | `GEMINI_API_KEY` |
| Passion warehouse | **Snowflake** | [signup.snowflake.com](https://signup.snowflake.com) (30-day trial) | $400 trial credit — fine for a weekend demo; Mongo fallback after | `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USERNAME`, `SNOWFLAKE_PASSWORD` (+ optional `SNOWFLAKE_DATABASE/SCHEMA/WAREHOUSE`) |
| Persistent database | **MongoDB Atlas** | [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register) (M0 cluster) | 512 MB, permanent | `MONGODB_URI` |
| Live World Cup feed | **football-data.org** | [football-data.org](https://www.football-data.org/client/register) | 10 req/min, permanent | `FOOTBALL_DATA_API_KEY` |
| Hype narration | **ElevenLabs** | [elevenlabs.io](https://elevenlabs.io/sign-up) | 10k chars/mo | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| On-chain badges | **Solana devnet** | no signup — faucet-funded | unlimited | `SOLANA_MINT_SECRET` |

### Step-by-step per service

**Google AI Studio (Gemini)**
1. Go to [aistudio.google.com](https://aistudio.google.com) → sign in with any Google account.
2. Click **Get API key** → **Create API key**.
3. Paste into `server/.env` as `GEMINI_API_KEY=...`
4. Restart — the header pill flips from "Heuristic scoring" to "Gemini scoring".

**Snowflake**
1. Sign up at [signup.snowflake.com](https://signup.snowflake.com) — pick any cloud/region; the trial needs no card.
2. Note your **account identifier** (Admin → Accounts, e.g. `abc12345.us-east-1`) and the username/password you created.
3. Fill `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USERNAME`, `SNOWFLAKE_PASSWORD`. Database/schema/warehouse default to `FANFORGE`/`PUBLIC`/`COMPUTE_WH` — create the database once in a worksheet (`CREATE DATABASE FANFORGE;`); the `PASSION_MOMENTS` table is created automatically.
4. Re-run ingest (button on the dashboard) to stream existing moments into the warehouse; `GET /api/warehouse` should now answer with `"engine": "snowflake"`.

**MongoDB Atlas** (persistence — without it, in-memory data resets each restart)
1. Register at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register) → create a free **M0** cluster (any region).
2. **Database Access** → add a database user (username + password).
3. **Network Access** → *Add IP* → `0.0.0.0/0` (fine for a demo; tighten later).
4. **Connect → Drivers** → copy the connection string, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/fanforge`
5. Set it as `MONGODB_URI`. Alternative: run Mongo locally with `docker run -d -p 27017:27017 mongo:7`.

**football-data.org**
1. Register at [football-data.org/client/register](https://www.football-data.org/client/register) — the key arrives by email.
2. Set `FOOTBALL_DATA_API_KEY`. Without live matches, FanForge automatically keeps using the seeded dataset.

**ElevenLabs**
1. Sign up at [elevenlabs.io](https://elevenlabs.io/sign-up).
2. Profile → **API key**; pick a voice in **Voices** and copy its ID.
3. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` — narration lights up automatically. Clips are cached to disk after first generation.

**Solana devnet** *(badges are simulated without it)*
1. Install the CLI: `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`
2. `solana-keygen new --outfile mint.json` then fund it: `solana airdrop 2 --keypair mint.json --url devnet`
3. Convert to base58 and set `SOLANA_MINT_SECRET` — minting lights up automatically. Badges become verifiable on [explorer.solana.com](https://explorer.solana.com/?cluster=devnet).

The dashboard's **"Under the hood"** panel shows live vs. fallback status for every integration — use it to confirm keys took effect.

---

## 3. Deploying

FanForge is a single deployable service: Express serves both `/api` and the built React client on one port. Any Node host or container platform works.

### Option A — Render (recommended, simplest)

1. Push the repo to GitHub. Sign up at [render.com](https://render.com) with your GitHub account (free tier, no card).
2. **New → Web Service** → connect the repo.
3. Settings:
   - **Build command:** `npm install && npm --workspace client run build`
   - **Start command:** `npm --workspace server run start`
   - **Instance type:** Free
4. Add environment variables (at minimum `MONGODB_URI` from Atlas — see above; in-memory Mongo works but resets on every deploy/restart and free instances restart often).
5. Deploy. Your app is live at `https://<name>.onrender.com`.

> Free Render instances sleep after ~15 min idle; the first request after that takes ~30s. Fine for a demo — mention it or click the URL before presenting.

### Option B — Railway

1. Sign up at [railway.app](https://railway.app) (GitHub login; trial credit — may ask for a card later).
2. **New Project → Deploy from GitHub repo**.
3. Set the same build/start commands and env vars as Render. Railway can also provision a MongoDB service in-project — use its connection string as `MONGODB_URI`.

### Option C — Fly.io (uses the included Dockerfile)

```bash
brew install flyctl        # or curl -L https://fly.io/install.sh | sh
fly auth signup
fly launch                 # detects the Dockerfile; pick a region, skip DB
fly secrets set MONGODB_URI="mongodb+srv://..."
fly deploy
```

### Option D — Any Docker host / VPS

```bash
docker build -t fanforge .
docker run -d -p 4000:4000 -e MONGODB_URI="mongodb+srv://..." fanforge
```

### Why not Vercel/Netlify for the whole app?

This is a long-running Express monolith; Vercel's serverless model would require restructuring the API. If you specifically want Vercel: deploy `client/` there as a static site and host the server on Render/Fly, setting `CLIENT_ORIGIN` to the Vercel URL — but the single-service options above are simpler.

---

## 4. Production configuration checklist

| Env var | Set it to | Why |
|---|---|---|
| `MONGODB_URI` | your Atlas string | otherwise data resets on every restart |
| `INGEST_INTERVAL_MS` | `600000` (10 min) | background re-ingest keeps the feed fresh |
| `PORT` | *(platform-provided)* | Render/Railway/Fly inject it automatically |
| `CLIENT_ORIGIN` | your public URL | CORS, only needed if client is hosted separately |
| `GEMINI_API_KEY`, `SNOWFLAKE_*`, `ELEVENLABS_*`, `SOLANA_MINT_SECRET` | your keys | the four prize-category integrations |

## 5. Demo-day checklist

- [ ] `npm run smoke` passes locally
- [ ] Deployed URL loads the landing page; `/app` shows a populated feed
- [ ] "Under the hood" panel shows the integrations you intend to demo as **Live**
- [ ] Hit the deployed URL once ~5 minutes before presenting (free tiers sleep)
- [ ] Search "comeback", cast a tournament vote, log a personal entry — the three money shots
