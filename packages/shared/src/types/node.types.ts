import type { z } from 'zod';
import type {
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  reorderNodeSchema,
  toggleCompletionResponseSchema,
  nodeResponseSchema,
} from '../schemas/node.schema.js';

export type CreateNode = z.infer<typeof createNodeSchema>;
export type UpdateNode = z.infer<typeof updateNodeSchema>;
export type MoveNode = z.infer<typeof moveNodeSchema>;
export type ReorderNode = z.infer<typeof reorderNodeSchema>;
export type ToggleCompletionResponse = z.infer<typeof toggleCompletionResponseSchema>;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;
