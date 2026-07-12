# 🔥 FanForge

### An open, pluggable **passion-intelligence** platform — MERN edition

> *A passion-scoring engine that watches what people love, makes it searchable, tells the story out loud, and remembers it forever.*

FanForge measures, narrates, and rewards fandom in real time. It watches live events — starting with the **2026 FIFA World Cup** — scores how much *passion* is in each moment, makes every scored moment instantly searchable, turns the biggest moments into spoken hype clips, and hands out verifiable "Passion Points" badges to the most engaged fans.

It's built as a **plugin framework**, not a single-sport app. The same engine scores a World Cup match, a two-sided rivalry (Vim vs Emacs, React vs Vue, the GOAT debate), or a solo dev's personal passion-project streak.

---

## ⚙️ Stack — MERN + sponsor tech

Built on the **MERN** stack, as requested (this pivots the original spec's Next.js + Neon Postgres design):

| Layer | Tech |
|---|---|
| **M**ongoDB | Primary store — events, scores, users, votes, tournament (Mongoose). Auto-falls back to an in-memory `mongod` if no server is reachable. |
| **E**xpress | REST API: feed, search, trends, ingestion, plugins, tournament, badges. |
| **R**eact | Vite + TypeScript + Tailwind dashboard (live feed, instant search, trends, hype-off arena, personal tracker). |
| **N**ode | Runtime for the whole server + ingestion pipeline. |

Plus the passion-intelligence integrations, **each with an offline fallback so nothing is load-bearing on a missing key**:

| Integration | Role | Fallback when no key |
|---|---|---|
| **AI router (admin-service)** | Structured passion scoring (schema-constrained JSON extraction) via the healthiest free LLM, with cross-provider failover | Deterministic heuristic scorer |
| **MongoDB aggregation** | Passion warehouse — `/api/warehouse` answers fandom analytics (passion by hour/domain/team/sentiment) at warehouse scale | — (always available) |
| **ElevenLabs** | Spoken hype narration of top moments (cached to disk, never regenerated) | Disabled, UI adapts |
| **Solana devnet** | "Passion Points" badge minting (0-decimal SPL tokens, Explorer-verifiable) | Simulated badge (clearly labelled) |
| **football-data.org** | Live World Cup feed | Seeded 60-event dataset |

> **The whole app runs end-to-end with zero API keys and zero local MongoDB.** That's a deliberate design choice: the demo can't be broken by a rate limit, a missing credential, or the July 12–13 live-match gap.

---

## 🚀 Quickstart

**Requirements:** Node ≥ 20. (No MongoDB install needed — an in-memory one starts automatically.)

```bash
# 1. Install everything (npm workspaces installs server + client)
npm install

# 2. (optional) configure integrations — all optional
cp .env.example server/.env    # then fill in any keys you have

# 3. Run both server (:4000) and client (:5173)
npm run dev
```

Open **http://localhost:5173** — you land on the marketing page; the product lives at **/app**. On first boot the server auto-ingests and scores the seeded dataset (66 moments across 7 World Cup matches + rivalry + personal samples), so the dashboard is populated immediately.

> 📦 **Setting up API keys or deploying?** See [DEPLOYMENT.md](DEPLOYMENT.md) — where to sign up for each (free) service, what to copy where, and step-by-step deploys to Render / Railway / Fly / Docker.

**Routes:** `/` landing page · `/app` live feed · `/app/explore` instant search · `/app/tournament` hype-off arena · `/app/personal` passion tracker.

**Theming:** full dark/light support. The toggle (☀️/🌙) lives in every header; the choice persists in `localStorage` and defaults to your system preference. All colors — including the continuous passion-score scale — are CSS variables, so both themes stay in sync automatically.

Other scripts:

```bash
npm run dev:server   # API only  (http://localhost:4000)
npm run dev:client   # dashboard only
npm run typecheck    # typecheck server + client
npm run build        # typecheck server + build client
npm run seed         # reseed the database from all plugins
npm run smoke        # 15-assertion end-to-end pipeline test (in-memory Mongo)
```

CI (GitHub Actions) runs typecheck + client build + the smoke test on every push — no secrets or services needed.

**Docker** (single container, API + built client on :4000):

```bash
docker build -t fanforge .
docker run -p 4000:4000 fanforge                              # in-memory Mongo
docker run -p 4000:4000 -e MONGODB_URI=mongodb://host/db fanforge  # real Mongo
```

---

## 🧠 How it works — the loop

```
Match data & user actions
          │
          ▼
   ┌──────────────────────────┐
   │        FanForge core      │
   │   Plugin router           │   worldcup · rivalry · personal
   │        │                  │
   │        ▼                  │
   │   Passion scoring         │   Gemini structured extraction
   │   (Gemini → heuristic)    │   → { passion_score, sentiment,
   └────────┼──────────────────┘        key_moment, one_line_recap }
            │
   ┌────────┼───────────────┬──────────────┬───────────────┐
   ▼        ▼               ▼              ▼                ▼
 MongoDB   MongoDB agg   ElevenLabs      Solana         React
 (store)   (warehouse)   (narration)     (badges)       dashboard
```

1. **Ingest** — a plugin's `fetchEvents()` pulls events (World Cup feed or seed; sample rivalry/personal events; or user submissions).
2. **Route** — the plugin router tags each event with its domain and normalizes it to a common schema.
3. **Score** — the AI (routed via admin-service to the healthiest free LLM) returns a **structured JSON object** (`passion_score`, `sentiment`, `key_moment`, `one_line_recap`) — a schema-constrained extraction, not a chat reply. No service token → deterministic heuristic scorer.
4. **Fan out** — every scored event is written to **MongoDB** (which also powers the warehouse analytics), optionally narrated by **ElevenLabs**, and can trigger a **Solana** badge.
5. **Surface** — the dashboard shows the live scored feed, instant search, warehouse-backed trend analytics, the hype-off tournament, and the personal passion tracker.

---

## ✨ Features

- **Live passion feed** — real-time scored moments with recap text, sentiment, and a radial passion gauge; filter by domain, sort by recency or passion, key-moments-only toggle.
- **Instant fan search** — passion-ranked full-text search across every scored moment and recap.
- **Trend analytics** — passion-over-time, sentiment distribution, and top teams — served by MongoDB aggregation at warehouse scale.
- **Hype-Off tournament** — fan-vs-fan bracket voting; votes earn **Passion Points** (tournament-linked, streak-gated) and mint badges at engagement thresholds.
- **Personal passion tracker** — an "off-season" mode: journal your own project streak and watch the engine score each entry live.
- **Rivalry arena** — score the heat of any two-sided rivalry you submit.
- **Pluggable domains** — add a domain by implementing one interface (`FanPlugin`).
- **Hype narration** — cached ElevenLabs clips per top moment.
- **Proof-of-Fandom badges** — Solana devnet SPL tokens, verifiable on Explorer (simulated when no mint key is configured).
- **Landing page + dark/light themes** — a marketing front door at `/` with live stats from the engine, and a persisted theme toggle across the whole app.

---

## 🔌 The plugin contract

FanForge is a platform because a domain is just an object implementing [`FanPlugin`](server/src/plugins/types.ts):

```ts
interface FanPlugin {
  id: string;
  domain: 'worldcup' | 'rivalry' | 'personal';
  displayName: string;
  description: string;
  emoji: string;
  voicePersona: string;      // hint for ElevenLabs
  scoringPrompt: string;     // domain-specific guidance for the scorer
  fetchEvents(): Promise<RawEvent[]>;
  normalizeUserAction?(input): RawEvent;   // for user-driven domains
}
```

Register it in [`server/src/plugins/registry.ts`](server/src/plugins/registry.ts) and it's automatically scored, stored, searchable, and surfaced. Three ship in the box: **World Cup**, **Rivalry**, **Personal Passion**.

---

## 📡 API reference

Base URL: `http://localhost:4000/api`

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/config` | Feature flags + registered plugins |
| GET | `/plugins` | Plugin list |
| GET | `/events` | Scored feed. Query: `domain`, `type`, `matchId`, `minScore`, `keyMoment`, `sort=recent\|score`, `limit` |
| GET | `/events/:id` | Single scored event |
| GET | `/search` | Instant search. Query: `q`, `domain`, `limit` |
| GET | `/warehouse` | Warehouse-scale fandom analytics via MongoDB aggregation (`engine: "mongodb"`) |
| GET | `/trends` | Aggregate analytics (totals, byDomain, timeline, topTeams, sentiment, topMoments) |
| POST | `/ingest` | Run the pipeline. Body: `{ pluginId? }` (omit for all) |
| POST | `/plugins/:id/actions` | Submit a user action (journal / rivalry) → scored |
| POST | `/events/:id/narrate` | Generate/fetch ElevenLabs clip (flagged) |
| POST | `/users` | Create/fetch a fan |
| GET | `/leaderboard` | Most passionate fans |
| GET | `/tournament` | Current hype-off bracket |
| POST | `/tournament/vote` | Cast a vote. Body: `{ userId, matchupId, choice }` |
| POST | `/badges/mint` | Mint a Passion Points badge |

---

## 🗂️ Project structure

```
fanforge/
├── server/                      # Express + Node + MongoDB
│   └── src/
│       ├── index.ts             # bootstrap (auto-ingest on empty DB)
│       ├── config/              # env + feature flags, DB (memory-server fallback), paths
│       ├── types.ts             # shared domain contracts
│       ├── models/              # Mongoose: Event, User, Vote, Tournament
│       ├── plugins/             # FanPlugin interface + worldcup / rivalry / personal + registry
│       ├── services/            # scoring (admin-service AI + heuristic), search (mongo full-text),
│       │                        #   warehouse (mongo aggregation), audio (elevenlabs), badge (solana)
│       ├── lib/                 # heuristic scorer, logger, async handler
│       ├── data/                # seeded World Cup dataset (60 events)
│       └── routes/              # meta, events, social
└── client/                      # React + Vite + TypeScript + Tailwind
    └── src/
        ├── lib/                 # api client, types, formatting, store, theme, useAsync
        ├── components/          # EventCard, ScoreGauge, PassionFeed, TrendsPanel, ThemeToggle, …
        └── pages/               # Landing, Dashboard, Explore, Tournament, Personal
```

---

## 🔐 Cost & free-tier

Every service is free-tier and card-free, and the app is fully functional with **none** of them configured. See [`.env.example`](.env.example) for the full list of optional keys.

---

## ⚠️ Notes

- **Core tech**: **AI structured scoring** via admin-service (healthiest free LLM, cross-provider failover), a **MongoDB-aggregation passion warehouse**, **ElevenLabs** hype narration, and **Solana** proof-of-fandom badges — each genuinely load-bearing, each with a graceful fallback.
- Every integration lights up automatically when its credentials exist; no flag flipping needed (set `FEATURE_*=false` to force one off).
- football-data.org's free tier is delayed, not real-time — the seeded dataset is the reliable demo path.

## 🛣️ Roadmap

- Real-time match feeds; more plugins (esports, GitHub-repo rivalries, music fandoms).
- Metaplex NFT badges; a public API for third-party passion domains.
- Open-source the plugin framework for community-built domains.

## 🔗 Links

- DEV submission post: draft in [SUBMISSION.md](SUBMISSION.md) — *[add published link, tagged #weekendchallenge]*
- Demo / repository: *[add links before submitting]*
