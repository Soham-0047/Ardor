import { EventModel } from '../models';

/**
 * Passion warehouse — warehouse-scale fandom analytics over every scored
 * moment: passion by hour, by domain, by team, by sentiment.
 *
 * Backed by MongoDB aggregations (free, no external warehouse required).
 * Scored moments already live in Mongo via the ingestion pipeline, so the
 * analytics query the store directly — nothing to sync out.
 */

export interface WarehouseInsights {
  engine: 'mongodb';
  hourlyPulse: { hour: string; avgScore: number; peakScore: number; moments: number }[];
  passionByDomain: { domain: string; moments: number; avgScore: number; keyMoments: number }[];
  hottestTeams: { team: string; totalPassion: number; avgScore: number; moments: number }[];
  sentimentBreakdown: { sentiment: string; moments: number; avgScore: number }[];
}

/** Warehouse-scale fandom analytics via MongoDB aggregation. */
export async function warehouseInsights(): Promise<WarehouseInsights> {
  const [hourly, byDomain, teams, sentiment] = await Promise.all([
    EventModel.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$occurredAt' } },
          avgScore: { $avg: '$score.passion_score' },
          peakScore: { $max: '$score.passion_score' },
          moments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    EventModel.aggregate([
      {
        $group: {
          _id: '$domain',
          moments: { $sum: 1 },
          avgScore: { $avg: '$score.passion_score' },
          keyMoments: { $sum: { $cond: ['$score.key_moment', 1, 0] } },
        },
      },
      { $sort: { moments: -1 } },
    ]),
    EventModel.aggregate([
      { $unwind: '$teams' },
      {
        $group: {
          _id: '$teams',
          totalPassion: { $sum: '$score.passion_score' },
          avgScore: { $avg: '$score.passion_score' },
          moments: { $sum: 1 },
        },
      },
      { $sort: { totalPassion: -1 } },
      { $limit: 8 },
    ]),
    EventModel.aggregate([
      {
        $group: {
          _id: '$score.sentiment',
          moments: { $sum: 1 },
          avgScore: { $avg: '$score.passion_score' },
        },
      },
      { $sort: { moments: -1 } },
    ]),
  ]);

  return {
    engine: 'mongodb',
    hourlyPulse: hourly.map((r) => ({
      hour: r._id,
      avgScore: Math.round(r.avgScore),
      peakScore: r.peakScore,
      moments: r.moments,
    })),
    passionByDomain: byDomain.map((r) => ({
      domain: r._id,
      moments: r.moments,
      avgScore: Math.round(r.avgScore),
      keyMoments: r.keyMoments,
    })),
    hottestTeams: teams.map((r) => ({
      team: r._id,
      totalPassion: r.totalPassion,
      avgScore: Math.round(r.avgScore),
      moments: r.moments,
    })),
    sentimentBreakdown: sentiment.map((r) => ({
      sentiment: r._id,
      moments: r.moments,
      avgScore: Math.round(r.avgScore),
    })),
  };
}
