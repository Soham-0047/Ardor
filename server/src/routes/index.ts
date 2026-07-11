import { Router } from 'express';
import meta from './meta';
import events from './events';
import social from './social';

const api = Router();
api.use(meta);
api.use(events);
api.use(social);

export default api;
