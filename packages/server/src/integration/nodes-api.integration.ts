import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
import { buildServer } from '../server.js';
import { nodeResponseSchema } from '@todo-bmad-style/shared';

const PORT = 3002;
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

describe('API Integration: Health', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await api('GET', '/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: 'ok', db: 'connected' });
  });
});

describe('API Integration: Nodes CRUD', () => {
  it('GET /api/nodes returns 200 with empty array', async () => {
    const res = await api('GET', '/api/nodes');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('POST /api/nodes creates a project with valid response schema', async () => {
    const res = await api('POST', '/api/nodes', { title: 'Test Project', type: 'project' });
    expect(res.status).toBe(201);
    const json = await res.json();
    const parsed = nodeResponseSchema.parse(json);
    expect(parsed.title).toBe('Test Project');
    expect(parsed.type).toBe('project');
    expect(parsed.parentId).toBeNull();
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.isCompleted).toBe(false);
  });

  it('GET /api/nodes/:id returns the created node', async () => {
    const createRes = await api('POST', '/api/nodes', { title: 'My Project', type: 'project' });
    const created = await createRes.json();

    const res = await api('GET', `/api/nodes/${created.id}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    nodeResponseSchema.parse(json);
    expect(json.id).toBe(created.id);
    expect(json.title).toBe('My Project');
  });

  it('GET /api/nodes returns only root projects (not efforts)', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'Root Project', type: 'project' });
    const project = await projectRes.json();
    await api('POST', '/api/nodes', { title: 'Child Effort', type: 'effort', parentId: project.id });

    const res = await api('GET', '/api/nodes');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].title).toBe('Root Project');
  });

  it('PATCH /api/nodes/:id updates title and updatedAt', async () => {
    const createRes = await api('POST', '/api/nodes', { title: 'Original', type: 'project' });
    const created = await createRes.json();

    const res = await api('PATCH', `/api/nodes/${created.id}`, { title: 'Updated' });
    expect(res.status).toBe(200);
    const json = await res.json();
    nodeResponseSchema.parse(json);
    expect(json.title).toBe('Updated');
    expect(json.updatedAt).not.toBe(created.updatedAt);
  });

  it('PATCH /api/nodes/:id updates markdownBody', async () => {
    const createRes = await api('POST', '/api/nodes', { title: 'Project', type: 'project' });
    const created = await createRes.json();

    const res = await api('PATCH', `/api/nodes/${created.id}`, { markdownBody: '# Hello' });
    expect(res.status).toBe(200);
    const json = await res.json();
    nodeResponseSchema.parse(json);
    expect(json.markdownBody).toBe('# Hello');
  });

  it('DELETE /api/nodes/:id returns 204', async () => {
    const createRes = await api('POST', '/api/nodes', { title: 'To Delete', type: 'project' });
    const created = await createRes.json();

    const res = await api('DELETE', `/api/nodes/${created.id}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/nodes/:id after delete returns 404 with error shape', async () => {
    const createRes = await api('POST', '/api/nodes', { title: 'Gone', type: 'project' });
    const created = await createRes.json();
    await api('DELETE', `/api/nodes/${created.id}`);

    const res = await api('GET', `/api/nodes/${created.id}`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.statusCode).toBe(404);
    expect(json.error).toEqual(expect.any(String));
    expect(json.message).toEqual(expect.any(String));
  });
});

describe('API Integration: Hierarchy & Children', () => {
  it('creates full hierarchy: project -> effort -> task -> subtask', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    nodeResponseSchema.parse(project);

    const effortRes = await api('POST', '/api/nodes', { title: 'E', type: 'effort', parentId: project.id });
    const effort = await effortRes.json();
    expect(effortRes.status).toBe(201);
    nodeResponseSchema.parse(effort);
    expect(effort.parentId).toBe(project.id);

    const taskRes = await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: effort.id });
    const task = await taskRes.json();
    expect(taskRes.status).toBe(201);
    nodeResponseSchema.parse(task);

    const subtaskRes = await api('POST', '/api/nodes', { title: 'S', type: 'subtask', parentId: task.id });
    expect(subtaskRes.status).toBe(201);
    nodeResponseSchema.parse(await subtaskRes.json());
  });

  it('GET /api/nodes/:id/children returns 3 sorted children', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    await api('POST', '/api/nodes', { title: 'E1', type: 'effort', parentId: project.id });
    await api('POST', '/api/nodes', { title: 'E2', type: 'effort', parentId: project.id });
    await api('POST', '/api/nodes', { title: 'E3', type: 'effort', parentId: project.id });

    const res = await api('GET', `/api/nodes/${project.id}/children`);
    expect(res.status).toBe(200);
    const children = await res.json();
    expect(children).toHaveLength(3);
    expect(children[0].sortOrder).toBe(0);
    expect(children[1].sortOrder).toBe(1);
    expect(children[2].sortOrder).toBe(2);
  });

  it('GET /api/nodes/:id/children for effort returns tasks', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    const effortRes = await api('POST', '/api/nodes', { title: 'E', type: 'effort', parentId: project.id });
    const effort = await effortRes.json();
    await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: effort.id });

    const res = await api('GET', `/api/nodes/${effort.id}/children`);
    expect(res.status).toBe(200);
    const children = await res.json();
    expect(children).toHaveLength(1);
  });

  it('GET /api/nodes/:id/children returns 404 for non-existent parent', async () => {
    const res = await api('GET', '/api/nodes/00000000-0000-0000-0000-000000000000/children');
    expect(res.status).toBe(404);
  });

  it('POST effort with no parent returns 400', async () => {
    const res = await api('POST', '/api/nodes', { title: 'Effort', type: 'effort' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.statusCode).toBe(400);
    expect(json.message).toEqual(expect.any(String));
  });

  it('POST task under project (wrong parent type) returns 400', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();

    const res = await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: project.id });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.statusCode).toBe(400);
    expect(json.message).toEqual(expect.any(String));
  });

  it('POST with empty title returns 400 with error shape', async () => {
    const res = await api('POST', '/api/nodes', { title: '', type: 'project' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.statusCode).toBe(400);
    expect(json.message).toEqual(expect.any(String));
  });

  it('PATCH with empty body returns 400 with error shape', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();

    const res = await api('PATCH', `/api/nodes/${project.id}`, {});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.statusCode).toBe(400);
    expect(json.message).toEqual(expect.any(String));
  });

  it('GET /api/nodes/not-a-uuid returns 400 with error shape', async () => {
    const res = await api('GET', '/api/nodes/not-a-uuid');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.statusCode).toBe(400);
    expect(json.message).toEqual(expect.any(String));
  });

  it('validates error responses have correct shape', async () => {
    const res = await api('GET', '/api/nodes/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('statusCode', 404);
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('message');
  });
});

describe('API Integration: Cascade Delete', () => {
  it('deleting a project cascades to all descendants', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    const effortRes = await api('POST', '/api/nodes', { title: 'E', type: 'effort', parentId: project.id });
    const effort = await effortRes.json();
    const taskRes = await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: effort.id });
    const task = await taskRes.json();
    const subtaskRes = await api('POST', '/api/nodes', { title: 'S', type: 'subtask', parentId: task.id });
    const subtask = await subtaskRes.json();

    const deleteRes = await api('DELETE', `/api/nodes/${project.id}`);
    expect(deleteRes.status).toBe(204);

    const effortGet = await api('GET', `/api/nodes/${effort.id}`);
    expect(effortGet.status).toBe(404);

    const taskGet = await api('GET', `/api/nodes/${task.id}`);
    expect(taskGet.status).toBe(404);

    const subtaskGet = await api('GET', `/api/nodes/${subtask.id}`);
    expect(subtaskGet.status).toBe(404);
  });
});

describe('API Integration: Reorder', () => {
  it('reorders efforts within a project', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    await api('POST', '/api/nodes', { title: 'E1', type: 'effort', parentId: project.id });
    await api('POST', '/api/nodes', { title: 'E2', type: 'effort', parentId: project.id });
    const e3Res = await api('POST', '/api/nodes', { title: 'E3', type: 'effort', parentId: project.id });
    const e3 = await e3Res.json();

    const reorderRes = await api('PATCH', `/api/nodes/${e3.id}/reorder`, { sortOrder: 0 });
    expect(reorderRes.status).toBe(200);
    nodeResponseSchema.parse(await reorderRes.json());

    const childrenRes = await api('GET', `/api/nodes/${project.id}/children`);
    const children = await childrenRes.json();
    expect(children[0].title).toBe('E3');
    expect(children[1].title).toBe('E1');
    expect(children[2].title).toBe('E2');
    expect(children[0].sortOrder).toBe(0);
    expect(children[1].sortOrder).toBe(1);
    expect(children[2].sortOrder).toBe(2);
  });
});

describe('API Integration: Move', () => {
  it('moves an effort from one project to another', async () => {
    const p1Res = await api('POST', '/api/nodes', { title: 'P1', type: 'project' });
    const p1 = await p1Res.json();
    const p2Res = await api('POST', '/api/nodes', { title: 'P2', type: 'project' });
    const p2 = await p2Res.json();
    const effortRes = await api('POST', '/api/nodes', { title: 'E', type: 'effort', parentId: p1.id });
    const effort = await effortRes.json();

    const moveRes = await api('PATCH', `/api/nodes/${effort.id}/move`, { newParentId: p2.id, sortOrder: 0 });
    expect(moveRes.status).toBe(200);
    const moved = await moveRes.json();
    nodeResponseSchema.parse(moved);
    expect(moved.parentId).toBe(p2.id);

    const p1Children = await api('GET', `/api/nodes/${p1.id}/children`);
    const p1Kids = await p1Children.json();
    expect(p1Kids).toHaveLength(0);

    const p2Children = await api('GET', `/api/nodes/${p2.id}/children`);
    const p2Kids = await p2Children.json();
    expect(p2Kids).toHaveLength(1);
    expect(p2Kids[0].id).toBe(effort.id);
  });

  it('rejects moving task under project (invalid hierarchy)', async () => {
    const projectRes = await api('POST', '/api/nodes', { title: 'P', type: 'project' });
    const project = await projectRes.json();
    const effortRes = await api('POST', '/api/nodes', { title: 'E', type: 'effort', parentId: project.id });
    const effort = await effortRes.json();
    const taskRes = await api('POST', '/api/nodes', { title: 'T', type: 'task', parentId: effort.id });
    const task = await taskRes.json();

    const moveRes = await api('PATCH', `/api/nodes/${task.id}/move`, { newParentId: project.id, sortOrder: 0 });
    expect(moveRes.status).toBe(400);
  });
});
