import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { Collections } from '../db.ts';

const event = z.object({
  action: z.enum(['create', 'update', 'delete']),
  entity: z.string().max(40),
  entityId: z.string().max(80),
  at: z.coerce.date(),
});
const batch = z.object({ device: z.string().max(80).nullable().default(null), events: z.array(event).min(1).max(500) });

/** Append-only log of changes, sent by the app in batches when it syncs. */
export const activityRoutes: FastifyPluginAsync<{ c: Collections }> = async (app, { c }) => {
  app.post('/activity', async (req, reply) => {
    const body = batch.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid events' });
    const { device, events } = body.data;
    await c.activity.insertMany(events.map((e) => ({ ...e, device, userId: req.userId })));
    return reply.code(201).send({ inserted: events.length });
  });

  app.get('/activity', async (req) => {
    const limit = Math.min(Number((req.query as { limit?: string }).limit) || 50, 200);
    const events = await c.activity
      .find({ userId: req.userId }, { projection: { _id: 0, userId: 0 } })
      .sort({ at: -1 })
      .limit(limit)
      .toArray();
    return { events };
  });
};
