import { env, flags } from '../config/env';
import type { ScoredEvent } from '../types';
import { EventModel } from '../models';
import { createLogger } from '../lib/logger';

const log = createLogger('warehouse');

/**
 * Snowflake passion warehouse (feature-flagged).
 *
 * Every scored moment fans out into a Snowflake table so the "history of
 * fandom" can be queried at warehouse scale — passion by hour, by team, by
 * sentiment, across every domain plugin. When credentials are absent the
 * same insight queries run as MongoDB aggregations, so the analytics
 * surface never goes dark; the /api/warehouse response says which engine
 * answered.
 *
 * snowflake-sdk is an optionalDependency loaded via dynamic import (the
 * specifier is cast to string so typecheck doesn't require the package).
 */

interface SnowflakeConnection {
  execute(opts: {
    sqlText: string;
    binds?: unknown[];
    complete: (err: Error | undefined, stmt: unknown, rows?: unknown[]) => void;
  }): void;
}

let connPromise: Promise<SnowflakeConnection> | null = null;
let tableReady = false;

async function getConnection(): Promise<SnowflakeConnection> {
  if (!connPromise) {
    connPromise = (async () => {
      const snowflake = ((await import('snowflake-sdk' as string)) as any).default ??
        (await import('snowflake-sdk' as string));
      snowflake.configure({ logLevel: 'ERROR' });
      const connection = snowflake.createConnection({
        account: env.snowflakeAccount,
        username: env.snowflakeUsername,
        password: env.snowflakePassword,
        database: env.snowflakeDatabase,
        schema: env.snowflakeSchema,
        warehouse: env.snowflakeWarehouse,
        clientSessionKeepAlive: true,
      });
      await new Promise<void>((resolve, reject) => {
        connection.connect((err: Error | undefined) =>
          err ? reject(err) : resolve(),
        );
      });
      log.info('connected to Snowflake');
      return connection as SnowflakeConnection;
    })();
    connPromise.catch(() => {
      connPromise = null; // allow a retry on the next call
    });
  }
  return connPromise;
}

function sql(conn: SnowflakeConnection, sqlText: string, binds: unknown[] = []): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve(rows ?? [])),
    });
  });
}

async function ensureTable(conn: SnowflakeConnection): Promise<void> {
  if (tableReady) return;
  await sql(
    conn,
    `CREATE TABLE IF NOT EXISTS ${env.snowflakeTable} (
       ID STRING PRIMARY KEY,
       DOMAIN STRING,
       TYPE STRING,
       TITLE STRING,
       TEAMS ARRAY,
       PLAYERS ARRAY,
       COMPETITION STRING,
       OCCURRED_AT TIMESTAMP_TZ,
       PASSION_SCORE NUMBER,
       SENTIMENT STRING,
       KEY_MOMENT BOOLEAN,
       RECAP STRING,
       SCORER STRING,
       LOADED_AT TIMESTAMP_TZ DEFAULT CURRENT_TIMESTAMP()
     )`,
  );
  tableReady = true;
}

/** Stream scored moments into the warehouse. No-op without Snowflake. */
export async function syncMoments(events: ScoredEvent[]): Promise<void> {
  if (!flags.snowflake || events.length === 0) return;
  try {
    const conn = await getConnection();
    await ensureTable(conn);
    for (const e of events) {
      await sql(
        conn,
        `MERGE INTO ${env.snowflakeTable} t
         USING (SELECT ? AS ID) s ON t.ID = s.ID
         WHEN NOT MATCHED THEN INSERT
           (ID, DOMAIN, TYPE, TITLE, TEAMS, PLAYERS, COMPETITION, OCCURRED_AT,
            PASSION_SCORE, SENTIMENT, KEY_MOMENT, RECAP, SCORER)
         VALUES (?, ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          e.id,
          e.domain,
          e.type,
          e.title,
          JSON.stringify(e.teams),
          JSON.stringify(e.players),
          e.competition ?? null,
          e.occurredAt,
          e.score.passion_score,
          e.score.sentiment,
          e.score.key_moment,
          e.score.one_line_recap,
          e.score.model,
        ],
      );
    }
    log.debug(`synced ${events.length} moments into Snowflake`);
  } catch (err) {
    log.warn('Snowflake sync failed (non-fatal)', (err as Error).message);
  }
}

export async function syncMoment(event: ScoredEvent): Promise<void> {
  return syncMoments([event]);
}

export interface WarehouseInsights {
  engine: 'snowflake' | 'mongodb';
  hourlyPulse: { hour: string; avgScore: number; peakScore: number; moments: number }[];
  passionByDomain: { domain: string; moments: number; avgScore: number; keyMoments: number }[];
  hottestTeams: { team: string; totalPassion: number; avgScore: number; moments: number }[];
  sentimentBreakdown: { sentiment: string; moments: number; avgScore: number }[];
}

async function snowflakeInsights(): Promise<WarehouseInsights> {
  const conn = await getConnection();
  await ensureTable(conn);
  const t = env.snowflakeTable;

  const [hourly, byDomain, teams, sentiment] = await Promise.all([
    sql(
      conn,
      `SELECT TO_CHAR(DATE_TRUNC('HOUR', OCCURRED_AT), 'YYYY-MM-DD"T"HH24:00') AS HOUR,
              ROUND(AVG(PASSION_SCORE)) AS AVG_SCORE,
              MAX(PASSION_SCORE) AS PEAK_SCORE,
              COUNT(*) AS MOMENTS
       FROM ${t} GROUP BY 1 ORDER BY 1`,
    ),
    sql(
      conn,
      `SELECT DOMAIN, COUNT(*) AS MOMENTS, ROUND(AVG(PASSION_SCORE)) AS AVG_SCORE,
              SUM(IFF(KEY_MOMENT, 1, 0)) AS KEY_MOMENTS
       FROM ${t} GROUP BY DOMAIN ORDER BY MOMENTS DESC`,
    ),
    sql(
      conn,
      `SELECT team.VALUE::STRING AS TEAM, SUM(PASSION_SCORE) AS TOTAL_PASSION,
              ROUND(AVG(PASSION_SCORE)) AS AVG_SCORE, COUNT(*) AS MOMENTS
       FROM ${t}, LATERAL FLATTEN(INPUT => TEAMS) team
       GROUP BY 1 ORDER BY TOTAL_PASSION DESC LIMIT 8`,
    ),
    sql(
      conn,
      `SELECT SENTIMENT, COUNT(*) AS MOMENTS, ROUND(AVG(PASSION_SCORE)) AS AVG_SCORE
       FROM ${t} GROUP BY SENTIMENT ORDER BY MOMENTS DESC`,
    ),
  ]);

  const num = (v: unknown) => Number(v ?? 0);
  return {
    engine: 'snowflake',
    hourlyPulse: (hourly as any[]).map((r) => ({
      hour: String(r.HOUR),
      avgScore: num(r.AVG_SCORE),
      peakScore: num(r.PEAK_SCORE),
      moments: num(r.MOMENTS),
    })),
    passionByDomain: (byDomain as any[]).map((r) => ({
      domain: String(r.DOMAIN),
      moments: num(r.MOMENTS),
      avgScore: num(r.AVG_SCORE),
      keyMoments: num(r.KEY_MOMENTS),
    })),
    hottestTeams: (teams as any[]).map((r) => ({
      team: String(r.TEAM),
      totalPassion: num(r.TOTAL_PASSION),
      avgScore: num(r.AVG_SCORE),
      moments: num(r.MOMENTS),
    })),
    sentimentBreakdown: (sentiment as any[]).map((r) => ({
      sentiment: String(r.SENTIMENT),
      moments: num(r.MOMENTS),
      avgScore: num(r.AVG_SCORE),
    })),
  };
}

async function mongoInsights(): Promise<WarehouseInsights> {
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

/** Warehouse-scale fandom analytics, from Snowflake when live. */
export async function warehouseInsights(): Promise<WarehouseInsights> {
  if (flags.snowflake) {
    try {
      return await snowflakeInsights();
    } catch (err) {
      log.warn('Snowflake insights failed, falling back to Mongo', (err as Error).message);
    }
  }
  return mongoInsights();
}
