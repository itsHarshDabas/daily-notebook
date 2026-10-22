import type { IncomingMessage, ServerResponse } from 'node:http';

import type { FastifyInstance } from 'fastify';

import { createAppFromEnv } from './setup.ts';

// Built once per function instance and reused across requests, so warm invocations
// share one MongoDB connection pool instead of reconnecting every time.
let ready: Promise<FastifyInstance> | undefined;

function getApp(): Promise<FastifyInstance> {
  ready ??= createAppFromEnv({ logger: true })
    .then(async (app) => {
      await app.ready();
      return app;
    })
    .catch((err) => {
      ready = undefined; // let the next request retry instead of caching the failure
      throw err;
    });
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let app: FastifyInstance;
  try {
    app = await getApp();
  } catch (err) {
    console.error('API failed to start', err);
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'service unavailable' }));
    return;
  }
  app.server.emit('request', req, res);
}
