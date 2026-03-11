import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
import { buildServer } from '../server.js';

describe('tree-state routes', () => {
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

  describe('GET /api/tree-state', () => {
    it('should return empty object when no states exist', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/tree-state' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({});
    });

    it('should return saved states', async () => {
      const project = await createProject();

      await server.inject({
        method: 'PUT',
        url: `/api/tree-state/${project.id}`,
        payload: { isExpanded: true },
      });

      const res = await server.inject({ method: 'GET', url: '/api/tree-state' });
      expect(res.statusCode).toBe(200);
      const states = res.json();
      expect(states[project.id]).toBe(true);
    });
  });

  describe('PUT /api/tree-state/:nodeId', () => {
    it('should create state and return 204', async () => {
      const project = await createProject();

      const res = await server.inject({
        method: 'PUT',
        url: `/api/tree-state/${project.id}`,
        payload: { isExpanded: false },
      });
      expect(res.statusCode).toBe(204);

      const getRes = await server.inject({ method: 'GET', url: '/api/tree-state' });
      expect(getRes.json()[project.id]).toBe(false);
    });

    it('should update existing state', async () => {
      const project = await createProject();

      await server.inject({
        method: 'PUT',
        url: `/api/tree-state/${project.id}`,
        payload: { isExpanded: true },
      });

      await server.inject({
        method: 'PUT',
        url: `/api/tree-state/${project.id}`,
        payload: { isExpanded: false },
      });

      const getRes = await server.inject({ method: 'GET', url: '/api/tree-state' });
      expect(getRes.json()[project.id]).toBe(false);
    });

    it('should return 404 for non-existent node', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/api/tree-state/00000000-0000-0000-0000-000000000000',
        payload: { isExpanded: true },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/tree-state (bulk)', () => {
    it('should update multiple states and return 204', async () => {
      const project = await createProject();
      const effort = await createEffort(project.id);

      const res = await server.inject({
        method: 'PUT',
        url: '/api/tree-state',
        payload: {
          states: [
            { nodeId: project.id, isExpanded: true },
            { nodeId: effort.id, isExpanded: false },
          ],
        },
      });
      expect(res.statusCode).toBe(204);

      const getRes = await server.inject({ method: 'GET', url: '/api/tree-state' });
      const states = getRes.json();
      expect(states[project.id]).toBe(true);
      expect(states[effort.id]).toBe(false);
    });

    it('should return 404 if any node does not exist', async () => {
      const project = await createProject();

      const res = await server.inject({
        method: 'PUT',
        url: '/api/tree-state',
        payload: {
          states: [
            { nodeId: project.id, isExpanded: true },
            { nodeId: '00000000-0000-0000-0000-000000000000', isExpanded: false },
          ],
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
