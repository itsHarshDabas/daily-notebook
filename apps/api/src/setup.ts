import type { FastifyInstance } from 'fastify';

import { buildApp } from './app.ts';
import { supabaseTokenVerifier } from './auth.ts';
import { connect } from './db.ts';
import { openFoodFacts, openFoodFactsSearch } from './routes/foods.ts';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see apps/api/.env.example)`);
  return v;
}

/** Builds the API from environment variables. Shared by the long-running server and the Vercel function. */
export async function createAppFromEnv(opts: { logger: boolean }): Promise<FastifyInstance> {
  const { client, c } = await connect(required('MONGODB_URI'), process.env.MONGODB_DB ?? 'daily_notebook');
  const app = await buildApp({
    c,
    verifyToken: supabaseTokenVerifier({
      supabaseUrl: required('SUPABASE_URL'),
      legacySecret: process.env.SUPABASE_JWT_SECRET || undefined,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || undefined,
    }),
    fetchFood: openFoodFacts,
    searchFoods: openFoodFactsSearch,
    corsOrigins: process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean),
    logger: opts.logger,
  });
  app.addHook('onClose', () => client.close());
  return app;
}
