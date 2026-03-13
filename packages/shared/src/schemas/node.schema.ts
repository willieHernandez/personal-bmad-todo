import { z } from 'zod';
import { NodeType } from '../constants/hierarchy.js';

export const createNodeSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum([NodeType.PROJECT, NodeType.EFFORT, NodeType.TASK, NodeType.SUBTASK]),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

export const updateNodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  markdownBody: z.string().max(100_000).optional(),
}).refine((data) => data.title !== undefined || data.markdownBody !== undefined, {
  message: 'At least one of title or markdownBody must be provided',
});

export const moveNodeSchema = z.object({
  newParentId: z.string().uuid(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  newType: z.enum([NodeType.PROJECT, NodeType.EFFORT, NodeType.TASK, NodeType.SUBTASK]).optional(),
});

export const reorderNodeSchema = z.object({
  sortOrder: z.number().int().min(0).max(1_000_000),
});

export const toggleCompletionResponseSchema = z.object({
  affectedNodes: z.array(z.object({
    id: z.string().uuid(),
    isCompleted: z.boolean(),
  })),
});

export const nodeResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum([NodeType.PROJECT, NodeType.EFFORT, NodeType.TASK, NodeType.SUBTASK]),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
  isCompleted: z.boolean(),
  markdownBody: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
