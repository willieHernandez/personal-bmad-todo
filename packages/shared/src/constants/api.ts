export const API_PREFIX = '/api';

export const API_ROUTES = {
  HEALTH: `${API_PREFIX}/health`,
  NODES: `${API_PREFIX}/nodes`,
  TREE_STATE: `${API_PREFIX}/tree-state`,
  INBOX: `${API_PREFIX}/inbox`,
  SESSION: `${API_PREFIX}/session`,
  SEARCH: `${API_PREFIX}/search`,
} as const;
