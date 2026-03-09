import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
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
} from './node.service.js';

describe('node.service', () => {
  beforeEach(() => {
    clearTestDb();
  });

  describe('createNode', () => {
    it('should create a project with no parent', async () => {
      const node = await createNode({ title: 'My Project', type: 'project' });
      expect(node.title).toBe('My Project');
      expect(node.type).toBe('project');
      expect(node.parentId).toBeNull();
      expect(node.sortOrder).toBe(0);
      expect(node.id).toBeDefined();
      expect(node.createdAt).toBeDefined();
    });

    it('should create an effort under a project', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      expect(effort.parentId).toBe(project.id);
      expect(effort.type).toBe('effort');
    });

    it('should create a task under an effort', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      expect(task.parentId).toBe(effort.id);
      expect(task.type).toBe('task');
    });

    it('should create a subtask under a task', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const subtask = await createNode({ title: 'Subtask', type: 'subtask', parentId: task.id });
      expect(subtask.parentId).toBe(task.id);
      expect(subtask.type).toBe('subtask');
    });

    it('should reject effort without project parent', async () => {
      await expect(
        createNode({ title: 'Effort', type: 'effort' })
      ).rejects.toThrow(HierarchyError);
    });

    it('should reject task without effort parent', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await expect(
        createNode({ title: 'Task', type: 'task', parentId: project.id })
      ).rejects.toThrow(HierarchyError);
    });

    it('should reject subtask without task parent', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      await expect(
        createNode({ title: 'Subtask', type: 'subtask', parentId: effort.id })
      ).rejects.toThrow(HierarchyError);
    });

    it('should reject project with a parent', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await expect(
        createNode({ title: 'Project2', type: 'project', parentId: project.id })
      ).rejects.toThrow(HierarchyError);
    });

    it('should auto-increment sort_order among siblings', async () => {
      const p1 = await createNode({ title: 'P1', type: 'project' });
      const p2 = await createNode({ title: 'P2', type: 'project' });
      const p3 = await createNode({ title: 'P3', type: 'project' });
      expect(p1.sortOrder).toBe(0);
      expect(p2.sortOrder).toBe(1);
      expect(p3.sortOrder).toBe(2);
    });
  });

  describe('getProjects', () => {
    it('should return all root projects', async () => {
      await createNode({ title: 'P1', type: 'project' });
      await createNode({ title: 'P2', type: 'project' });
      const projects = await getProjects();
      expect(projects).toHaveLength(2);
    });

    it('should return empty array when no projects exist', async () => {
      const projects = await getProjects();
      expect(projects).toHaveLength(0);
    });
  });

  describe('getNodeById', () => {
    it('should return a node by ID', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const found = await getNodeById(project.id);
      expect(found.id).toBe(project.id);
      expect(found.title).toBe('Project');
    });

    it('should throw NotFoundError for missing node', async () => {
      await expect(
        getNodeById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getChildren', () => {
    it('should return children sorted by sort_order', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });
      await createNode({ title: 'E2', type: 'effort', parentId: project.id });
      await createNode({ title: 'E3', type: 'effort', parentId: project.id });
      const children = await getChildren(project.id);
      expect(children).toHaveLength(3);
      expect(children[0].title).toBe('E1');
      expect(children[1].title).toBe('E2');
      expect(children[2].title).toBe('E3');
    });
  });

  describe('updateNode', () => {
    it('should update title', async () => {
      const project = await createNode({ title: 'Old', type: 'project' });
      const updated = await updateNode(project.id, { title: 'New' });
      expect(updated.title).toBe('New');
    });

    it('should update markdownBody', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const updated = await updateNode(project.id, { markdownBody: '# Hello' });
      expect(updated.markdownBody).toBe('# Hello');
    });
  });

  describe('deleteNode', () => {
    it('should delete a node', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await deleteNode(project.id);
      await expect(getNodeById(project.id)).rejects.toThrow(NotFoundError);
    });

    it('should cascade delete all descendants', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const subtask = await createNode({ title: 'Subtask', type: 'subtask', parentId: task.id });

      await deleteNode(project.id);
      await expect(getNodeById(effort.id)).rejects.toThrow(NotFoundError);
      await expect(getNodeById(task.id)).rejects.toThrow(NotFoundError);
      await expect(getNodeById(subtask.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for missing node', async () => {
      await expect(
        deleteNode('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('reorderNode', () => {
    it('should reorder siblings and maintain contiguous sort_order', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });
      await createNode({ title: 'E2', type: 'effort', parentId: project.id });
      const e3 = await createNode({ title: 'E3', type: 'effort', parentId: project.id });

      await reorderNode(e3.id, 0);

      const children = await getChildren(project.id);
      expect(children[0].title).toBe('E3');
      expect(children[1].title).toBe('E1');
      expect(children[2].title).toBe('E2');
      expect(children[0].sortOrder).toBe(0);
      expect(children[1].sortOrder).toBe(1);
      expect(children[2].sortOrder).toBe(2);
    });
  });

  describe('moveNode', () => {
    it('should move an effort to another project', async () => {
      const p1 = await createNode({ title: 'P1', type: 'project' });
      const p2 = await createNode({ title: 'P2', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: p1.id });

      const moved = await moveNode(effort.id, p2.id, 0);
      expect(moved.parentId).toBe(p2.id);

      const p1Children = await getChildren(p1.id);
      expect(p1Children).toHaveLength(0);

      const p2Children = await getChildren(p2.id);
      expect(p2Children).toHaveLength(1);
      expect(p2Children[0].title).toBe('Effort');
    });

    it('should reject invalid hierarchy move', async () => {
      const p1 = await createNode({ title: 'P1', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: p1.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });

      await expect(
        moveNode(task.id, p1.id, 0)
      ).rejects.toThrow(HierarchyError);
    });

    it('should fix sort_order gaps in both old and new parent', async () => {
      const p1 = await createNode({ title: 'P1', type: 'project' });
      const p2 = await createNode({ title: 'P2', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: p1.id });
      const e2 = await createNode({ title: 'E2', type: 'effort', parentId: p1.id });
      await createNode({ title: 'E3', type: 'effort', parentId: p1.id });
      await createNode({ title: 'E4', type: 'effort', parentId: p2.id });

      await moveNode(e2.id, p2.id, 1);

      const p1Children = await getChildren(p1.id);
      expect(p1Children).toHaveLength(2);
      expect(p1Children[0].sortOrder).toBe(0);
      expect(p1Children[1].sortOrder).toBe(1);

      const p2Children = await getChildren(p2.id);
      expect(p2Children).toHaveLength(2);
      expect(p2Children[0].sortOrder).toBe(0);
      expect(p2Children[1].sortOrder).toBe(1);
    });
  });
});
