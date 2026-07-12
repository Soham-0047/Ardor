---
title: 'FanForge: a passion-scoring engine that watches what people love'
published: false
tags: devchallenge, weekendchallenge, ai, webdev
# cover_image: <add a wide screenshot of the landing page hero — dark theme reads best>
---

*This is a submission for the [DEV Weekend Challenge: Passion Edition](https://dev.to/challenges/weekend-2026-07-09).*

## What I Built

**FanForge** treats passion as a first-class signal. It watches live events — starting with the 2026 FIFA World Cup — and scores how much *passion* is in each moment (0–100), makes every scored moment instantly searchable, and rewards the most engaged fans with tournament-linked "Passion Points".

But it's a **plugin framework, not a single-sport app**. The exact engine that grades a stoppage-time winner also scores the Vim-vs-Emacs flame war and a solo dev's 1am debugging breakthrough. Any fandom is one plugin away — the theme's "any angle is fair game" invitation, taken literally.

**One-line pitch:** *A passion-scoring engine that watches what people love, makes it searchable, tells the story out loud, and remembers it forever.*

## Demo

- 🔗 **Live demo:** *[add link]*
- 📦 **Source:** *[add repo link]*
- 🎬 **Video walkthrough:** *[add link]*

*[Screenshot: landing page hero with live scored moments]*
*[Screenshot: dashboard live feed with passion gauges — dark theme]*
*[Screenshot: instant search for "comeback" — light theme]*
*[Screenshot: Hype-Off bracket with vote bars and an earned badge]*

Run it yourself in two commands — **zero API keys, zero database installs**:

```bash
npm install
npm run dev   # → http://localhost:5173
```

## How It Works

```
Match data & user actions
        → Plugin router        (worldcup · rivalry · personal)
        → Passion scoring      (admin-service AI structured extraction → heuristic fallback)
        → MongoDB              (store + instant passion-ranked search + passion warehouse)
        → ElevenLabs           (spoken hype clips, cached)
        → Solana devnet        (proof-of-fandom badges)
        → Dashboard            (feed · search · trends · arena · tracker)
```

1. **Ingest.** Each plugin's `fetchEvents()` pulls its source: the World Cup plugin hits football-data.org (with a 60-event seeded dataset as the reliable fallback — there are no live matches on the final challenge days), while rivalry and personal plugins take user submissions.
2. **Score.** admin-service hands FanForge the healthiest free LLM, which returns a **schema-constrained JSON object** — `passion_score`, `sentiment`, `key_moment`, `one_line_recap`. Not a chat reply: a structured extraction that turns unstructured fan noise into a comparable, queryable signal, with automatic cross-provider failover. No service token? A deterministic heuristic scorer keeps the pipeline flowing.
3. **Fan out.** Every scored moment is stored in MongoDB (which also powers the warehouse-scale passion analytics via aggregation), optionally narrated by ElevenLabs (cached to disk), and can trigger a Solana devnet badge mint (simulated when no keypair is configured).
4. **Surface.** A React dashboard with a self-refreshing scored feed, instant search, passion-over-time analytics, a fan-vs-fan **Hype-Off bracket** (votes earn Passion Points; streaks mint badges), and an off-season **personal passion tracker** — post a journal entry and watch the engine score it live.

### The plugin contract

```ts
interface FanPlugin {
  id: string;
  domain: Domain;
  voicePersona: string;      // narration style hint
  scoringPrompt: string;     // what "passion" means in this domain
  fetchEvents(): Promise<RawEvent[]>;
  normalizeUserAction?(input): RawEvent;
}
```

Register it and your domain is scored, stored, searchable, and surfaced — no core changes. Three ship in the box.

### Tech

**MERN** — MongoDB (Mongoose; auto-falls back to an in-memory `mongod` so nothing needs installing), Express, React (Vite + TS + Tailwind, full dark/light theming), Node.

**Tech, honestly wired:** an **AI router (admin-service)** does the structured passion extraction — it hands FanForge the healthiest free LLM at request time and fails over across providers, so no per-provider key lives in the repo; **MongoDB aggregation** is the passion warehouse (`/api/warehouse` answers fandom analytics at warehouse scale); **ElevenLabs** speaks the biggest moments as cached hype clips; and **Solana** mints verifiable proof-of-fandom badges on devnet — genuinely load-bearing, each with a graceful offline fallback so a rate limit can't break the demo. The dashboard even has an "Under the hood" panel showing which integrations are live vs. running on fallback.

Every check runs in CI: typecheck, client build, and a 15-assertion smoke test that exercises ingest → score → dedupe → search → aggregate → badge → vote-uniqueness against an in-memory MongoDB.

## My Passion Journey

The World Cup was running through the challenge weekend — millions of short bursts of real emotion, every few minutes, in every match. Most apps treat that as noise around the score. I wanted to build the thing that treats the *emotion itself* as the data.

The design bet that shaped everything: **the demo must survive with zero keys**. Every integration got a deterministic fallback (heuristic scorer, Mongo text search, seeded dataset, simulated badges), which is why the whole loop — including the parts I built at 1am — still runs end to end on a plane. Fittingly, logging that 1am breakthrough into FanForge's own personal tracker scored an 88. Ecstatic. ✅
