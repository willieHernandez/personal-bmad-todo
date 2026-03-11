import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../db/index.js', async () => {
  const { getTestDb } = await import('../db/test-db.js');
  return { db: getTestDb() };
});

import { clearTestDb } from '../db/test-db.js';
import { createNode, NotFoundError } from './node.service.js';
import {
  getExpandedStates,
  setExpandedState,
  bulkSetExpandedState,
} from './tree-state.service.js';

describe('tree-state.service', () => {
  beforeEach(() => {
    clearTestDb();
  });

  describe('getExpandedStates', () => {
    it('should return empty object when no states exist', async () => {
      const states = await getExpandedStates();
      expect(states).toEqual({});
    });

    it('should return correct map of node states', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });

      await setExpandedState(project.id, true);
      await setExpandedState(effort.id, false);

      const states = await getExpandedStates();
      expect(states[project.id]).toBe(true);
      expect(states[effort.id]).toBe(false);
    });
  });

  describe('setExpandedState', () => {
    it('should create a new state row', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await setExpandedState(project.id, false);

      const states = await getExpandedStates();
      expect(states[project.id]).toBe(false);
    });

    it('should update an existing state row', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await setExpandedState(project.id, true);
      await setExpandedState(project.id, false);

      const states = await getExpandedStates();
      expect(states[project.id]).toBe(false);
    });

    it('should throw NotFoundError for non-existent node', async () => {
      await expect(
        setExpandedState('00000000-0000-0000-0000-000000000000', true)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('bulkSetExpandedState', () => {
    it('should set multiple states at once', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      const effort = await createNode({ title: 'Effort', type: 'effort', parentId: project.id });
      const task = await createNode({ title: 'Task', type: 'task', parentId: effort.id });

      await bulkSetExpandedState([
        { nodeId: project.id, isExpanded: true },
        { nodeId: effort.id, isExpanded: false },
        { nodeId: task.id, isExpanded: true },
      ]);

      const states = await getExpandedStates();
      expect(states[project.id]).toBe(true);
      expect(states[effort.id]).toBe(false);
      expect(states[task.id]).toBe(true);
    });

    it('should handle empty array', async () => {
      await bulkSetExpandedState([]);
      const states = await getExpandedStates();
      expect(states).toEqual({});
    });
  });

  describe('cascade delete', () => {
    it('should remove tree_view_state when node is deleted', async () => {
      const project = await createNode({ title: 'Project', type: 'project' });
      await setExpandedState(project.id, true);

      // Import deleteNode to trigger cascade
      const { deleteNode } = await import('./node.service.js');
      await deleteNode(project.id);

      const states = await getExpandedStates();
      expect(states[project.id]).toBeUndefined();
    });
  });
});
