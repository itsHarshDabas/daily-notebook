import { createAppFromEnv } from './setup.ts';

const app = await createAppFromEnv({ logger: true });
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' });
