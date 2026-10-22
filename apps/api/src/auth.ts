import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Returns the Supabase user id (the JWT `sub`) for a valid access token, or throws. */
export type VerifyToken = (token: string) => Promise<string>;

export function supabaseTokenVerifier(opts: { supabaseUrl: string; legacySecret?: string; publishableKey?: string }): VerifyToken {
  const issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  // New Supabase projects sign with asymmetric keys published at this JWKS URL;
  // older ones use a shared HS256 secret.
  const key: JWTVerifyGetKey | Uint8Array = opts.legacySecret
    ? new TextEncoder().encode(opts.legacySecret)
    : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  // A project still signing with the legacy secret publishes no matching JWKS key. If the secret
  // isn't configured, ask Supabase Auth itself whether the token is valid.
  async function askSupabase(token: string): Promise<string> {
    const res = await fetch(`${issuer}/user`, {
      headers: { apikey: opts.publishableKey!, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`token rejected (${res.status})`);
    const user = (await res.json()) as { id?: string };
    if (!user.id) throw new Error('token has no subject');
    return user.id;
  }

  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, key as JWTVerifyGetKey, { issuer, audience: 'authenticated' });
      if (!payload.sub) throw new Error('token has no subject');
      return payload.sub;
    } catch (err) {
      if (!opts.legacySecret && opts.publishableKey && err instanceof errors.JWKSNoMatchingKey) return askSupabase(token);
      throw err;
    }
  };
}
