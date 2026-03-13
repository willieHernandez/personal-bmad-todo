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
  getNodeAncestors,
  createNode,
  updateNode,
  deleteNode,
  reorderNode,
  moveNode,
  toggleNodeCompletion,
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

    it('should insert at specified sortOrder and shift siblings down', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });
      await createNode({ title: 'E2', type: 'effort', parentId: project.id });
      await createNode({ title: 'E3', type: 'effort', parentId: project.id });

      // Insert at position 1 (between E1 and E2)
      const inserted = await createNode({ title: 'E-New', type: 'effort', parentId: project.id, sortOrder: 1 });
      expect(inserted.sortOrder).toBe(1);

      const children = await getChildren(project.id);
      expect(children).toHaveLength(4);
      expect(children[0].title).toBe('E1');
      expect(children[0].sortOrder).toBe(0);
      expect(children[1].title).toBe('E-New');
      expect(children[1].sortOrder).toBe(1);
      expect(children[2].title).toBe('E2');
      expect(children[2].sortOrder).toBe(2);
      expect(children[3].title).toBe('E3');
      expect(children[3].sortOrder).toBe(3);
    });

    it('should insert at beginning when sortOrder is 0', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });
      await createNode({ title: 'E2', type: 'effort', parentId: project.id });

      const inserted = await createNode({ title: 'E-First', type: 'effort', parentId: project.id, sortOrder: 0 });
      expect(inserted.sortOrder).toBe(0);

      const children = await getChildren(project.id);
      expect(children).toHaveLength(3);
      expect(children[0].title).toBe('E-First');
      expect(children[1].title).toBe('E1');
      expect(children[2].title).toBe('E2');
    });

    it('should append to end when sortOrder exceeds sibling count', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });

      const inserted = await createNode({ title: 'E-End', type: 'effort', parentId: project.id, sortOrder: 99 });
      expect(inserted.sortOrder).toBe(99);

      const children = await getChildren(project.id);
      expect(children).toHaveLength(2);
      expect(children[0].title).toBe('E1');
      expect(children[1].title).toBe('E-End');
    });

    it('should append to end when sortOrder is omitted', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await createNode({ title: 'E1', type: 'effort', parentId: project.id });
      await createNode({ title: 'E2', type: 'effort', parentId: project.id });

      // No sortOrder — should append
      const appended = await createNode({ title: 'E-Last', type: 'effort', parentId: project.id });
      expect(appended.sortOrder).toBe(2);

      const children = await getChildren(project.id);
      expect(children[2].title).toBe('E-Last');
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

  describe('getNodeAncestors', () => {
    it('should return single-item array for project nodes', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const ancestors = await getNodeAncestors(project.id);
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe(project.id);
    });

    it('should return full ancestor chain from root to node', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const subtask = await createNode({ title: 'Subtask', type: 'subtask', parentId: task.id });

      const ancestors = await getNodeAncestors(subtask.id);
      expect(ancestors).toHaveLength(4);
      expect(ancestors[0].id).toBe(project.id);
      expect(ancestors[1].id).toBe(effort.id);
      expect(ancestors[2].id).toBe(task.id);
      expect(ancestors[3].id).toBe(subtask.id);
    });

    it('should return 404 for non-existent node', async () => {
      await expect(
        getNodeAncestors('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
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

  describe('toggleNodeCompletion', () => {
    it('should toggle a single node with no children', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });

      const result = await toggleNodeCompletion(project.id);
      expect(result.affectedNodes).toHaveLength(1);
      expect(result.affectedNodes[0]).toEqual({ id: project.id, isCompleted: true });

      const updated = await getNodeById(project.id);
      expect(updated.isCompleted).toBe(true);
    });

    it('should reopen a completed node', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await toggleNodeCompletion(project.id); // complete

      const result = await toggleNodeCompletion(project.id); // reopen
      expect(result.affectedNodes).toHaveLength(1);
      expect(result.affectedNodes[0]).toEqual({ id: project.id, isCompleted: false });
    });

    it('should cascade up when all children complete', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      const t2 = await createNode({ title: 'T2', type: 'task', parentId: effort.id });
      const t3 = await createNode({ title: 'T3', type: 'task', parentId: effort.id });

      await toggleNodeCompletion(t1.id);
      await toggleNodeCompletion(t2.id);

      // Complete last task — effort auto-completes, then project (sole child) auto-completes
      const result = await toggleNodeCompletion(t3.id);
      expect(result.affectedNodes).toHaveLength(3);
      expect(result.affectedNodes[0]).toEqual({ id: t3.id, isCompleted: true });
      expect(result.affectedNodes[1]).toEqual({ id: effort.id, isCompleted: true });
      expect(result.affectedNodes[2]).toEqual({ id: project.id, isCompleted: true });

      const updatedEffort = await getNodeById(effort.id);
      expect(updatedEffort.isCompleted).toBe(true);
    });

    it('should cascade up multi-level when all descendants complete', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const s1 = await createNode({ title: 'S1', type: 'subtask', parentId: task.id });
      const s2 = await createNode({ title: 'S2', type: 'subtask', parentId: task.id });

      await toggleNodeCompletion(s1.id);

      // Complete last subtask — task, effort, project should all cascade
      const result = await toggleNodeCompletion(s2.id);
      expect(result.affectedNodes).toHaveLength(4);
      expect(result.affectedNodes.map((n) => n.id)).toEqual([s2.id, task.id, effort.id, project.id]);
      expect(result.affectedNodes.every((n) => n.isCompleted)).toBe(true);
    });

    it('should cascade reopen when child reopened', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      const t2 = await createNode({ title: 'T2', type: 'task', parentId: effort.id });

      // Complete all to auto-complete effort
      await toggleNodeCompletion(t1.id);
      await toggleNodeCompletion(t2.id);
      expect((await getNodeById(effort.id)).isCompleted).toBe(true);

      // Reopen one child — effort and project should reopen (cascade up)
      const result = await toggleNodeCompletion(t1.id);
      expect(result.affectedNodes).toHaveLength(3);
      expect(result.affectedNodes[0]).toEqual({ id: t1.id, isCompleted: false });
      expect(result.affectedNodes[1]).toEqual({ id: effort.id, isCompleted: false });
      expect(result.affectedNodes[2]).toEqual({ id: project.id, isCompleted: false });
    });

    it('should cascade reopen multi-level', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const subtask = await createNode({ title: 'Subtask', type: 'subtask', parentId: task.id });

      // Complete subtask → cascades all the way up
      await toggleNodeCompletion(subtask.id);
      expect((await getNodeById(project.id)).isCompleted).toBe(true);

      // Reopen subtask → cascades reopen all the way up
      const result = await toggleNodeCompletion(subtask.id);
      expect(result.affectedNodes).toHaveLength(4);
      expect(result.affectedNodes.every((n) => !n.isCompleted)).toBe(true);
    });

    it('should cascade down when parent directly reopened', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      const t2 = await createNode({ title: 'T2', type: 'task', parentId: effort.id });

      // Complete all children → effort auto-completes
      await toggleNodeCompletion(t1.id);
      await toggleNodeCompletion(t2.id);

      // Reopen effort directly — children should also reopen (cascade down)
      const result = await toggleNodeCompletion(effort.id);
      expect((await getNodeById(effort.id)).isCompleted).toBe(false);
      expect((await getNodeById(t1.id)).isCompleted).toBe(false);
      expect((await getNodeById(t2.id)).isCompleted).toBe(false);
      // affected: effort + t1 + t2 + project (cascade up)
      const affectedIds = result.affectedNodes.map((n) => n.id);
      expect(affectedIds).toContain(effort.id);
      expect(affectedIds).toContain(t1.id);
      expect(affectedIds).toContain(t2.id);
    });

    it('should cascade down when completing a parent with incomplete children', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      const t2 = await createNode({ title: 'T2', type: 'task', parentId: effort.id });
      const t3 = await createNode({ title: 'T3', type: 'task', parentId: effort.id });

      // Complete effort directly — all children should cascade to complete
      const result = await toggleNodeCompletion(effort.id);
      expect((await getNodeById(effort.id)).isCompleted).toBe(true);
      expect((await getNodeById(t1.id)).isCompleted).toBe(true);
      expect((await getNodeById(t2.id)).isCompleted).toBe(true);
      expect((await getNodeById(t3.id)).isCompleted).toBe(true);

      const affectedIds = result.affectedNodes.map((n) => n.id);
      expect(affectedIds).toContain(effort.id);
      expect(affectedIds).toContain(t1.id);
      expect(affectedIds).toContain(t2.id);
      expect(affectedIds).toContain(t3.id);
    });

    it('should cascade down multi-level when completing a parent', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });
      const subtask = await createNode({ title: 'Subtask', type: 'subtask', parentId: task.id });

      // Complete effort — task and subtask should all cascade down
      await toggleNodeCompletion(effort.id);
      expect((await getNodeById(effort.id)).isCompleted).toBe(true);
      expect((await getNodeById(task.id)).isCompleted).toBe(true);
      expect((await getNodeById(subtask.id)).isCompleted).toBe(true);
    });

    it('should skip already-matching children during downward cascade', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      const t2 = await createNode({ title: 'T2', type: 'task', parentId: effort.id });

      // Complete t1 first
      await toggleNodeCompletion(t1.id);

      // Now complete effort — t1 is already complete so only t2 should be in affectedNodes as cascade-down
      const result = await toggleNodeCompletion(effort.id);
      const affectedIds = result.affectedNodes.map((n) => n.id);
      expect(affectedIds).toContain(effort.id);
      expect(affectedIds).toContain(t2.id);
      // t1 was already complete, should NOT be in affectedNodes
      expect(affectedIds).not.toContain(t1.id);
    });

    it('should not cascade when siblings still incomplete', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const t1 = await createNode({ title: 'T1', type: 'task', parentId: effort.id });
      await createNode({ title: 'T2', type: 'task', parentId: effort.id });
      await createNode({ title: 'T3', type: 'task', parentId: effort.id });

      // Complete one of three — effort should NOT complete
      const result = await toggleNodeCompletion(t1.id);
      expect(result.affectedNodes).toHaveLength(1);
      expect((await getNodeById(effort.id)).isCompleted).toBe(false);
    });

    it('should throw NotFoundError for non-existent node', async () => {
      await expect(
        toggleNodeCompletion('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
