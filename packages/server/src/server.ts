import fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import nodesRoutes from './routes/nodes.route.js';
import treeStateRoutes from './routes/tree-state.route.js';

export function buildServer(opts?: { logger?: false }) {
  const server = fastify({
    logger: opts?.logger !== undefined ? opts.logger : {
      transport: {
        target: 'pino-pretty',
      },
    },
    bodyLimit: 1_048_576, // 1MB
  });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Security headers
  server.register(helmet, {
    contentSecurityPolicy: false, // Disabled for SPA compatibility
  });

  // Rate limiting: 100 requests per minute per IP (disabled in test)
  if (!process.env.DISABLE_RATE_LIMIT) {
    server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  // CORS: same-origin only by default
  server.register(cors, {
    origin: false,
  });

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
  server.register(treeStateRoutes);

  return server;
}
