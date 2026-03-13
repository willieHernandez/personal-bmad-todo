import { z } from 'zod';

export const treeStateSchema = z.object({
  isExpanded: z.boolean(),
});

export const bulkTreeStateSchema = z.object({
  states: z.array(z.object({
    nodeId: z.string().uuid(),
    isExpanded: z.boolean(),
  })).max(10_000),
});
