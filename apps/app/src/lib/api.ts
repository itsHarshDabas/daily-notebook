import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Calls the Node API (MongoDB side) with the current Supabase access token. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export function avatarUrl(fileId: string): string {
  return `${API_URL}/avatars/${fileId}`;
}

export async function uploadAvatar(uri: string, mimeType: string): Promise<string> {
  const form = new FormData();
  if (uri.startsWith('data:') || uri.startsWith('blob:')) {
    // Web: the picker returns a data or blob URL.
    form.append('file', await (await fetch(uri)).blob(), 'avatar');
  } else {
    // React Native's FormData accepts this file descriptor shape.
    form.append('file', { uri, name: 'avatar.jpg', type: mimeType } as unknown as Blob);
  }
  const { fileId } = await api<{ fileId: string }>('/me/avatar', { method: 'PUT', body: form });
  return fileId;
}
