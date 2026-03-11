import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { treeViewState, nodes } from '../db/schema.js';
import { NotFoundError } from './node.service.js';

export async function getExpandedStates(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(treeViewState);
  const result: Record<string, boolean> = {};
  for (const row of rows) {
    result[row.nodeId] = row.isExpanded;
  }
  return result;
}

export async function setExpandedState(nodeId: string, isExpanded: boolean): Promise<void> {
  // Verify node exists
  const node = await db.select().from(nodes).where(eq(nodes.id, nodeId));
  if (node.length === 0) {
    throw new NotFoundError(`Node not found: ${nodeId}`);
  }

  await db
    .insert(treeViewState)
    .values({ nodeId, isExpanded })
    .onConflictDoUpdate({
      target: treeViewState.nodeId,
      set: { isExpanded },
    });
}

export async function bulkSetExpandedState(
  states: Array<{ nodeId: string; isExpanded: boolean }>
): Promise<void> {
  if (states.length === 0) return;

  // Validate all nodes exist before writing any state (atomic guarantee)
  const nodeIds = states.map((s) => s.nodeId);
  const existingNodes = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(inArray(nodes.id, nodeIds));

  const existingIds = new Set(existingNodes.map((n) => n.id));
  for (const nodeId of nodeIds) {
    if (!existingIds.has(nodeId)) {
      throw new NotFoundError(`Node not found: ${nodeId}`);
    }
  }

  // All nodes validated — perform all upserts
  for (const { nodeId, isExpanded } of states) {
    await db
      .insert(treeViewState)
      .values({ nodeId, isExpanded })
      .onConflictDoUpdate({
        target: treeViewState.nodeId,
        set: { isExpanded },
      });
  }
}
