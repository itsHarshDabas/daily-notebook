import type { FastifyPluginAsync } from 'fastify';

import type { Collections, FoodDoc } from '../db.ts';

type FoodInput = Omit<FoodDoc, '_id' | 'fetchedAt'>;
export type FetchFood = (barcode: string) => Promise<FoodInput | null>;
/** Returns matching products, or null when the upstream service can't be reached. */
export type SearchFoods = (q: string) => Promise<FoodInput[] | null>;

const OFF_HEADERS = { 'user-agent': 'DailyNotebook/0.1 (capstone project)' };
const OFF_FIELDS = 'code,product_name,brands,nutriments,serving_size';

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, unknown>;
}

function fromOff(barcode: string, p: OffProduct): FoodInput {
  const n = p.nutriments ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return {
    barcode,
    name: p.product_name?.trim() || 'Unknown product',
    brand: p.brands?.split(',')[0]?.trim() || null,
    kcalPer100g: num(n['energy-kcal_100g']),
    kcalPerServing: num(n['energy-kcal_serving']),
    servingSize: p.serving_size ?? null,
    nutriments: n,
    source: 'openfoodfacts',
  };
}

/** Looks a barcode up in Open Food Facts (free, no key). */
export const openFoodFacts: FetchFood = async (barcode) => {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`, { headers: OFF_HEADERS });
  if (!res.ok) return null;
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  if (body.status !== 1 || !body.product) return null;
  return fromOff(barcode, body.product);
};

/** Full-text product search in Open Food Facts. Products without a name or barcode are skipped. */
export const openFoodFactsSearch: SearchFoods = async (q) => {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_FIELDS}`;
  try {
    const res = await fetch(url, { headers: OFF_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { products?: OffProduct[] };
    return (body.products ?? []).filter((p) => p.code && /^\d{8,14}$/.test(p.code) && p.product_name?.trim()).map((p) => fromOff(p.code!, p));
  } catch {
    return null;
  }
};

const CACHE_DAYS = 30;

export const foodRoutes: FastifyPluginAsync<{ c: Collections; fetchFood: FetchFood; searchFoods: SearchFoods }> = async (app, { c, fetchFood, searchFoods }) => {
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

  app.get<{ Querystring: { q?: string } }>('/foods/search', async (req, reply) => {
    const q = (req.query.q ?? '').trim();
    if (q.length < 2 || q.length > 80) return reply.code(400).send({ error: 'q must be 2 to 80 characters' });

    const found = await searchFoods(q);
    if (found === null) {
      // Upstream is down: answer from products already cached in MongoDB.
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const docs = await c.foods.find({ $or: [{ name: re }, { brand: re }] }).limit(20).toArray();
      return { foods: docs.map(toResponse), cached: true };
    }
    if (found.length === 0) return { foods: [] };

    const now = new Date();
    await c.foods.bulkWrite(
      found.map((f) => ({ updateOne: { filter: { barcode: f.barcode }, update: { $set: { ...f, fetchedAt: now } }, upsert: true } })),
      { ordered: false },
    );
    const docs = await c.foods.find({ barcode: { $in: found.map((f) => f.barcode) } }).toArray();
    const byBarcode = new Map(docs.map((d) => [d.barcode, d]));
    // Keep the upstream relevance order; drop duplicate barcodes.
    const seen = new Set<string>();
    const foods = found.flatMap((f) => {
      const d = byBarcode.get(f.barcode);
      if (!d || seen.has(f.barcode)) return [];
      seen.add(f.barcode);
      return [toResponse(d)];
    });
    return { foods };
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
