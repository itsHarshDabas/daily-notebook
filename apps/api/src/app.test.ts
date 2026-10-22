import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { buildApp } from './app.ts';
import { collections, ensureIndexes } from './db.ts';
import type { FetchFood, SearchFoods } from './routes/foods.ts';

let mongo: MongoMemoryServer | undefined;
let client: MongoClient;
let app: Awaited<ReturnType<typeof buildApp>>;
let foodCalls = 0;

// Tokens in tests are just "user-<id>"; the real verifier checks Supabase JWTs.
const verifyToken = async (t: string) => {
  if (!t.startsWith('user-')) throw new Error('bad');
  return t;
};
const fetchFood: FetchFood = async (barcode) => {
  foodCalls++;
  return barcode === '00000000'
    ? null
    : { barcode, name: 'Oats', brand: 'Acme', kcalPer100g: 380, kcalPerServing: 152, servingSize: '40 g', nutriments: {}, source: 'openfoodfacts' };
};
let searchDown = false;
const searchFoods: SearchFoods = async (q) =>
  searchDown
    ? null
    : [
        { barcode: '12345678', name: `${q} bar`, brand: 'Acme', kcalPer100g: 400, kcalPerServing: 200, servingSize: '50 g', nutriments: {}, source: 'openfoodfacts' },
        { barcode: '87654321', name: `${q} flakes`, brand: null, kcalPer100g: 360, kcalPerServing: null, servingSize: null, nutriments: {}, source: 'openfoodfacts' },
      ];
const auth = (u = 'user-a') => ({ authorization: `Bearer ${u}` });

before(async () => {
  // Set MONGODB_TEST_URI to use an existing MongoDB; otherwise an in-memory one is downloaded and started.
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  client = await MongoClient.connect(uri);
  await client.db('test').dropDatabase();
  const c = collections(client.db('test'));
  await ensureIndexes(c);
  app = await buildApp({ c, verifyToken, fetchFood, searchFoods });
});

after(async () => {
  await app.close();
  await client.close();
  await mongo?.stop();
});

function multipart(contentType: string, bytes: Buffer) {
  const boundary = '----dn';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a"\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

test('rejects requests without a valid token', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/notes?from=2026-01-01&to=2026-12-31' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/activity', headers: auth('nope') })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
});

test('avatar upload replaces the old photo and is private to its owner', async () => {
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const up1 = multipart('image/png', png);
  const r1 = await app.inject({ method: 'PUT', url: '/me/avatar', payload: up1.payload, headers: { ...auth(), ...up1.headers } });
  assert.equal(r1.statusCode, 200);
  const up2 = multipart('image/png', png);
  const r2 = await app.inject({ method: 'PUT', url: '/me/avatar', payload: up2.payload, headers: { ...auth(), ...up2.headers } });
  const id1 = r1.json().fileId;
  const id2 = r2.json().fileId;

  assert.equal((await app.inject({ method: 'GET', url: `/avatars/${id1}`, headers: auth() })).statusCode, 404);
  const got = await app.inject({ method: 'GET', url: `/avatars/${id2}`, headers: auth() });
  assert.equal(got.statusCode, 200);
  assert.equal(got.headers['content-type'], 'image/png');
  assert.deepEqual(got.rawPayload, png);
  assert.equal((await app.inject({ method: 'GET', url: `/avatars/${id2}`, headers: auth('user-b') })).statusCode, 404);
});

test('avatar rejects non-images', async () => {
  const up = multipart('application/pdf', Buffer.from('%PDF'));
  const r = await app.inject({ method: 'PUT', url: '/me/avatar', payload: up.payload, headers: { ...auth(), ...up.headers } });
  assert.equal(r.statusCode, 415);
});

test('notes upsert per day and kind, scoped to the user', async () => {
  const put = (text: string, u = 'user-a') =>
    app.inject({ method: 'PUT', url: '/notes/2026-10-22/mood', payload: { text }, headers: auth(u) });
  assert.equal((await put('ok day')).statusCode, 200);
  await put('better day');
  await put('b note', 'user-b');
  const list = await app.inject({ method: 'GET', url: '/notes?from=2026-10-01&to=2026-10-31', headers: auth() });
  assert.deepEqual(list.json().notes.map((n: { text: string }) => n.text), ['better day']);
  assert.equal((await app.inject({ method: 'PUT', url: '/notes/22-10-2026/mood', payload: { text: 'x' }, headers: auth() })).statusCode, 400);
});

test('barcode lookup caches in MongoDB', async () => {
  const r1 = await app.inject({ method: 'GET', url: '/foods/barcode/5000112637922', headers: auth() });
  const r2 = await app.inject({ method: 'GET', url: '/foods/barcode/5000112637922', headers: auth() });
  assert.equal(r1.statusCode, 200);
  assert.equal(r2.json().kcalPerServing, 152);
  assert.equal(foodCalls, 1);
  assert.equal((await app.inject({ method: 'GET', url: '/foods/barcode/00000000', headers: auth() })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/foods/barcode/abc', headers: auth() })).statusCode, 400);
});

test('food search caches results and falls back to the cache when offline', async () => {
  const r = await app.inject({ method: 'GET', url: '/foods/search?q=granola', headers: auth() });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json().foods.map((f: { name: string }) => f.name), ['granola bar', 'granola flakes']);
  searchDown = true;
  const cached = await app.inject({ method: 'GET', url: '/foods/search?q=GRANOLA%20b', headers: auth() });
  searchDown = false;
  assert.deepEqual(cached.json().foods.map((f: { barcode: string }) => f.barcode), ['12345678']);
  assert.equal((await app.inject({ method: 'GET', url: '/foods/search?q=a', headers: auth() })).statusCode, 400);
});

test('activity log and delete-my-data', async () => {
  const r = await app.inject({
    method: 'POST',
    url: '/activity',
    payload: { device: 'pixel', events: [{ action: 'create', entity: 'days', entityId: '2026-10-22', at: '2026-10-22T07:00:00Z' }] },
    headers: auth(),
  });
  assert.equal(r.statusCode, 201);
  assert.equal((await app.inject({ method: 'GET', url: '/activity', headers: auth() })).json().events.length, 1);

  assert.equal((await app.inject({ method: 'DELETE', url: '/me', headers: auth() })).statusCode, 204);
  assert.equal((await app.inject({ method: 'GET', url: '/activity', headers: auth() })).json().events.length, 0);
  const notes = await app.inject({ method: 'GET', url: '/notes?from=2026-01-01&to=2026-12-31', headers: auth() });
  assert.equal(notes.json().notes.length, 0);
  const bNotes = await app.inject({ method: 'GET', url: '/notes?from=2026-01-01&to=2026-12-31', headers: auth('user-b') });
  assert.equal(bNotes.json().notes.length, 1);
});
