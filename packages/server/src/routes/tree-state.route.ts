import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  treeStateSchema,
  bulkTreeStateSchema,
  API_ROUTES,
} from '@todo-bmad-style/shared';
import {
  getExpandedStates,
  setExpandedState,
  bulkSetExpandedState,
} from '../services/tree-state.service.js';
import { NotFoundError } from '../services/node.service.js';

const nodeIdParamSchema = z.object({ nodeId: z.string().uuid() });

export default async function treeStateRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/tree-state — returns all expand/collapse states
  fastify.get(API_ROUTES.TREE_STATE, async (_request, reply) => {
    const states = await getExpandedStates();
    return reply.send(states);
  });

  // PUT /api/tree-state/:nodeId — set expand state for a single node
  fastify.put(`${API_ROUTES.TREE_STATE}/:nodeId`, {
    schema: { params: nodeIdParamSchema, body: treeStateSchema },
  }, async (request, reply) => {
    try {
      await setExpandedState(request.params.nodeId, request.body.isExpanded);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: err.message,
        });
      }
      throw err;
    }
  });

  // PUT /api/tree-state — bulk set expand states
  fastify.put(API_ROUTES.TREE_STATE, {
    schema: { body: bulkTreeStateSchema },
  }, async (request, reply) => {
    try {
      await bulkSetExpandedState(request.body.states);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: err.message,
        });
      }
      throw err;
    }
  });
}
