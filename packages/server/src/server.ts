import fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import nodesRoutes from './routes/nodes.route.js';

export function buildServer(opts?: { logger?: false }) {
  const server = fastify({
    logger: opts?.logger !== undefined ? opts.logger : {
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.get('/api/health', async (_request, reply) => {
    try {
      db.get(sql`SELECT 1`);
      return { status: 'ok', db: 'connected' };
    } catch {
      reply.status(503);
      return { status: 'error', db: 'disconnected' };
    }
  });

  server.register(nodesRoutes);

  return server;
}
