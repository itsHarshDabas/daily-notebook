import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import type { VerifyToken } from './auth.ts';
import type { Collections } from './db.ts';
import { activityRoutes } from './routes/activity.ts';
import { avatarRoutes } from './routes/avatar.ts';
import { foodRoutes, type FetchFood, type SearchFoods } from './routes/foods.ts';
import { meRoutes } from './routes/me.ts';
import { noteRoutes } from './routes/notes.ts';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export interface AppDeps {
  c: Collections;
  verifyToken: VerifyToken;
  fetchFood: FetchFood;
  searchFoods: SearchFoods;
  corsOrigins?: string[];
  logger?: boolean;
}

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false });
  await app.register(cors, { origin: deps.corsOrigins ?? false });
  await app.register(multipart, { limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } });

  app.get('/health', async () => ({ ok: true }));

  // Everything else needs a Supabase access token; the user id comes only from it.
  await app.register(async (secured) => {
    secured.decorateRequest('userId', '');
    secured.addHook('onRequest', async (req: FastifyRequest, reply) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) return reply.code(401).send({ error: 'missing token' });
      try {
        req.userId = await deps.verifyToken(header.slice('Bearer '.length));
      } catch {
        return reply.code(401).send({ error: 'invalid token' });
      }
    });

    await secured.register(avatarRoutes, { c: deps.c });
    await secured.register(noteRoutes, { c: deps.c });
    await secured.register(foodRoutes, { c: deps.c, fetchFood: deps.fetchFood, searchFoods: deps.searchFoods });
    await secured.register(activityRoutes, { c: deps.c });
    await secured.register(meRoutes, { c: deps.c });
  });

  return app;
}
