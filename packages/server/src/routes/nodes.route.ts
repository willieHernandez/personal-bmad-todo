import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  reorderNodeSchema,
  API_ROUTES,
} from '@todo-bmad-style/shared';
import {
  getProjects,
  getNodeById,
  getChildren,
  createNode,
  updateNode,
  deleteNode,
  reorderNode,
  moveNode,
  NotFoundError,
  HierarchyError,
} from '../services/node.service.js';

const idParamSchema = z.object({ id: z.string().uuid() });

export default async function nodesRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/nodes — list all root projects
  fastify.get(API_ROUTES.NODES, async (_request, reply) => {
    const projects = await getProjects();
    return reply.send(projects);
  });

  // POST /api/nodes — create a new node
  fastify.post(API_ROUTES.NODES, {
    schema: { body: createNodeSchema },
  }, async (request, reply) => {
    try {
      const node = await createNode(request.body);
      return reply.status(201).send(node);
    } catch (err) {
      if (err instanceof HierarchyError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message,
        });
      }
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

  // GET /api/nodes/:id — get a single node
  fastify.get(`${API_ROUTES.NODES}/:id`, {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    try {
      const node = await getNodeById(request.params.id);
      return reply.send(node);
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

  // PATCH /api/nodes/:id — update a node
  fastify.patch(`${API_ROUTES.NODES}/:id`, {
    schema: { params: idParamSchema, body: updateNodeSchema },
  }, async (request, reply) => {
    try {
      const node = await updateNode(request.params.id, request.body);
      return reply.send(node);
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

  // DELETE /api/nodes/:id — delete a node and all descendants
  fastify.delete(`${API_ROUTES.NODES}/:id`, {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    try {
      await deleteNode(request.params.id);
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

  // GET /api/nodes/:id/children — get children sorted by sort_order
  fastify.get(`${API_ROUTES.NODES}/:id/children`, {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    try {
      await getNodeById(request.params.id); // verify parent exists
      const children = await getChildren(request.params.id);
      return reply.send(children);
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

  // PATCH /api/nodes/:id/reorder — update sort_order
  fastify.patch(`${API_ROUTES.NODES}/:id/reorder`, {
    schema: { params: idParamSchema, body: reorderNodeSchema },
  }, async (request, reply) => {
    try {
      const node = await reorderNode(request.params.id, request.body.sortOrder);
      return reply.send(node);
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

  // PATCH /api/nodes/:id/move — move node to new parent
  fastify.patch(`${API_ROUTES.NODES}/:id/move`, {
    schema: { params: idParamSchema, body: moveNodeSchema },
  }, async (request, reply) => {
    try {
      const node = await moveNode(request.params.id, request.body.newParentId, request.body.sortOrder, request.body.newType);
      return reply.send(node);
    } catch (err) {
      if (err instanceof HierarchyError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message,
        });
      }
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
