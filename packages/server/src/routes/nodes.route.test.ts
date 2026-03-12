import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
import { buildServer } from '../server.js';

describe('nodes routes', () => {
  const server = buildServer({ logger: false });

  beforeEach(() => {
    clearTestDb();
  });

  async function createProject(title = 'Test Project') {
    const res = await server.inject({
      method: 'POST',
      url: '/api/nodes',
      payload: { title, type: 'project' },
    });
    return res.json();
  }

  async function createEffort(parentId: string, title = 'Test Effort') {
    const res = await server.inject({
      method: 'POST',
      url: '/api/nodes',
      payload: { title, type: 'effort', parentId },
    });
    return res.json();
  }

  async function createTask(parentId: string, title = 'Test Task') {
    const res = await server.inject({
      method: 'POST',
      url: '/api/nodes',
      payload: { title, type: 'task', parentId },
    });
    return res.json();
  }

  describe('GET /api/nodes', () => {
    it('should return 200 with empty array', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/nodes' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it('should return 200 with projects', async () => {
      await createProject('P1');
      await createProject('P2');
      const res = await server.inject({ method: 'GET', url: '/api/nodes' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(2);
    });
  });

  describe('POST /api/nodes', () => {
    it('should return 201 with valid body', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/nodes',
        payload: { title: 'My Project', type: 'project' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.title).toBe('My Project');
      expect(body.type).toBe('project');
      expect(body.id).toBeDefined();
    });

    it('should return 400 with invalid body', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/nodes',
        payload: { title: '', type: 'project' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for missing title', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/nodes',
        payload: { type: 'project' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for hierarchy violation', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/nodes',
        payload: { title: 'Effort', type: 'effort' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/nodes/:id', () => {
    it('should return 200 for existing node', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'GET',
        url: `/api/nodes/${project.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(project.id);
    });

    it('should return 404 for missing node', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/nodes/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/nodes/:id', () => {
    it('should return 200 with valid update', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/nodes/${project.id}`,
        payload: { title: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Updated');
    });

    it('should return 400 with empty body', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/nodes/${project.id}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/nodes/:id', () => {
    it('should return 204', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'DELETE',
        url: `/api/nodes/${project.id}`,
      });
      expect(res.statusCode).toBe(204);
    });

    it('should cascade delete descendants', async () => {
      const project = await createProject();
      const effort = await createEffort(project.id);
      const task = await createTask(effort.id);

      await server.inject({
        method: 'DELETE',
        url: `/api/nodes/${project.id}`,
      });

      const effortRes = await server.inject({
        method: 'GET',
        url: `/api/nodes/${effort.id}`,
      });
      expect(effortRes.statusCode).toBe(404);

      const taskRes = await server.inject({
        method: 'GET',
        url: `/api/nodes/${task.id}`,
      });
      expect(taskRes.statusCode).toBe(404);
    });

    it('should return 404 for missing node', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: '/api/nodes/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/nodes/:id/ancestors', () => {
    it('should return ancestor chain from root to node', async () => {
      const project = await createProject();
      const effort = await createEffort(project.id);
      const task = await createTask(effort.id);

      const res = await server.inject({
        method: 'GET',
        url: `/api/nodes/${task.id}/ancestors`,
      });
      expect(res.statusCode).toBe(200);
      const ancestors = res.json();
      expect(ancestors).toHaveLength(3);
      expect(ancestors[0].id).toBe(project.id);
      expect(ancestors[1].id).toBe(effort.id);
      expect(ancestors[2].id).toBe(task.id);
    });

    it('should return single item for project node', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'GET',
        url: `/api/nodes/${project.id}/ancestors`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('should return 404 for missing node', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/nodes/00000000-0000-0000-0000-000000000000/ancestors',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/nodes/:id/children', () => {
    it('should return sorted children', async () => {
      const project = await createProject();
      await createEffort(project.id, 'E1');
      await createEffort(project.id, 'E2');
      await createEffort(project.id, 'E3');

      const res = await server.inject({
        method: 'GET',
        url: `/api/nodes/${project.id}/children`,
      });
      expect(res.statusCode).toBe(200);
      const children = res.json();
      expect(children).toHaveLength(3);
      expect(children[0].title).toBe('E1');
      expect(children[0].sortOrder).toBe(0);
      expect(children[1].sortOrder).toBe(1);
      expect(children[2].sortOrder).toBe(2);
    });

    it('should return 404 for missing parent', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/nodes/00000000-0000-0000-0000-000000000000/children',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/nodes/:id/reorder', () => {
    it('should update sort_order correctly', async () => {
      const project = await createProject();
      await createEffort(project.id, 'E1');
      await createEffort(project.id, 'E2');
      const e3 = await createEffort(project.id, 'E3');

      const res = await server.inject({
        method: 'PATCH',
        url: `/api/nodes/${e3.id}/reorder`,
        payload: { sortOrder: 0 },
      });
      expect(res.statusCode).toBe(200);

      const childrenRes = await server.inject({
        method: 'GET',
        url: `/api/nodes/${project.id}/children`,
      });
      const children = childrenRes.json();
      expect(children[0].title).toBe('E3');
      expect(children[1].title).toBe('E1');
      expect(children[2].title).toBe('E2');
    });
  });

  describe('PATCH /api/nodes/:id/move', () => {
    it('should move node to valid parent', async () => {
      const p1 = await createProject('P1');
      const p2 = await createProject('P2');
      const effort = await createEffort(p1.id);

      const res = await server.inject({
        method: 'PATCH',
        url: `/api/nodes/${effort.id}/move`,
        payload: { newParentId: p2.id, sortOrder: 0 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().parentId).toBe(p2.id);
    });

    it('should reject invalid hierarchy move', async () => {
      const project = await createProject();
      const effort = await createEffort(project.id);
      const task = await createTask(effort.id);

      const res = await server.inject({
        method: 'PATCH',
        url: `/api/nodes/${task.id}/move`,
        payload: { newParentId: project.id, sortOrder: 0 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/nodes/:id/complete', () => {
    it('should return 200 with affectedNodes array', async () => {
      const project = await createProject();
      const res = await server.inject({
        method: 'POST',
        url: `/api/nodes/${project.id}/complete`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.affectedNodes).toBeDefined();
      expect(Array.isArray(body.affectedNodes)).toBe(true);
      expect(body.affectedNodes).toHaveLength(1);
      expect(body.affectedNodes[0].id).toBe(project.id);
      expect(body.affectedNodes[0].isCompleted).toBe(true);
    });

    it('should return 404 for non-existent node', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/nodes/00000000-0000-0000-0000-000000000000/complete',
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return response matching toggleCompletionResponseSchema', async () => {
      const { toggleCompletionResponseSchema } = await import('@todo-bmad-style/shared');
      const project = await createProject();
      const effort = await createEffort(project.id);

      const res = await server.inject({
        method: 'POST',
        url: `/api/nodes/${effort.id}/complete`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Validate response against the actual Zod schema (catches UUID format, extra props, etc.)
      const parsed = toggleCompletionResponseSchema.parse(body);
      expect(parsed.affectedNodes.length).toBeGreaterThan(0);
    });
  });
});
