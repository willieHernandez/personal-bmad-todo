import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  getTreeItemByText,
  getTreeItems,
  waitForTreeItem,
} from './helpers';

test.describe('Error Handling - Optimistic Rollback', () => {
  let projectId: string;
  let effortId: string;

  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);

    // Seed a project with an effort and a task
    const project = await createProjectViaAPI(page, 'Error Test Project');
    projectId = project.id;
    const effort = await createNodeViaAPI(page, 'Test Effort', 'effort', projectId);
    effortId = effort.id;
    await createNodeViaAPI(page, 'Test Task', 'task', effortId);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Error Test Project');
    await waitForTreeItem(page, 'Test Effort');
  });

  test('create node failure rolls back optimistic addition', async ({ page }) => {
    // Expand effort to see children
    await getTreeItemByText(page, 'Test Effort')
      .getByRole('button', { name: /Expand|Collapse/ })
      .click();
    await waitForTreeItem(page, 'Test Task');

    const initialCount = await getTreeItems(page).count();

    // Intercept POST to /api/nodes BEFORE triggering create.
    // Ctrl+Enter fires the POST immediately (creates node with title "Untitled"),
    // so the route must be registered before the keyboard shortcut.
    await page.route('**/api/nodes', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Server Error"}' });
      }
      return route.continue();
    });

    // Focus the task and attempt to create a sibling via Ctrl+Enter
    await getTreeItemByText(page, 'Test Task').click();
    await page.keyboard.press('Control+Enter');

    // After rollback + refetch, tree should return to original count
    await expect(getTreeItems(page)).toHaveCount(initialCount, { timeout: 10000 });
  });

  test('delete node failure rolls back optimistic removal', async ({ page }) => {
    // Intercept DELETE requests with 500
    await page.route('**/api/nodes/**', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
      return route.continue();
    });

    // Focus effort and press Delete
    await getTreeItemByText(page, 'Test Effort').click();
    await page.keyboard.press('Delete');

    // Effort should reappear after rollback + refetch
    await expect(getTreeItemByText(page, 'Test Effort')).toBeVisible({ timeout: 10000 });
  });

  test('toggle completion failure rolls back checkbox state', async ({ page }) => {
    // Intercept POST to complete endpoint with 500
    await page.route('**/api/nodes/*/complete', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
      return route.continue();
    });

    const checkbox = getTreeItemByText(page, 'Test Effort').getByTestId('tree-row-checkbox');
    await expect(checkbox).not.toBeChecked();

    // Click to toggle completion
    await checkbox.click();

    // After rollback + refetch, checkbox should revert to unchecked
    await expect(checkbox).not.toBeChecked({ timeout: 10000 });
  });

  test('rename failure rolls back title to original', async ({ page }) => {
    // Intercept PATCH requests with 500
    await page.route('**/api/nodes/**', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
      return route.continue();
    });

    // Double-click to enter rename mode
    await getTreeItemByText(page, 'Test Effort').dblclick();

    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();
    await input.clear();
    await input.fill('Renamed Effort');
    await input.press('Enter');

    // After rollback + refetch, title should revert to original
    await expect(getTreeItemByText(page, 'Test Effort')).toBeVisible({ timeout: 10000 });
  });

  test('network abort during create gracefully rolls back', async ({ page }) => {
    // Expand effort to see children
    await getTreeItemByText(page, 'Test Effort')
      .getByRole('button', { name: /Expand|Collapse/ })
      .click();
    await waitForTreeItem(page, 'Test Task');

    const initialCount = await getTreeItems(page).count();

    // Abort POST requests instead of returning HTTP error
    await page.route('**/api/nodes', (route) => {
      if (route.request().method() === 'POST') {
        return route.abort();
      }
      return route.continue();
    });

    // Focus the task and attempt to create a sibling
    await getTreeItemByText(page, 'Test Task').click();
    await page.keyboard.press('Control+Enter');

    // After rollback, tree should return to original count
    await expect(getTreeItems(page)).toHaveCount(initialCount, { timeout: 10000 });
  });
});
