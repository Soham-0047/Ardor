# Integrating admin-service into your projects

A guide for calling AI generation through **admin-service** instead of hardcoding a
Gemini (or any single provider) key in each project.

- **Backend (API):** `https://admin-w1i8.onrender.com`
- **Admin dashboard:** `https://notonadmin.vercel.app/`

---

## 1. What this actually is (and why you'd use it)

admin-service is **not** an AI proxy. It does **not** run the model for you.

It is a **central vault + smart router** for every API you use. Your project asks
it *"give me a working, healthy, free LLM right now"*, and it hands back a
**decrypted API key + base URL + model name**, ranked healthiest-first from a
background health sweep. Your project then makes the actual model call directly.

### The problem it solves

**Before** — every project hardcodes one Gemini key:

```ts
// scattered across 5 different repos 😩
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const result = await model.generateContent(prompt);
```

Problems: one key = one quota. Key rotates → redeploy every repo. Gemini rate-limits
you (`429`) → the request just fails. You want to add Groq/OpenRouter → code change
in every repo.

**After** — every project asks admin-service for the best model, with automatic
failover across providers and keys:

```ts
const text = await admin.withModelFailover("llm", async (candidate, signal) => {
  return callOpenAICompatible(candidate, prompt, signal); // one generic caller
});
```

Now: keys live in **one** dashboard. Add/rotate keys with zero redeploys. Gemini
down or rate-limited → it automatically falls over to Groq → OpenRouter → Cerebras →
… Free-tier quota is spread across all your keys and models.

### What it centralizes

| Feature | Endpoint prefix | Use for |
|---|---|---|
| **Provider routing (LLM keys + models)** | `/public/providers` | AI generation — the main event |
| **Raw API credentials** | `/public/credentials` | Non-LLM keys (Unsplash, Resend, Exa, …) |
| **Prompts** | `/public/prompts` | Versioned system/user prompts, edited in the UI |
| **Feature flags** | `/public/flags` | Toggle features per user/plan without deploys |
| **Site config** | `/public/config` | Arbitrary JSON config blob |

---

## 2. Authentication

Every `/public/*` route is gated by a **service token** sent as a Bearer header:

```
Authorization: Bearer <SERVICE_TOKEN>
```

- The `SERVICE_TOKEN` value comes from the admin-service backend environment
  (owned by whoever runs the dashboard). Ask for it — it is a shared secret, not
  your personal login.
- The `ADMIN_EMAILS` / `ADMIN_PASSWORD` login you see in the dashboard is **only**
  for humans using the UI. Your code never uses those — it uses the service token.

> A wrong/missing token returns `401 { "error": "Invalid service token" }`.

---

## 3. Quick start (recommended — use the SDK)

There's a zero-dependency, pure-`fetch` TypeScript client at
[sdk/admin-client.ts](sdk/admin-client.ts). Copy that one file into your project
(Node 18+). It gives you caching, retries, and automatic failover.

### Install

```bash
# just copy the file — it has no dependencies
cp path/to/admin-service/sdk/admin-client.ts ./src/lib/admin-client.ts
```

### Configure

Add to your project's `.env`:

```bash
ADMIN_URL=https://admin-w1i8.onrender.com
SERVICE_TOKEN=<the shared service token>
```

### Create the client once

```ts
// src/lib/admin.ts
import { createAdminClient } from "./admin-client";

export const admin = createAdminClient({
  baseURL: process.env.ADMIN_URL!,
  serviceToken: process.env.SERVICE_TOKEN!,
  ttlMs: 60_000, // cache prompts/flags/routes for 60s (default)
});
```

---

## 4. AI generation — the main use case

This is the replacement for "directly using Gemini". There are two levels.

### 4a. Simplest: get the best model, call it, done

`withModelFailover("llm", attempt)` does everything for you:

1. Fetches ranked `(provider, model)` candidates (healthiest & free-tier first).
2. Rotates the top pick across comparable models so no single free quota drains.
3. Tries the best one (10s solo budget); on failure/timeout, **races the next few
   in parallel** — different keys first, since auth/429 failures usually kill a
   whole key, not one model. Overall budget 60s (both tunable via opts).
4. Reports success/failure back so the router learns: an auth failure cools the
   whole key, repeated 429s back the model (or key) off, and the next caller is
   routed around the problem automatically.

Because almost every provider in the registry is **OpenAI-compatible**
(`POST /chat/completions`), you can write **one** caller that works for Gemini via
OpenRouter, Groq, Cerebras, Together, DeepSeek, and dozens more:

```ts
import { admin } from "./lib/admin";
import type { ModelCandidate } from "./lib/admin-client";

// One generic caller for every OpenAI-compatible provider.
async function callChat(c: ModelCandidate, prompt: string, signal: AbortSignal) {
  const apiKey = c.values.apiKey as string | undefined;
  const baseURL = (c.values.baseURL as string) || c.baseURL!;

  const res = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: c.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`${c.providerId} ${c.model} → ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// Use it — this is your "generate text" function everywhere.
export async function generate(prompt: string): Promise<string> {
  return admin.withModelFailover("llm", (candidate, signal) =>
    callChat(candidate, prompt, signal),
  );
}
```

That's it. `generate("Write a haiku about the sea")` now runs on whatever free LLM
is healthiest at that moment, with cross-provider failover — no Gemini key in your
code at all.

> **Note on Google/Gemini's native API:** Gemini's own endpoint
> (`generativelanguage.googleapis.com`) is *not* OpenAI-shaped and uses `?key=`
> auth. If a candidate's `providerId === "google"` and you want to hit Gemini
> natively, branch on it (see §4c). But the easiest path is to configure Gemini via
> **OpenRouter** in the dashboard, which exposes it as OpenAI-compatible.

### 4b. Committed to one provider, want all your keys tried

If you specifically want Gemini and just want every Gmail-account key tried before
giving up (multi-account quota stacking):

```ts
const text = await admin.withProviderFailover("google", async (provider) => {
  const key = provider.values.apiKey as string;
  const model = (provider.values.model as string) || "gemini-2.5-flash";
  // ...call Gemini's native API with `key` + `model`, throw on failure
  return result;
});
```

### 4c. Manual — fetch candidates and decide yourself

```ts
const { primary, candidates } = await admin.routeModels("llm", {
  freeOnly: true,
  limit: 5,
});
// primary = { providerId, model, baseURL, values: { apiKey, ... }, score, ... }

// After your call, tell the dashboard how it went (optional but recommended):
admin.reportProviderResult(primary.id, true, latencyMs, undefined, primary.model);
```

---

## 5. Prompts (edit in the UI, no redeploy)

Store your system/user prompts in the dashboard, version them, and pull them at
runtime. Placeholders use `${var}` syntax.

```ts
// Fetch + fill in one call
const system = await admin.renderPrompt("agent.system.researcher", {
  topic: "quantum computing",
  tone: "concise",
});

// Or raw
const p = await admin.getPrompt("agent.system.researcher");
console.log(p.content, p.version, p.variables);

// All prompts with a tag
const agentPrompts = await admin.getAllPrompts("agent");
```

Combine with generation:

```ts
const system = await admin.renderPrompt("summarize.system", { maxWords: 100 });
const answer = await generate(`${system}\n\nArticle:\n${article}`);
```

---

## 6. Feature flags

Toggle features per user, plan, or percentage rollout — evaluated locally after one
fetch (zero latency per check).

```ts
if (await admin.isFlagEnabled("feature.new_chat_ui", { userId, plan: "pro" })) {
  // show new UI
}

// Or evaluate many at once, server-side:
const flags = await admin.evaluateFlagsRemote({ userId, plan, email });
// { "feature.new_chat_ui": true, "feature.beta_export": false }
```

Strategies supported: `on`, `off`, `percent` (hashed by userId), `allowlist`
(by userId/email), and `condition` (`$in` / `$eq` field matching).

---

## 7. Other API credentials (non-LLM)

For services that aren't LLMs — Unsplash, Pexels, Resend, Exa, Tavily,
ElevenLabs, etc. — pull the raw key:

```ts
// via SDK: providers of a kind (e.g. image, search, email, tts)
const [imageProvider] = await admin.getProvidersById("unsplash");
const accessKey = imageProvider.values.apiKey;

// or the credentials store directly (raw HTTP):
// GET /public/credentials?service=unsplash  → { services: { unsplash: [{ key, ... }] } }
```

---

## 8. Site config

An arbitrary JSON blob, keyed (default key = `"default"`):

```
GET /public/config?key=default   →  { ...your config object }
```

---

## 9. Raw HTTP (no SDK / non-JS languages)

Everything is plain REST. Example in Python:

```python
import requests

BASE = "https://admin-w1i8.onrender.com"
HEADERS = {"Authorization": f"Bearer {SERVICE_TOKEN}"}

# 1. Get the healthiest free LLM
r = requests.get(
    f"{BASE}/public/providers/route-models",
    params={"kind": "llm", "freeOnly": 1, "limit": 5},
    headers=HEADERS,
).json()
best = r["primary"]  # { providerId, model, baseURL, values: { apiKey } }

# 2. Call it (OpenAI-compatible)
base_url = best["values"].get("baseURL") or best["baseURL"]
api_key = best["values"].get("apiKey")
resp = requests.post(
    f"{base_url.rstrip('/')}/chat/completions",
    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    json={"model": best["model"], "messages": [{"role": "user", "content": "Hello!"}]},
).json()
print(resp["choices"][0]["message"]["content"])

# 3. (optional) report the outcome
requests.post(
    f"{BASE}/public/providers/{best['id']}/report",
    headers=HEADERS,
    json={"ok": True, "latencyMs": 800, "model": best["model"]},
)
```

---

## 10. Endpoint reference

All under `https://admin-w1i8.onrender.com`, all require `Authorization: Bearer <SERVICE_TOKEN>`
except `/health` and `/warmup`.

### Health (no auth)
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness `{ ok: true }` |
| GET | `/warmup` | DB-free wake for Render cold starts — hit on boot |

### Providers / AI routing
| Method | Path | Description |
|---|---|---|
| GET | `/public/providers/route-models?kind=llm&freeOnly=1&limit=5` | **Recommended.** Ranked `(provider, model)` candidates, healthiest-first. |
| GET | `/public/providers/models?kind=llm&freeOnly=1` | **Active-model inventory** — every discovered model per provider with live health (no secrets). |
| GET | `/public/providers/route?kind=llm` | Ordered provider fallback chain for a kind. |
| GET | `/public/providers/chain?providerId=google` | All keys for one provider (multi-account failover). |
| GET | `/public/providers?kind=llm` | All enabled providers of a kind, with decrypted values. |
| GET | `/public/providers?id=openai` | All instances of one provider. |
| POST | `/public/providers/:id/report` | Report call outcome `{ ok, latencyMs?, reason?, model? }`. Auth failures cool the whole key; clustered 429s are treated as account-wide. |
| POST | `/public/providers/sweep?providerId=&force=1` | Trigger a health sweep (for external cron). |

**How models are discovered:** each provider's live `/models` list (OpenAI-style,
Gemini, Anthropic, even a local Ollama's `/api/tags`) is fetched on a TTL, merged
with the curated registry + the freellm.net free-model feed, filtered to
chat-capable models, then **probe-verified** by a rotating daily sweep — so
`route-models` only ever ranks models that were actually seen working with *your*
keys. Adding a provider (or rotating a key) in the dashboard triggers an immediate
background sweep, so new providers become routable within seconds.

`kind` values: `llm`, `vision`, `audio`, `stt`, `tts`, `image`, `embedding`,
`parsing`, `search`, `music`, `video`, `storage`, `email`, `oauth`, `other`.

### Prompts
| Method | Path | Description |
|---|---|---|
| GET | `/public/prompts` | All prompts (active variant). `?tag=` to filter. |
| GET | `/public/prompts/:key` | One prompt by key. |

### Flags
| Method | Path | Description |
|---|---|---|
| GET | `/public/flags` | Raw flag definitions (evaluate locally). |
| POST | `/public/flags/evaluate` | `{ ctx }` → `{ flags: { key: boolean } }`. |

### Credentials & config
| Method | Path | Description |
|---|---|---|
| GET | `/public/credentials?service=unsplash` | Decrypted keys, grouped by service. |
| POST | `/public/credentials/:id/report` | Report key outcome `{ ok, reason? }`. |
| GET | `/public/config?key=default` | Site config JSON blob. |

---

## 11. Response shapes (the important ones)

**`GET /public/providers/route-models`**
```jsonc
{
  "primary": {
    "id": "665f...",              // provider instance id (use in /report)
    "providerId": "groq",         // registry slug
    "kind": "llm",
    "model": "llama-3.3-70b-versatile",
    "modelStatus": "healthy",
    "freeTier": true,
    "baseURL": "https://api.groq.com/openai/v1",
    "auth": "bearer",
    "score": 940,                 // higher = better
    "values": { "apiKey": "gsk_...", "model": "..." }  // DECRYPTED
  },
  "candidates": [ /* … ranked list … */ ],
  "total": 5,
  "fetchedAt": "2026-07-11T…Z"
}
```

**`GET /public/prompts/:key`**
```jsonc
{
  "key": "summarize.system",
  "version": 3,
  "content": "You are a summarizer. Limit to ${maxWords} words.",
  "variables": ["maxWords"],
  "tags": ["agent"],
  "updatedAt": "2026-07-01T…Z"
}
```

---

## 12. Operational notes

- **Cold starts:** the Render backend is a free dyno that sleeps. Hit `/warmup` on
  your app's boot to wake it before the first real request.
- **Caching:** the SDK caches for `ttlMs` (default 60s) with stale-while-revalidate,
  so you can call `getPrompt` / `routeModels` freely in hot paths.
- **Secrets:** decrypted keys are only ever returned over the service-token-gated
  `/public/*` routes. Keep `SERVICE_TOKEN` server-side — never ship it to a browser.
- **Always report outcomes** (`reportProviderResult`) — it's fire-and-forget and
  keeps the router's health view accurate, which makes failover smarter for everyone.
- **Adding a new provider/key/prompt:** do it in the dashboard at
  `https://notonadmin.vercel.app/`. No consumer redeploy needed — it appears on the
  next TTL refresh.
```
