import { eq, and, isNull, asc, sql, max } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { nodes } from '../db/schema.js';
import { NodeType } from '@todo-bmad-style/shared';
import type { CreateNode, UpdateNode, MoveNode } from '@todo-bmad-style/shared';

const VALID_PARENT_TYPES: Record<string, string | null> = {
  [NodeType.PROJECT]: null,
  [NodeType.EFFORT]: NodeType.PROJECT,
  [NodeType.TASK]: NodeType.EFFORT,
  [NodeType.SUBTASK]: NodeType.TASK,
};

function validateHierarchy(nodeType: string, parentType: string | null): void {
  const requiredParentType = VALID_PARENT_TYPES[nodeType];

  if (nodeType === NodeType.PROJECT) {
    if (parentType !== null) {
      throw new HierarchyError('Projects must not have a parent');
    }
    return;
  }

  if (parentType === null) {
    throw new HierarchyError(`${nodeType} requires a parent`);
  }

  if (parentType !== requiredParentType) {
    throw new HierarchyError(
      `${nodeType} requires a ${requiredParentType} parent, got ${parentType}`
    );
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class HierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HierarchyError';
  }
}

export async function getProjects() {
  return db
    .select()
    .from(nodes)
    .where(and(isNull(nodes.parentId), eq(nodes.type, NodeType.PROJECT)));
}

export async function getNodeById(id: string) {
  const result = await db.select().from(nodes).where(eq(nodes.id, id));
  if (result.length === 0) {
    throw new NotFoundError(`Node not found: ${id}`);
  }
  return result[0];
}

export async function getChildren(parentId: string) {
  return db
    .select()
    .from(nodes)
    .where(eq(nodes.parentId, parentId))
    .orderBy(asc(nodes.sortOrder));
}

export async function createNode(data: CreateNode) {
  const now = new Date().toISOString();
  const id = randomUUID();

  if (data.type === NodeType.PROJECT) {
    if (data.parentId) {
      throw new HierarchyError('Projects must not have a parent');
    }
    validateHierarchy(data.type, null);
  } else {
    if (!data.parentId) {
      throw new HierarchyError(`${data.type} requires a parent`);
    }
    const parent = await getNodeById(data.parentId);
    validateHierarchy(data.type, parent.type);
  }

  const parentCondition = data.parentId
    ? eq(nodes.parentId, data.parentId)
    : isNull(nodes.parentId);

  let sortOrder: number;

  if (data.sortOrder !== undefined) {
    // Insert at requested position — shift siblings at or after this position
    sortOrder = data.sortOrder;

    const siblings = await db
      .select()
      .from(nodes)
      .where(parentCondition)
      .orderBy(asc(nodes.sortOrder));

    // Shift siblings at or after the insertion point
    for (const sibling of siblings) {
      if (sibling.sortOrder >= sortOrder) {
        await db
          .update(nodes)
          .set({ sortOrder: sibling.sortOrder + 1 })
          .where(eq(nodes.id, sibling.id));
      }
    }
  } else {
    // Append to end (default)
    const maxResult = await db
      .select({ maxOrder: max(nodes.sortOrder) })
      .from(nodes)
      .where(parentCondition);

    sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
  }

  const newNode = {
    id,
    title: data.title,
    type: data.type,
    parentId: data.parentId ?? null,
    sortOrder,
    isCompleted: false,
    markdownBody: '',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(nodes).values(newNode);
  return newNode;
}

export async function updateNode(id: string, data: UpdateNode) {
  const existing = await getNodeById(id);
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.title !== undefined) updates.title = data.title;
  if (data.markdownBody !== undefined) updates.markdownBody = data.markdownBody;

  await db.update(nodes).set(updates).where(eq(nodes.id, id));

  return {
    ...existing,
    ...updates,
  };
}

export async function deleteNode(id: string) {
  const existing = await getNodeById(id);
  const parentId = existing.parentId;

  db.run(sql`BEGIN IMMEDIATE`);
  try {
    await db.delete(nodes).where(eq(nodes.id, id));

    // Re-index siblings to close gaps
    if (parentId) {
      await reindexChildren(parentId);
    } else {
      await reindexRoots();
    }
    db.run(sql`COMMIT`);
  } catch (e) {
    db.run(sql`ROLLBACK`);
    throw e;
  }
}

export async function reorderNode(id: string, newSortOrder: number) {
  const node = await getNodeById(id);
  const now = new Date().toISOString();

  const parentCondition = node.parentId
    ? eq(nodes.parentId, node.parentId)
    : and(isNull(nodes.parentId), eq(nodes.type, NodeType.PROJECT));

  const siblings = await db
    .select()
    .from(nodes)
    .where(parentCondition)
    .orderBy(asc(nodes.sortOrder));

  // Remove target from list
  const filtered = siblings.filter((s) => s.id !== id);

  // Clamp position
  const insertAt = Math.min(newSortOrder, filtered.length);
  filtered.splice(insertAt, 0, node);

  // Re-assign contiguous indexes atomically
  db.run(sql`BEGIN IMMEDIATE`);
  try {
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].id === id) {
        await db.update(nodes).set({ sortOrder: i, updatedAt: now }).where(eq(nodes.id, id));
      } else if (filtered[i].sortOrder !== i) {
        await db.update(nodes).set({ sortOrder: i }).where(eq(nodes.id, filtered[i].id));
      }
    }
    db.run(sql`COMMIT`);
  } catch (e) {
    db.run(sql`ROLLBACK`);
    throw e;
  }

  return { ...node, sortOrder: insertAt, updatedAt: now };
}

export async function moveNode(id: string, newParentId: string, sortOrder: number, newType?: string) {
  const node = await getNodeById(id);
  const newParent = await getNodeById(newParentId);
  const effectiveType = newType ?? node.type;
  validateHierarchy(effectiveType, newParent.type);

  const oldParentId = node.parentId;
  const now = new Date().toISOString();

  db.run(sql`BEGIN IMMEDIATE`);
  try {
    // Update node's parent, sort order, and optionally type
    const updateFields: Record<string, unknown> = { parentId: newParentId, sortOrder, updatedAt: now };
    if (newType) {
      updateFields.type = newType;
    }
    await db
      .update(nodes)
      .set(updateFields)
      .where(eq(nodes.id, id));

    // Re-index old parent's children to close gaps
    if (oldParentId) {
      await reindexChildren(oldParentId);
    } else {
      await reindexRoots();
    }

    // Re-index new parent's children with target at specified position
    const newSiblings = await db
      .select()
      .from(nodes)
      .where(eq(nodes.parentId, newParentId))
      .orderBy(asc(nodes.sortOrder));

    // Remove target, re-insert at position, re-index
    const filtered = newSiblings.filter((s) => s.id !== id);
    const insertAt = Math.min(sortOrder, filtered.length);
    const movedNode = { ...node, parentId: newParentId, sortOrder: insertAt, updatedAt: now };
    filtered.splice(insertAt, 0, movedNode);

    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].sortOrder !== i) {
        await db.update(nodes).set({ sortOrder: i }).where(eq(nodes.id, filtered[i].id));
      }
    }

    db.run(sql`COMMIT`);
  } catch (e) {
    db.run(sql`ROLLBACK`);
    throw e;
  }

  return await getNodeById(id);
}

export async function getNodeAncestors(id: string) {
  const ancestors = [];
  let current = await getNodeById(id);
  ancestors.unshift(current);

  while (current.parentId) {
    current = await getNodeById(current.parentId);
    ancestors.unshift(current);
  }

  return ancestors;
}

export async function toggleNodeCompletion(id: string) {
  const node = await getNodeById(id);
  const newState = !node.isCompleted;
  const now = new Date().toISOString();
  const affectedNodes: Array<{ id: string; isCompleted: boolean }> = [];

  db.run(sql`BEGIN IMMEDIATE`);
  try {
    // Update the toggled node
    await db.update(nodes).set({ isCompleted: newState, updatedAt: now }).where(eq(nodes.id, id));
    affectedNodes.push({ id, isCompleted: newState });

    // Cascade down — set all descendants to the same state
    async function cascadeDown(parentId: string) {
      const children = await getChildren(parentId);
      for (const child of children) {
        if (child.isCompleted !== newState) {
          await db.update(nodes).set({ isCompleted: newState, updatedAt: now }).where(eq(nodes.id, child.id));
          affectedNodes.push({ id: child.id, isCompleted: newState });
        }
        await cascadeDown(child.id);
      }
    }
    await cascadeDown(id);

    // Cascade up — track the last affected child so the sibling check
    // is correct at every cascade level, not just the first
    let lastAffectedChildId = id;
    let currentParentId = node.parentId;
    while (currentParentId) {
      const parent = await getNodeById(currentParentId);

      if (newState) {
        // Completing: check if all children of this parent are now complete
        const children = await getChildren(currentParentId);
        const allComplete = children.every((c) => c.id === lastAffectedChildId ? true : c.isCompleted);
        if (!allComplete) break;

        await db.update(nodes).set({ isCompleted: true, updatedAt: now }).where(eq(nodes.id, currentParentId));
        affectedNodes.push({ id: currentParentId, isCompleted: true });
      } else {
        // Reopening: if parent was completed, reopen it
        if (!parent.isCompleted) break;

        await db.update(nodes).set({ isCompleted: false, updatedAt: now }).where(eq(nodes.id, currentParentId));
        affectedNodes.push({ id: currentParentId, isCompleted: false });
      }

      lastAffectedChildId = currentParentId;
      currentParentId = parent.parentId;
    }

    db.run(sql`COMMIT`);
  } catch (e) {
    db.run(sql`ROLLBACK`);
    throw e;
  }

  return { affectedNodes };
}

async function reindexChildren(parentId: string) {
  const children = await db
    .select()
    .from(nodes)
    .where(eq(nodes.parentId, parentId))
    .orderBy(asc(nodes.sortOrder));

  for (let i = 0; i < children.length; i++) {
    if (children[i].sortOrder !== i) {
      await db.update(nodes).set({ sortOrder: i }).where(eq(nodes.id, children[i].id));
    }
  }
}

async function reindexRoots() {
  const roots = await db
    .select()
    .from(nodes)
    .where(and(isNull(nodes.parentId), eq(nodes.type, NodeType.PROJECT)))
    .orderBy(asc(nodes.sortOrder));

  for (let i = 0; i < roots.length; i++) {
    if (roots[i].sortOrder !== i) {
      await db.update(nodes).set({ sortOrder: i }).where(eq(nodes.id, roots[i].id));
    }
  }
}
