import { supabase } from './supabase';

const BUCKET = 'avatars';

function bytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Uploads a new profile photo to Supabase Storage, removes older ones, and returns its path. */
export async function uploadAvatar(photo: { base64: string; mimeType: string }): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Not signed in');
  // A fresh name per upload, so cached copies of the old photo never show up again.
  const path = `${uid}/${Date.now()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, bytes(photo.base64), { contentType: photo.mimeType });
  if (up.error) throw new Error(up.error.message);
  await removeAvatars(uid, path).catch(() => {});
  return path;
}

/** Deletes the user's photos, except `keep` if given. */
export async function removeAvatars(uid: string, keep?: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(uid);
  if (error) throw new Error(error.message);
  const old = (data ?? []).map((f) => `${uid}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await supabase.storage.from(BUCKET).remove(old);
}

/** A short-lived URL for showing the photo. */
export async function avatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
