import { Router } from 'express';
import { z } from 'zod';
import { EventModel, toScoredEvent } from '../models';
import type { Domain } from '../types';
import { asyncHandler } from '../lib/asyncHandler';
import { getPlugin } from '../plugins/registry';
import { ingestAll, ingestOne, scoreAndStore } from '../services/ingestion';
import { searchMoments } from '../services/search';
import { warehouseInsights } from '../services/warehouse';
import { getOrCreateClip } from '../services/audio';

const router = Router();

const DOMAINS = ['worldcup', 'rivalry', 'personal'] as const;

/** GET /api/events — the live scored feed, with filters. */
router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        domain: z.enum(DOMAINS).optional(),
        type: z.string().optional(),
        matchId: z.string().optional(),
        minScore: z.coerce.number().min(0).max(100).optional(),
        keyMoment: z.enum(['true', 'false']).optional(),
        sort: z.enum(['recent', 'score']).default('recent'),
        limit: z.coerce.number().min(1).max(200).default(50),
      })
      .parse(req.query);

    const filter: Record<string, unknown> = {};
    if (q.domain) filter.domain = q.domain;
    if (q.type) filter.type = q.type;
    if (q.matchId) filter.matchId = q.matchId;
    if (q.minScore !== undefined) filter['score.passion_score'] = { $gte: q.minScore };
    if (q.keyMoment) filter['score.key_moment'] = q.keyMoment === 'true';

    const sort: Record<string, 1 | -1> =
      q.sort === 'score' ? { 'score.passion_score': -1 } : { occurredAt: -1 };

    const docs = await EventModel.find(filter).sort(sort).limit(q.limit);
    res.json({ events: docs.map(toScoredEvent), count: docs.length });
  }),
);

/** GET /api/search — instant passion-ranked search over scored moments. */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        q: z.string().default(''),
        domain: z.enum(DOMAINS).optional(),
        limit: z.coerce.number().min(1).max(50).default(20),
      })
      .parse(req.query);
    const results = await searchMoments(q.q, { domain: q.domain as Domain | undefined, limit: q.limit });
    res.json({ results, count: results.length, query: q.q });
  }),
);

/** GET /api/warehouse — warehouse-scale fandom analytics (MongoDB aggregation). */
router.get(
  '/warehouse',
  asyncHandler(async (_req, res) => {
    const insights = await warehouseInsights();
    res.json(insights);
  }),
);

/** GET /api/trends — live aggregate analytics for the dashboard. */
router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const domainFilter = z.enum(DOMAINS).optional().parse(req.query.domain);
    const match = domainFilter ? { domain: domainFilter } : {};

    const [totals, byDomain, timeline, topTeams, sentimentDist, topMoments] = await Promise.all([
      EventModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgScore: { $avg: '$score.passion_score' },
            keyMoments: { $sum: { $cond: ['$score.key_moment', 1, 0] } },
          },
        },
      ]),
      EventModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 },
            avgScore: { $avg: '$score.passion_score' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      EventModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$occurredAt' } },
            avgScore: { $avg: '$score.passion_score' },
            maxScore: { $max: '$score.passion_score' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      EventModel.aggregate([
        { $match: match },
        { $unwind: '$teams' },
        {
          $group: {
            _id: '$teams',
            count: { $sum: 1 },
            avgScore: { $avg: '$score.passion_score' },
            totalPassion: { $sum: '$score.passion_score' },
          },
        },
        { $sort: { totalPassion: -1 } },
        { $limit: 8 },
      ]),
      EventModel.aggregate([
        { $match: match },
        { $group: { _id: '$score.sentiment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      EventModel.find(match).sort({ 'score.passion_score': -1 }).limit(5),
    ]);

    res.json({
      totals: totals[0] ?? { count: 0, avgScore: 0, keyMoments: 0 },
      byDomain: byDomain.map((d) => ({ domain: d._id, count: d.count, avgScore: d.avgScore })),
      timeline: timeline.map((t) => ({
        bucket: t._id,
        avgScore: Math.round(t.avgScore),
        maxScore: t.maxScore,
        count: t.count,
      })),
      topTeams: topTeams.map((t) => ({
        team: t._id,
        count: t.count,
        avgScore: Math.round(t.avgScore),
        totalPassion: t.totalPassion,
      })),
      sentiment: sentimentDist.map((s) => ({ sentiment: s._id, count: s.count })),
      topMoments: topMoments.map(toScoredEvent),
    });
  }),
);

/** POST /api/ingest — trigger the pipeline for one plugin or all. */
router.post(
  '/ingest',
  asyncHandler(async (req, res) => {
    const body = z.object({ pluginId: z.string().optional() }).parse(req.body ?? {});
    if (body.pluginId) {
      const report = await ingestOne(body.pluginId);
      res.json({ reports: [report] });
    } else {
      const reports = await ingestAll();
      res.json({ reports });
    }
  }),
);

/** POST /api/plugins/:id/actions — submit a user action (journal, rivalry). */
router.post(
  '/plugins/:id/actions',
  asyncHandler(async (req, res) => {
    const plugin = getPlugin(req.params.id);
    if (!plugin) return res.status(404).json({ error: `unknown plugin: ${req.params.id}` });
    if (!plugin.normalizeUserAction) {
      return res.status(400).json({ error: `plugin ${plugin.id} does not accept user actions` });
    }
    const raw = plugin.normalizeUserAction((req.body ?? {}) as Record<string, unknown>);
    const { event } = await scoreAndStore(raw, plugin);
    res.status(201).json({ event });
  }),
);

/** GET /api/events/:id — single scored event. */
router.get(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const doc = await EventModel.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({ event: toScoredEvent(doc) });
  }),
);

/** POST /api/events/:id/narrate — ElevenLabs hype clip (flagged, cached). */
router.post(
  '/events/:id/narrate',
  asyncHandler(async (req, res) => {
    const doc = await EventModel.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const event = toScoredEvent(doc);
    const plugin = getPlugin(event.pluginId);
    const audioUrl = await getOrCreateClip(event, plugin);
    if (audioUrl) {
      doc.set('audioUrl', audioUrl);
      await doc.save();
    }
    res.json({ audioUrl, enabled: audioUrl !== null });
  }),
);

export default router;
