import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
import { buildServer } from '../server.js';
import { treeStateSchema, bulkTreeStateSchema } from '@todo-bmad-style/shared';

const PORT = 3003;
const BASE = `http://localhost:${PORT}`;

type Server = ReturnType<typeof buildServer>;
let server: Server;

beforeAll(async () => {
  server = buildServer({ logger: false });
  await server.listen({ host: '127.0.0.1', port: PORT });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  clearTestDb();
});

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function createProject(title = 'P') {
  const res = await api('POST', '/api/nodes', { title, type: 'project' });
  return res.json();
}

async function createEffort(parentId: string, title = 'E') {
  const res = await api('POST', '/api/nodes', { title, type: 'effort', parentId });
  return res.json();
}

describe('API Integration: Tree State', () => {
  it('GET /api/tree-state returns empty object initially', async () => {
    const res = await api('GET', '/api/tree-state');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({});
  });

  it('PUT /api/tree-state/:nodeId sets state and returns 204', async () => {
    const project = await createProject();
    const res = await api('PUT', `/api/tree-state/${project.id}`, { isExpanded: true });
    expect(res.status).toBe(204);
  });

  it('GET /api/tree-state returns saved state after PUT', async () => {
    const project = await createProject();
    await api('PUT', `/api/tree-state/${project.id}`, { isExpanded: false });

    const res = await api('GET', '/api/tree-state');
    const json = await res.json();
    expect(json[project.id]).toBe(false);
  });

  it('PUT /api/tree-state/:nodeId returns 404 for non-existent node', async () => {
    const res = await api('PUT', '/api/tree-state/00000000-0000-0000-0000-000000000000', { isExpanded: true });
    expect(res.status).toBe(404);
  });

  it('PUT /api/tree-state/:nodeId with invalid body returns 400', async () => {
    const project = await createProject();
    const res = await api('PUT', `/api/tree-state/${project.id}`, { isExpanded: 'yes' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/tree-state (bulk) sets multiple states atomically', async () => {
    const project = await createProject();
    const effort = await createEffort(project.id);

    const res = await api('PUT', '/api/tree-state', {
      states: [
        { nodeId: project.id, isExpanded: true },
        { nodeId: effort.id, isExpanded: false },
      ],
    });
    expect(res.status).toBe(204);

    const stateRes = await api('GET', '/api/tree-state');
    const state = await stateRes.json();
    expect(state[project.id]).toBe(true);
    expect(state[effort.id]).toBe(false);
  });

  it('PUT /api/tree-state (bulk) returns 404 if any node missing', async () => {
    const project = await createProject();
    const res = await api('PUT', '/api/tree-state', {
      states: [
        { nodeId: project.id, isExpanded: true },
        { nodeId: '00000000-0000-0000-0000-000000000000', isExpanded: false },
      ],
    });
    expect(res.status).toBe(404);
  });

  it('PUT /api/tree-state (bulk) with invalid nodeId format returns 400', async () => {
    const res = await api('PUT', '/api/tree-state', {
      states: [{ nodeId: 'not-a-uuid', isExpanded: true }],
    });
    expect(res.status).toBe(400);
  });
});

describe('API Integration: Cascade to Tree State', () => {
  it('deleting a project cascades to tree state entries', async () => {
    const project = await createProject();
    const effort = await createEffort(project.id);

    await api('PUT', `/api/tree-state/${project.id}`, { isExpanded: true });
    await api('PUT', `/api/tree-state/${effort.id}`, { isExpanded: true });

    // Verify states exist
    const stateBefore = await (await api('GET', '/api/tree-state')).json();
    expect(stateBefore[project.id]).toBe(true);
    expect(stateBefore[effort.id]).toBe(true);

    // Delete project
    await api('DELETE', `/api/nodes/${project.id}`);

    // Verify states are gone
    const stateAfter = await (await api('GET', '/api/tree-state')).json();
    expect(stateAfter[project.id]).toBeUndefined();
    expect(stateAfter[effort.id]).toBeUndefined();
  });

  it('deleting a mid-level node cascades to its children states but not siblings', async () => {
    const project = await createProject();
    const effort1 = await createEffort(project.id, 'E1');
    const effort2 = await createEffort(project.id, 'E2');
    const taskRes = await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: effort1.id });
    const task = await taskRes.json();

    await api('PUT', `/api/tree-state/${effort1.id}`, { isExpanded: true });
    await api('PUT', `/api/tree-state/${effort2.id}`, { isExpanded: true });
    await api('PUT', `/api/tree-state/${task.id}`, { isExpanded: true });

    // Delete effort1 (should cascade task, keep effort2)
    await api('DELETE', `/api/nodes/${effort1.id}`);

    const stateAfter = await (await api('GET', '/api/tree-state')).json();
    expect(stateAfter[effort1.id]).toBeUndefined();
    expect(stateAfter[task.id]).toBeUndefined();
    expect(stateAfter[effort2.id]).toBe(true); // sibling untouched
  });
});

describe('API Integration: Reindex after delete', () => {
  it('siblings have contiguous sortOrder after deleting middle node', async () => {
    const project = await createProject();
    await createEffort(project.id, 'E1');
    const e2 = await createEffort(project.id, 'E2');
    await createEffort(project.id, 'E3');

    await api('DELETE', `/api/nodes/${e2.id}`);

    const childrenRes = await api('GET', `/api/nodes/${project.id}/children`);
    const children = await childrenRes.json();
    expect(children).toHaveLength(2);
    expect(children[0].sortOrder).toBe(0);
    expect(children[1].sortOrder).toBe(1);
    expect(children[0].title).toBe('E1');
    expect(children[1].title).toBe('E3');
  });
});
