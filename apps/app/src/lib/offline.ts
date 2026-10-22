import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { useSyncExternalStore } from 'react';

/**
 * Offline support, kept deliberately small:
 * - reads go through `readThrough`, which caches the last good result per key and serves it when offline;
 * - writes go through `write`, which runs them now or, if the network is down, queues them in an outbox
 *   (persisted in AsyncStorage) and applies an optimistic change to the cache so the UI stays current.
 * Queued writes replay in order when the app is online again. Inserts carry client-made ids and use
 * upserts, so a replay after a half-finished request can't create duplicates.
 */

const CACHE_PREFIX = 'dn.cache.';
const OUTBOX_KEY = 'dn.outbox';

export interface OutboxOp {
  id: string;
  label: string;
  /** Serializable description; the executor registered with `setExecutor` knows how to run it. */
  op: unknown;
}

type Executor = (op: unknown) => Promise<void>;

let executor: Executor | null = null;
let outbox: OutboxOp[] = [];
let loaded = false;
let flushing = false;
let online = true;
const listeners = new Set<() => void>();

function emit() {
  snapshot = { pending: outbox.length, online, syncing: flushing };
  listeners.forEach((l) => l());
}
let snapshot = { pending: 0, online: true, syncing: false };

export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /network request failed|failed to fetch|networkerror|load failed|fetch failed|timeout|offline/i.test(msg);
}

async function loadOutbox() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    outbox = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    outbox = [];
  }
  emit();
}

async function saveOutbox() {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)).catch(() => {});
  emit();
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)).catch(() => {});
}

export async function cacheUpdate<T>(key: string, fn: (current: T | undefined) => T | undefined): Promise<void> {
  const next = fn(await cacheGet<T>(key));
  if (next !== undefined) await cacheSet(key, next);
}

/** Fetch fresh data, falling back to the last cached copy when offline. */
export async function readThrough<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const fresh = await fetcher();
    await cacheSet(key, fresh);
    setOnline(true);
    return fresh;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    setOnline(false);
    const cached = await cacheGet<T>(key);
    if (cached === undefined) throw new Error("You're offline and this hasn't been loaded on this device yet.");
    return cached;
  }
}

/** Run a write now, or queue it when offline. `optimistic` updates cached reads either way. */
export async function write(label: string, op: unknown, optimistic?: () => Promise<void>): Promise<'done' | 'queued'> {
  await loadOutbox();
  if (!executor) throw new Error('offline executor not set');
  // Keep order: if older writes are waiting, this one waits behind them.
  if (outbox.length === 0) {
    try {
      await executor(op);
      setOnline(true);
      await optimistic?.();
      return 'done';
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      setOnline(false);
    }
  }
  outbox.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, op });
  await saveOutbox();
  await optimistic?.();
  return 'queued';
}

export async function flush(): Promise<void> {
  await loadOutbox();
  if (flushing || !executor || outbox.length === 0) return;
  flushing = true;
  emit();
  try {
    while (outbox.length > 0) {
      const next = outbox[0];
      try {
        await executor(next.op);
        setOnline(true);
      } catch (e) {
        if (isNetworkError(e)) {
          setOnline(false);
          return;
        }
        // A write the server rejects will never succeed; drop it rather than block the queue.
        console.warn(`Dropped queued change "${next.label}":`, e instanceof Error ? e.message : e);
      }
      outbox.shift();
      await saveOutbox();
    }
  } finally {
    flushing = false;
    emit();
  }
}

function setOnline(v: boolean) {
  if (online !== v) {
    online = v;
    emit();
  }
}

export function setExecutor(fn: Executor) {
  executor = fn;
}

/** Clears cache and queue, e.g. on sign-out, so the next user never sees this user's data. */
export async function resetOfflineData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(CACHE_PREFIX) || k === OUTBOX_KEY)).catch(() => {});
  outbox = [];
  emit();
}

let started = false;
/** Replays the outbox when the device reconnects or the app returns to the foreground. */
export function startSync() {
  if (started) return;
  started = true;
  loadOutbox().then(flush);
  NetInfo.addEventListener((s) => {
    const up = !!s.isConnected && s.isInternetReachable !== false;
    setOnline(up);
    if (up) flush();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') flush();
  });
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );
}
