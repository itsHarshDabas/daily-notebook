import type { FastifyPluginAsync } from 'fastify';
import { ObjectId } from 'mongodb';

import type { Collections } from '../db.ts';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Profile photos live in GridFS; the app stores the returned file id on its Supabase profile. */
export const avatarRoutes: FastifyPluginAsync<{ c: Collections }> = async (app, { c }) => {
  app.put('/me/avatar', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'no file' });
    if (!ALLOWED_TYPES.has(file.mimetype)) return reply.code(415).send({ error: 'use JPEG, PNG or WebP' });

    const upload = c.avatars.openUploadStream(`${req.userId}`, {
      metadata: { userId: req.userId, contentType: file.mimetype },
    });
    for await (const chunk of file.file) upload.write(chunk);
    if (file.file.truncated) {
      upload.abort();
      return reply.code(413).send({ error: 'photo is over 2 MB' });
    }
    await new Promise<void>((resolve, reject) => upload.end((err?: Error | null) => (err ? reject(err) : resolve())));

    // Keep one photo per user.
    const old = await c.avatars.find({ 'metadata.userId': req.userId, _id: { $ne: upload.id } }).toArray();
    await Promise.all(old.map((f) => c.avatars.delete(f._id)));

    return { fileId: upload.id.toHexString() };
  });

  app.get<{ Params: { id: string } }>('/avatars/:id', async (req, reply) => {
    if (!ObjectId.isValid(req.params.id)) return reply.code(404).send({ error: 'not found' });
    const _id = new ObjectId(req.params.id);
    const [meta] = await c.avatars.find({ _id, 'metadata.userId': req.userId }).toArray();
    if (!meta) return reply.code(404).send({ error: 'not found' });
    reply.header('content-type', meta.metadata?.contentType ?? 'application/octet-stream');
    reply.header('cache-control', 'private, max-age=86400');
    return reply.send(c.avatars.openDownloadStream(_id));
  });
};
