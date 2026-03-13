import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  getTreeItemByText,
  waitForTreeItem,
} from './helpers';

test.describe('Epic 3 - Story 3.1 & 3.2: Completion Toggle, Cascade & Progress Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test.describe('Story 3.1: Node Completion Toggle', () => {
    test('checkbox toggles node completion and shows strikethrough', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Completion Project');
      await createNodeViaAPI(page, 'My Effort', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Completion Project');

      await waitForTreeItem(page, 'My Effort');

      // Check the checkbox
      const checkbox = getTreeItemByText(page, 'My Effort').getByTestId('tree-row-checkbox');
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();

      // Checkbox should now be checked
      await expect(checkbox).toBeChecked();

      // Title text should have strikethrough styling
      const titleSpan = getTreeItemByText(page, 'My Effort').locator('span.line-through');
      await expect(titleSpan).toBeVisible();
    });

    test('unchecking a completed node removes strikethrough', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Uncheck Project');
      await createNodeViaAPI(page, 'Done Effort', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Uncheck Project');

      await waitForTreeItem(page, 'Done Effort');

      const checkbox = getTreeItemByText(page, 'Done Effort').getByTestId('tree-row-checkbox');

      // Complete then uncomplete
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();

      // Should no longer have strikethrough
      const titleSpan = getTreeItemByText(page, 'Done Effort').locator('span.line-through');
      await expect(titleSpan).toHaveCount(0);
    });

    test('completing a parent cascades down to children', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Cascade Project');
      const effort = await createNodeViaAPI(page, 'Parent Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task A', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task B', 'task', effort.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Cascade Project');

      await waitForTreeItem(page, 'Parent Effort');

      // Expand the effort to see tasks
      await getTreeItemByText(page, 'Parent Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task A');
      await waitForTreeItem(page, 'Task B');

      // Complete the parent directly
      const parentCheckbox = getTreeItemByText(page, 'Parent Effort').getByTestId('tree-row-checkbox');
      await parentCheckbox.click();
      await expect(parentCheckbox).toBeChecked();

      // Children should cascade to completed
      const taskACheckbox = getTreeItemByText(page, 'Task A').getByTestId('tree-row-checkbox');
      const taskBCheckbox = getTreeItemByText(page, 'Task B').getByTestId('tree-row-checkbox');
      await expect(taskACheckbox).toBeChecked({ timeout: 10000 });
      await expect(taskBCheckbox).toBeChecked({ timeout: 10000 });
    });

    test('reopening a parent cascades down to reopen children', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Reopen Cascade');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task A', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task B', 'task', effort.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Reopen Cascade');

      await waitForTreeItem(page, 'Effort');

      // Expand
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task A');

      // Complete parent (cascades down)
      const effortCheckbox = getTreeItemByText(page, 'Effort').getByTestId('tree-row-checkbox');
      await effortCheckbox.click();
      await expect(getTreeItemByText(page, 'Task A').getByTestId('tree-row-checkbox')).toBeChecked({ timeout: 10000 });

      // Reopen parent (should cascade down — children reopen too)
      await effortCheckbox.click();
      await expect(getTreeItemByText(page, 'Task A').getByTestId('tree-row-checkbox')).not.toBeChecked({ timeout: 10000 });
      await expect(getTreeItemByText(page, 'Task B').getByTestId('tree-row-checkbox')).not.toBeChecked({ timeout: 10000 });
    });

    test('completing all children cascades up to parent', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Upward Cascade');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Only Task', 'task', effort.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Upward Cascade');

      await waitForTreeItem(page, 'Effort');

      // Expand to see the task
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Only Task');

      // Complete the only child
      const taskCheckbox = getTreeItemByText(page, 'Only Task').getByTestId('tree-row-checkbox');
      await taskCheckbox.click();

      // Parent should cascade to completed (server-side upward cascade + cache refetch)
      const effortCheckbox = getTreeItemByText(page, 'Effort').getByTestId('tree-row-checkbox');
      await expect(effortCheckbox).toBeChecked({ timeout: 10000 });
    });
  });

  test.describe('Story 3.2: Progress Indicators', () => {
    test('progress indicator shows on expanded parent with mixed children', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Progress Project');
      const effort = await createNodeViaAPI(page, 'My Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task 1', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task 2', 'task', effort.id, 1);
      await createNodeViaAPI(page, 'Task 3', 'task', effort.id, 2);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Progress Project');

      await waitForTreeItem(page, 'My Effort');

      // Expand the effort to load children into cache
      await getTreeItemByText(page, 'My Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task 1');

      // Progress should show 0/3
      const progressCount = getTreeItemByText(page, 'My Effort').getByTestId('progress-count');
      await expect(progressCount).toHaveText('0/3');

      // Progress bar should exist
      const progressBar = getTreeItemByText(page, 'My Effort').getByTestId('progress-bar-track');
      await expect(progressBar).toBeVisible();
    });

    test('progress indicator is not shown on leaf nodes (subtasks)', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Leaf Progress');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      const task = await createNodeViaAPI(page, 'Task', 'task', effort.id);
      await createNodeViaAPI(page, 'Subtask', 'subtask', task.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Leaf Progress');

      // Expand everything
      await waitForTreeItem(page, 'Effort');
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task');
      await getTreeItemByText(page, 'Task')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Subtask');

      // Subtask should NOT have a progress indicator
      const subtaskRow = getTreeItemByText(page, 'Subtask');
      await expect(subtaskRow.getByTestId('progress-indicator')).toHaveCount(0);
    });

    test('progress indicator updates immediately when child is completed', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Update Progress');
      const effort = await createNodeViaAPI(page, 'My Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task A', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task B', 'task', effort.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Update Progress');

      await waitForTreeItem(page, 'My Effort');

      // Expand to load children
      await getTreeItemByText(page, 'My Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task A');

      // Initial progress: 0/2
      const progressCount = getTreeItemByText(page, 'My Effort').getByTestId('progress-count');
      await expect(progressCount).toHaveText('0/2');

      // Complete Task A
      await getTreeItemByText(page, 'Task A').getByTestId('tree-row-checkbox').click();

      // Progress should update to 1/2
      await expect(progressCount).toHaveText('1/2');

      // Complete Task B
      await getTreeItemByText(page, 'Task B').getByTestId('tree-row-checkbox').click();

      // Progress should update to 2/2
      await expect(progressCount).toHaveText('2/2');
    });

    test('progress bar turns green when all children are complete', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Green Progress');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task', 'task', effort.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Green Progress');

      await waitForTreeItem(page, 'Effort');

      // Expand
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task');

      // Complete the only task
      await getTreeItemByText(page, 'Task').getByTestId('tree-row-checkbox').click();

      // Progress bar fill should have green class
      const fill = getTreeItemByText(page, 'Effort').getByTestId('progress-bar-fill');
      await expect(fill).toHaveClass(/bg-green-500/);
    });

    test('progress indicator has correct accessibility attributes', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'A11y Progress');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task 1', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task 2', 'task', effort.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'A11y Progress');

      await waitForTreeItem(page, 'Effort');

      // Expand
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task 1');

      // Check ARIA attributes on the progressbar
      const progressbar = getTreeItemByText(page, 'Effort').getByRole('progressbar');
      await expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      await expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressbar).toHaveAttribute('aria-valuemax', '2');
      await expect(progressbar).toHaveAttribute('aria-label', '0 of 2 complete');
    });

    test('progress indicator not shown on effort before expansion (no cached children)', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'No Cache Progress');
      const effort = await createNodeViaAPI(page, 'Unexpanded Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Hidden Task', 'task', effort.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'No Cache Progress');

      await waitForTreeItem(page, 'Unexpanded Effort');

      // Without expanding, no children data is cached — no progress indicator
      const effortRow = getTreeItemByText(page, 'Unexpanded Effort');
      await expect(effortRow.getByTestId('progress-indicator')).toHaveCount(0);
    });

    test('progress persists after collapsing a previously expanded node', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Persist Progress');
      const effort = await createNodeViaAPI(page, 'My Effort', 'effort', project.id);
      await createNodeViaAPI(page, 'Task 1', 'task', effort.id, 0);
      await createNodeViaAPI(page, 'Task 2', 'task', effort.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Persist Progress');

      await waitForTreeItem(page, 'My Effort');

      // Expand to cache children
      await getTreeItemByText(page, 'My Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task 1');

      // Progress should show 0/2
      const progressCount = getTreeItemByText(page, 'My Effort').getByTestId('progress-count');
      await expect(progressCount).toHaveText('0/2');

      // Collapse — children disappear but progress should persist from cache
      await getTreeItemByText(page, 'My Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();

      // Progress should still be visible
      await expect(progressCount).toHaveText('0/2');
    });

    test('multi-level progress: effort shows task progress, task shows subtask progress', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Multi Level');
      const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
      const task = await createNodeViaAPI(page, 'Task', 'task', effort.id);
      await createNodeViaAPI(page, 'Sub A', 'subtask', task.id, 0);
      await createNodeViaAPI(page, 'Sub B', 'subtask', task.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Multi Level');

      // Expand effort → task
      await waitForTreeItem(page, 'Effort');
      await getTreeItemByText(page, 'Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Task');
      await getTreeItemByText(page, 'Task')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Sub A');

      // Effort progress: 0/1 (1 task, not complete)
      const effortProgress = getTreeItemByText(page, 'Effort').getByTestId('progress-count');
      await expect(effortProgress).toHaveText('0/1');

      // Task progress: 0/2 (2 subtasks, none complete)
      const taskProgress = getTreeItemByText(page, 'Task').getByTestId('progress-count');
      await expect(taskProgress).toHaveText('0/2');

      // Complete Sub A
      await getTreeItemByText(page, 'Sub A').getByTestId('tree-row-checkbox').click();

      // Task progress updates to 1/2
      await expect(taskProgress).toHaveText('1/2');
    });
  });
});
