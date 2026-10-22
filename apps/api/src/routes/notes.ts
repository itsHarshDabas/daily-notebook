import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { Collections } from '../db.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const kind = z.enum(['mood', 'period', 'goal']);
const noteBody = z.object({ text: z.string().max(5000), tags: z.array(z.string().max(40)).max(20).default([]) });

export const noteRoutes: FastifyPluginAsync<{ c: Collections }> = async (app, { c }) => {
  app.get('/notes', async (req, reply) => {
    const q = z.object({ from: isoDate, to: isoDate }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'from and to must be YYYY-MM-DD' });
    const notes = await c.notes
      .find({ userId: req.userId, date: { $gte: q.data.from, $lte: q.data.to } }, { projection: { _id: 0, userId: 0 } })
      .sort({ date: 1 })
      .toArray();
    return { notes };
  });

  app.put('/notes/:date/:kind', async (req, reply) => {
    const params = z.object({ date: isoDate, kind }).safeParse(req.params);
    const body = noteBody.safeParse(req.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid note' });
    const { date, kind: k } = params.data;
    await c.notes.updateOne(
      { userId: req.userId, date, kind: k },
      { $set: { ...body.data, updatedAt: new Date() } },
      { upsert: true },
    );
    return { date, kind: k, ...body.data };
  });

  app.delete('/notes/:date/:kind', async (req, reply) => {
    const params = z.object({ date: isoDate, kind }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid note' });
    await c.notes.deleteOne({ userId: req.userId, ...params.data });
    return reply.code(204).send();
  });
};
