export const MAX_DEPTH = 4;

export const NodeType = {
  PROJECT: 'project',
  EFFORT: 'effort',
  TASK: 'task',
  SUBTASK: 'subtask',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];
