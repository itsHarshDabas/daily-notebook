import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Returns the Supabase user id (the JWT `sub`) for a valid access token, or throws. */
export type VerifyToken = (token: string) => Promise<string>;

export function supabaseTokenVerifier(opts: { supabaseUrl: string; legacySecret?: string }): VerifyToken {
  const issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  // New Supabase projects sign with asymmetric keys published at this JWKS URL;
  // older ones use a shared HS256 secret.
  const key: JWTVerifyGetKey | Uint8Array = opts.legacySecret
    ? new TextEncoder().encode(opts.legacySecret)
    : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async (token) => {
    const { payload } = await jwtVerify(token, key as JWTVerifyGetKey, { issuer, audience: 'authenticated' });
    if (!payload.sub) throw new Error('token has no subject');
    return payload.sub;
  };
}
