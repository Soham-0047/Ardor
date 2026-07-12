import { env } from '../config/env';
import { createLogger } from '../lib/logger';

const log = createLogger('admin');

/**
 * Zero-dependency client for the admin-service central vault + smart router
 * (see /admin.md). Instead of hardcoding a single Gemini key, we ask
 * admin-service for the healthiest free LLM right now and call it directly.
 * admin-service ranks candidates healthiest-first and we fail over across them,
 * reporting each outcome so the router's health view stays accurate.
 *
 * Only used when ADMIN_URL + SERVICE_TOKEN are set; callers wrap this and fall
 * back to the deterministic heuristic on any failure.
 */

/** One ranked (provider, model) candidate from /public/providers/route-models. */
export interface ModelCandidate {
  id: string;
  providerId: string;
  model: string;
  baseURL?: string;
  values: { apiKey?: string; baseURL?: string; model?: string; [k: string]: unknown };
  score?: number;
}

interface RouteModelsResponse {
  primary?: ModelCandidate;
  candidates?: ModelCandidate[];
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.serviceToken}`, 'Content-Type': 'application/json' };
}

/** Fetch ranked LLM candidates, healthiest & free-tier first. */
async function routeModels(limit = 5): Promise<ModelCandidate[]> {
  const url = `${env.adminUrl.replace(/\/$/, '')}/public/providers/route-models?kind=llm&freeOnly=1&limit=${limit}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`route-models ${res.status}`);
  const json = (await res.json()) as RouteModelsResponse;
  const list = json.candidates?.length ? json.candidates : json.primary ? [json.primary] : [];
  if (!list.length) throw new Error('no LLM candidates available');
  return list;
}

/** Fire-and-forget outcome report so the router learns which keys are healthy. */
function reportResult(id: string, ok: boolean, latencyMs: number, model: string, reason?: string): void {
  const url = `${env.adminUrl.replace(/\/$/, '')}/public/providers/${id}/report`;
  fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ok, latencyMs, model, reason }) }).catch(
    () => {},
  );
}

/** One generic OpenAI-compatible chat call — works for almost every provider. */
async function callChat(c: ModelCandidate, prompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = c.values.apiKey;
  const baseURL = (c.values.baseURL || c.baseURL || '').replace(/\/$/, '');
  if (!baseURL) throw new Error(`${c.providerId} missing baseURL`);

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: c.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`${c.providerId} ${c.model} → ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

export interface GenerateResult {
  text: string;
  /** "<providerId>:<model>" of whichever candidate succeeded. */
  model: string;
}

/**
 * Ask admin-service for the best free LLM and run `prompt` through it, failing
 * over across ranked candidates. Each attempt gets a solo timeout; the overall
 * budget is bounded so a hung provider can't stall the pipeline.
 */
export async function generate(prompt: string, opts: { perTryMs?: number; totalMs?: number } = {}): Promise<GenerateResult> {
  const perTryMs = opts.perTryMs ?? 10_000;
  const totalMs = opts.totalMs ?? 25_000;
  const deadline = Date.now() + totalMs;

  const candidates = await routeModels();
  let lastErr: unknown;

  for (const c of candidates) {
    if (Date.now() >= deadline) break;
    const controller = new AbortController();
    const budget = Math.min(perTryMs, deadline - Date.now());
    const timer = setTimeout(() => controller.abort(), budget);
    const started = Date.now();
    try {
      const text = await callChat(c, prompt, controller.signal);
      const latency = Date.now() - started;
      reportResult(c.id, true, latency, c.model);
      log.debug(`generated via ${c.providerId}:${c.model} (${latency}ms)`);
      return { text, model: `${c.providerId}:${c.model}` };
    } catch (err) {
      lastErr = err;
      const reason = (err as Error).message;
      reportResult(c.id, false, Date.now() - started, c.model, reason);
      log.warn(`candidate ${c.providerId}:${c.model} failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`all LLM candidates failed: ${(lastErr as Error)?.message ?? 'unknown'}`);
}

/** Wake the Render dyno (free tier sleeps) so the first real call isn't cold. */
export function warmup(): void {
  fetch(`${env.adminUrl.replace(/\/$/, '')}/warmup`).catch(() => {});
}
