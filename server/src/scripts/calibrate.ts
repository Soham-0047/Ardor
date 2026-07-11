import { heuristicScore } from '../lib/heuristicScorer';
import { worldcupSeed } from '../data/worldcup-seed';

/**
 * Dev tool: score the seeded corpus with the current heuristic and print the
 * distribution — run after tuning the scorer to keep it calibrated.
 *
 *   npx tsx src/scripts/calibrate.ts     (from server/)
 */
const scores = worldcupSeed.map((e) => ({
  s: heuristicScore(e).passion_score,
  type: e.type,
  title: e.title,
}));
const vals = scores.map((x) => x.s).sort((a, b) => a - b);
const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
const med = vals[Math.floor(vals.length / 2)];
const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];

console.log(`n=${vals.length}  min=${vals[0]}  p25=${q(0.25)}  median=${med}  p75=${q(0.75)}  max=${vals[vals.length - 1]}  avg=${avg.toFixed(1)}`);
console.log(`key moments (>=75): ${vals.filter((v) => v >= 75).length}/${vals.length}`);

// Spread check by type — routine events should sit far below spectacles.
const byType = new Map<string, number[]>();
for (const x of scores) {
  byType.set(x.type, [...(byType.get(x.type) ?? []), x.s]);
}
for (const [type, list] of [...byType.entries()].sort((a, b) => b[1][0] - a[1][0])) {
  const a = Math.round(list.reduce((x, y) => x + y, 0) / list.length);
  console.log(`  ${type.padEnd(16)} avg=${String(a).padStart(3)}  (${list.length})`);
}

console.log('\nhottest:', scores.sort((a, b) => b.s - a.s).slice(0, 3).map((x) => `[${x.s}] ${x.title}`).join(' | '));
console.log('quietest:', scores.slice(-3).map((x) => `[${x.s}] ${x.title}`).join(' | '));
