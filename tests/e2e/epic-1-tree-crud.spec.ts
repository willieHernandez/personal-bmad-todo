import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  getTreeItems,
  getTreeItemByText,
  waitForTreeItem,
} from './helpers';

test.describe('Epic 1 - Story 1.4: Tree View & Hierarchy Creation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('displays empty state when project has no efforts', async ({ page }) => {
    await createProjectViaAPI(page, 'Empty Project');
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    await selectProjectInSidebar(page, 'Empty Project');

    // Should show the empty state with "Add effort" button
    await expect(page.getByText('No efforts yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add effort' })).toBeVisible();
  });

  test('create first effort via "Add effort" button', async ({ page }) => {
    await createProjectViaAPI(page, 'My Project');
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    await selectProjectInSidebar(page, 'My Project');
    await page.getByRole('button', { name: 'Add effort' }).click();

    // An inline input should appear
    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();

    // Type a name and confirm
    await input.fill('Planning Phase');
    await input.press('Enter');

    // The effort should appear in the tree
    await waitForTreeItem(page, 'Planning Phase');
  });

  test('displays full hierarchy: effort > task > subtask', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Hierarchy Project');
    const effort = await createNodeViaAPI(page, 'Design', 'effort', project.id);
    const task = await createNodeViaAPI(page, 'Wireframes', 'task', effort.id);
    await createNodeViaAPI(page, 'Homepage wireframe', 'subtask', task.id);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Hierarchy Project');

    // Expand nodes to reveal the full hierarchy
    // Click on the effort to expand it
    await waitForTreeItem(page, 'Design');
    await getTreeItemByText(page, 'Design')
      .getByRole('button', { name: /Expand|Collapse/ })
      .click();

    await waitForTreeItem(page, 'Wireframes');
    await getTreeItemByText(page, 'Wireframes')
      .getByRole('button', { name: /Expand|Collapse/ })
      .click();

    await waitForTreeItem(page, 'Homepage wireframe');

    // Verify ARIA levels for hierarchy depth
    const effort_item = getTreeItemByText(page, 'Design');
    await expect(effort_item).toHaveAttribute('aria-level', '1');

    const task_item = getTreeItemByText(page, 'Wireframes');
    await expect(task_item).toHaveAttribute('aria-level', '2');

    const subtask_item = getTreeItemByText(page, 'Homepage wireframe');
    await expect(subtask_item).toHaveAttribute('aria-level', '3');
  });

  test('create sibling node with Ctrl+Enter', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Sibling Project');
    await createNodeViaAPI(page, 'First Effort', 'effort', project.id);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Sibling Project');

    await waitForTreeItem(page, 'First Effort');

    // Focus the first effort
    await getTreeItemByText(page, 'First Effort').click();

    // Press Ctrl+Enter to create a sibling
    await page.keyboard.press('Control+Enter');

    // An input should appear for the new node
    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();

    await input.fill('Second Effort');
    await input.press('Enter');

    await waitForTreeItem(page, 'Second Effort');

    // Both efforts should be visible
    await expect(getTreeItemByText(page, 'First Effort')).toBeVisible();
    await expect(getTreeItemByText(page, 'Second Effort')).toBeVisible();
  });

  test('tree view has correct ARIA role="tree"', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'ARIA Project');
    await createNodeViaAPI(page, 'Some Effort', 'effort', project.id);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'ARIA Project');

    // The tree container should have role="tree"
    const tree = page.getByRole('tree', { name: 'Project tree' });
    await expect(tree).toBeVisible();
  });

  test('tree items have role="treeitem" with aria-expanded', async ({
    page,
  }) => {
    const project = await createProjectViaAPI(page, 'Attr Project');
    const effort = await createNodeViaAPI(page, 'Parent Effort', 'effort', project.id);
    await createNodeViaAPI(page, 'Child Task', 'task', effort.id);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Attr Project');

    const effortItem = getTreeItemByText(page, 'Parent Effort');
    await expect(effortItem).toBeVisible();

    // Should have aria-expanded attribute since it has children
    const ariaExpanded = await effortItem.getAttribute('aria-expanded');
    expect(ariaExpanded).toBeTruthy(); // "true" or "false"
  });

  test('cancel new node creation with Escape deletes the placeholder', async ({
    page,
  }) => {
    await createProjectViaAPI(page, 'Cancel Project');
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    await selectProjectInSidebar(page, 'Cancel Project');
    await page.getByRole('button', { name: 'Add effort' }).click();

    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();

    // Press Escape to cancel
    await input.press('Escape');

    // Input should be gone and the empty state should return
    await expect(input).toBeHidden();
    await expect(page.getByText('No efforts yet')).toBeVisible();
  });

  test('multiple efforts preserve sort order', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Order Project');
    await createNodeViaAPI(page, 'Alpha', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Beta', 'effort', project.id, 1);
    await createNodeViaAPI(page, 'Gamma', 'effort', project.id, 2);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Order Project');

    const items = getTreeItems(page);
    const texts = await items.allTextContents();
    expect(texts[0]).toContain('Alpha');
    expect(texts[1]).toContain('Beta');
    expect(texts[2]).toContain('Gamma');
  });
});
