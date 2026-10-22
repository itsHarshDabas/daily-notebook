import type { FastifyPluginAsync } from 'fastify';

import type { Collections, FoodDoc } from '../db.ts';

export type FetchFood = (barcode: string) => Promise<Omit<FoodDoc, '_id' | 'fetchedAt'> | null>;

/** Looks a barcode up in Open Food Facts (free, no key). */
export const openFoodFacts: FetchFood = async (barcode) => {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size`;
  const res = await fetch(url, { headers: { 'user-agent': 'DailyNotebook/0.1 (capstone project)' } });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    status?: number;
    product?: { product_name?: string; brands?: string; serving_size?: string; nutriments?: Record<string, unknown> };
  };
  if (body.status !== 1 || !body.product) return null;
  const n = body.product.nutriments ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return {
    barcode,
    name: body.product.product_name?.trim() || 'Unknown product',
    brand: body.product.brands?.split(',')[0]?.trim() || null,
    kcalPer100g: num(n['energy-kcal_100g']),
    kcalPerServing: num(n['energy-kcal_serving']),
    servingSize: body.product.serving_size ?? null,
    nutriments: n,
    source: 'openfoodfacts',
  };
};

const CACHE_DAYS = 30;

export const foodRoutes: FastifyPluginAsync<{ c: Collections; fetchFood: FetchFood }> = async (app, { c, fetchFood }) => {
  app.get<{ Params: { barcode: string } }>('/foods/barcode/:barcode', async (req, reply) => {
    const { barcode } = req.params;
    if (!/^\d{8,14}$/.test(barcode)) return reply.code(400).send({ error: 'barcode must be 8 to 14 digits' });

    const cached = await c.foods.findOne({ barcode });
    const fresh = cached && Date.now() - cached.fetchedAt.getTime() < CACHE_DAYS * 86_400_000;
    if (cached && fresh) return toResponse(cached);

    const found = await fetchFood(barcode);
    if (!found) return cached ? toResponse(cached) : reply.code(404).send({ error: 'product not found' });
    const doc = await c.foods.findOneAndUpdate(
      { barcode },
      { $set: { ...found, fetchedAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    );
    return toResponse(doc!);
  });
};

function toResponse(f: FoodDoc) {
  return {
    id: f._id!.toHexString(),
    barcode: f.barcode,
    name: f.name,
    brand: f.brand,
    kcalPer100g: f.kcalPer100g,
    kcalPerServing: f.kcalPerServing,
    servingSize: f.servingSize,
  };
}
