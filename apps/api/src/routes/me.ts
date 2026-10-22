import type { FastifyPluginAsync } from 'fastify';

import type { Collections } from '../db.ts';

/** "Delete my data": clears everything this user has in MongoDB. Supabase rows go with the auth user. */
export const meRoutes: FastifyPluginAsync<{ c: Collections }> = async (app, { c }) => {
  app.delete('/me', async (req, reply) => {
    const files = await c.avatars.find({ 'metadata.userId': req.userId }).toArray();
    await Promise.all([
      ...files.map((f) => c.avatars.delete(f._id)),
      c.notes.deleteMany({ userId: req.userId }),
      c.activity.deleteMany({ userId: req.userId }),
    ]);
    return reply.code(204).send();
  });
};
