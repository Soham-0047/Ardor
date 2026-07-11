import { Router } from 'express';
import { flags } from '../config/env';
import { pluginInfo } from '../plugins/registry';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fanforge', uptime: process.uptime() });
});

/** Everything the client needs to render honestly: which integrations are live. */
router.get('/config', (_req, res) => {
  res.json({ flags, plugins: pluginInfo() });
});

router.get('/plugins', (_req, res) => {
  res.json({ plugins: pluginInfo() });
});

export default router;
