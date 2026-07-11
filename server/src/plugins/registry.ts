import type { FanPlugin, PluginInfo } from './types';
import { worldCupPlugin } from './worldcup';
import { rivalryPlugin } from './rivalry';
import { personalPlugin } from './personal';

/**
 * The plugin router. Registering a plugin here makes its domain scoreable,
 * searchable, and surfaced — no core changes required. This is what makes
 * FanForge a platform rather than a single-sport app.
 */
const registered: FanPlugin[] = [worldCupPlugin, rivalryPlugin, personalPlugin];

const byId = new Map<string, FanPlugin>(registered.map((p) => [p.id, p]));

export function allPlugins(): FanPlugin[] {
  return registered;
}

export function getPlugin(id: string): FanPlugin | undefined {
  return byId.get(id);
}

export function pluginInfo(): PluginInfo[] {
  return registered.map((p) => ({
    id: p.id,
    domain: p.domain,
    displayName: p.displayName,
    description: p.description,
    emoji: p.emoji,
    acceptsUserActions: typeof p.normalizeUserAction === 'function',
  }));
}
