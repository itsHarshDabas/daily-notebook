/** Food lookups straight from Open Food Facts (free, no key). */

export interface Food {
  /** The product barcode. */
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  kcalPer100g: number | null;
  kcalPerServing: number | null;
  servingSize: string | null;
}

const OFF = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,brands,nutriments,serving_size';

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, unknown>;
}

function fromOff(barcode: string, p: OffProduct): Food {
  const n = p.nutriments ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return {
    id: barcode,
    barcode,
    name: p.product_name?.trim() || 'Unknown product',
    brand: p.brands?.split(',')[0]?.trim() || null,
    kcalPer100g: num(n['energy-kcal_100g']),
    kcalPerServing: num(n['energy-kcal_serving']),
    servingSize: p.serving_size ?? null,
  };
}

async function getJson<T>(url: string): Promise<T> {
  // AbortSignal.timeout isn't available in React Native, so time out by hand.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Food lookup failed (${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcode(barcode: string): Promise<Food> {
  if (!/^\d{8,14}$/.test(barcode)) throw new Error('That barcode doesn’t look right');
  const body = await getJson<{ status?: number; product?: OffProduct }>(`${OFF}/api/v2/product/${barcode}.json?fields=${FIELDS}`);
  if (body.status !== 1 || !body.product) throw new Error('Product not found');
  return fromOff(barcode, body.product);
}

/** Products without a name or a usable barcode are skipped. */
export async function searchFoods(q: string): Promise<Food[]> {
  const body = await getJson<{ products?: OffProduct[] }>(
    `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`,
  );
  return (body.products ?? []).filter((p) => p.code && /^\d{8,14}$/.test(p.code) && p.product_name?.trim()).map((p) => fromOff(p.code!, p));
}
