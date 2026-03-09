import fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
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

  server.get('/api/health', async () => ({ status: 'ok' }));

  server.register(nodesRoutes);

  return server;
}
