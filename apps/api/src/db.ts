import { GridFSBucket, MongoClient, type Collection, type Db, type ObjectId } from 'mongodb';

export interface NoteDoc {
  _id?: ObjectId;
  userId: string;
  date: string;
  kind: 'mood' | 'period' | 'goal';
  text: string;
  tags: string[];
  updatedAt: Date;
}

export interface FoodDoc {
  _id?: ObjectId;
  barcode: string;
  name: string;
  brand: string | null;
  kcalPer100g: number | null;
  kcalPerServing: number | null;
  servingSize: string | null;
  nutriments: Record<string, unknown>;
  source: 'openfoodfacts';
  fetchedAt: Date;
}

export interface ActivityDoc {
  _id?: ObjectId;
  userId: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  device: string | null;
  at: Date;
}

export interface Collections {
  db: Db;
  notes: Collection<NoteDoc>;
  foods: Collection<FoodDoc>;
  activity: Collection<ActivityDoc>;
  avatars: GridFSBucket;
}

export function collections(db: Db): Collections {
  return {
    db,
    notes: db.collection<NoteDoc>('notes'),
    foods: db.collection<FoodDoc>('foods'),
    activity: db.collection<ActivityDoc>('activity_log'),
    avatars: new GridFSBucket(db, { bucketName: 'avatars' }),
  };
}

export async function ensureIndexes(c: Collections): Promise<void> {
  await Promise.all([
    c.notes.createIndex({ userId: 1, date: 1, kind: 1 }, { unique: true }),
    c.foods.createIndex({ barcode: 1 }, { unique: true }),
    c.activity.createIndex({ userId: 1, at: -1 }),
    c.db.collection('avatars.files').createIndex({ 'metadata.userId': 1 }),
  ]);
}

export async function connect(uri: string, dbName: string): Promise<{ client: MongoClient; c: Collections }> {
  const client = new MongoClient(uri);
  await client.connect();
  const c = collections(client.db(dbName));
  await ensureIndexes(c);
  return { client, c };
}
