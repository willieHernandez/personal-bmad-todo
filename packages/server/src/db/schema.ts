import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const nodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => nodes.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  markdownBody: text('markdown_body').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_nodes_parent_id').on(table.parentId),
  index('idx_nodes_type').on(table.type),
]);

export const treeViewState = sqliteTable('tree_view_state', {
  nodeId: text('node_id').primaryKey().references(() => nodes.id, { onDelete: 'cascade' }),
  isExpanded: integer('is_expanded', { mode: 'boolean' }).notNull().default(true),
});
