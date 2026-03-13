export const MAX_DEPTH = 4;

export const NodeType = {
  PROJECT: 'project',
  EFFORT: 'effort',
  TASK: 'task',
  SUBTASK: 'subtask',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export const VALID_CHILD_TYPES: Partial<Record<string, NodeType>> = {
  project: 'effort',
  effort: 'task',
  task: 'subtask',
};
