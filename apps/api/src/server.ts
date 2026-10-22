import { buildApp } from './app.ts';
import { supabaseTokenVerifier } from './auth.ts';
import { connect } from './db.ts';
import { openFoodFacts, openFoodFactsSearch } from './routes/foods.ts';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see apps/api/.env.example)`);
  return v;
}

const { client, c } = await connect(required('MONGODB_URI'), process.env.MONGODB_DB ?? 'daily_notebook');
const app = await buildApp({
  c,
  verifyToken: supabaseTokenVerifier({
    supabaseUrl: required('SUPABASE_URL'),
    legacySecret: process.env.SUPABASE_JWT_SECRET || undefined,
  }),
  fetchFood: openFoodFacts,
  searchFoods: openFoodFactsSearch,
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean),
  logger: true,
});

app.addHook('onClose', () => client.close());
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' });
