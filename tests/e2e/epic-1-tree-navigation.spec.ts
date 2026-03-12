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

test.describe('Epic 1 - Story 1.5: Tree Navigation & Expand/Collapse', () => {
  let projectId: string;
  let effortId: string;
  let taskId: string;

  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);

    // Seed a hierarchy for navigation tests
    const project = await createProjectViaAPI(page, 'Nav Project');
    projectId = project.id;

    const effort1 = await createNodeViaAPI(page, 'Effort One', 'effort', projectId, 0);
    effortId = effort1.id;
    const effort2 = await createNodeViaAPI(page, 'Effort Two', 'effort', projectId, 1);

    const task1 = await createNodeViaAPI(page, 'Task Alpha', 'task', effort1.id, 0);
    taskId = task1.id;
    await createNodeViaAPI(page, 'Task Beta', 'task', effort1.id, 1);
    await createNodeViaAPI(page, 'Subtask One', 'subtask', task1.id, 0);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Nav Project');
  });

  test('ArrowDown moves focus to next visible node', async ({ page }) => {
    // Focus the first tree item
    await getTreeItemByText(page, 'Effort One').click();
    await expect(getTreeItemByText(page, 'Effort One')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Press ArrowDown to move to the next sibling
    await page.keyboard.press('ArrowDown');

    // Focus should move to "Effort Two"
    await expect(getTreeItemByText(page, 'Effort Two')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('ArrowUp moves focus to previous visible node', async ({ page }) => {
    // Start at the second effort
    await getTreeItemByText(page, 'Effort Two').click();

    // Press ArrowUp
    await page.keyboard.press('ArrowUp');

    // Focus should move to "Effort One"
    await expect(getTreeItemByText(page, 'Effort One')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('ArrowRight expands a collapsed node', async ({ page }) => {
    // Focus "Effort One" which has children
    await getTreeItemByText(page, 'Effort One').click();

    // It may start collapsed - check current state
    const effortItem = getTreeItemByText(page, 'Effort One');
    const expanded = await effortItem.getAttribute('aria-expanded');

    if (expanded === 'false') {
      // Press ArrowRight to expand
      await page.keyboard.press('ArrowRight');
      await expect(effortItem).toHaveAttribute('aria-expanded', 'true');
    }

    // Children should now be visible
    await waitForTreeItem(page, 'Task Alpha');
  });

  test('ArrowRight on expanded node moves to first child', async ({ page }) => {
    // Expand "Effort One"
    await getTreeItemByText(page, 'Effort One').click();

    // Ensure it's expanded
    const effortItem = getTreeItemByText(page, 'Effort One');
    const expanded = await effortItem.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await page.keyboard.press('ArrowRight');
    }

    await waitForTreeItem(page, 'Task Alpha');

    // Now press ArrowRight again to move to first child
    await page.keyboard.press('ArrowRight');

    // Focus should be on "Task Alpha"
    await expect(getTreeItemByText(page, 'Task Alpha')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('ArrowLeft collapses an expanded node', async ({ page }) => {
    // Expand "Effort One"
    await getTreeItemByText(page, 'Effort One').click();
    const effortItem = getTreeItemByText(page, 'Effort One');
    const expanded = await effortItem.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await page.keyboard.press('ArrowRight');
    }
    await expect(effortItem).toHaveAttribute('aria-expanded', 'true');

    // Press ArrowLeft to collapse
    await page.keyboard.press('ArrowLeft');
    await expect(effortItem).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowLeft on collapsed node moves focus to parent', async ({
    page,
  }) => {
    // First expand the effort
    await getTreeItemByText(page, 'Effort One').click();
    const effortItem = getTreeItemByText(page, 'Effort One');
    const expanded = await effortItem.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await page.keyboard.press('ArrowRight');
    }

    // Move to a child task
    await getTreeItemByText(page, 'Task Alpha').click();

    // Collapse it if it has children and is expanded
    const taskItem = getTreeItemByText(page, 'Task Alpha');
    const taskExpanded = await taskItem.getAttribute('aria-expanded');
    if (taskExpanded === 'true') {
      await page.keyboard.press('ArrowLeft');
    }

    // Press ArrowLeft again to move to parent
    await page.keyboard.press('ArrowLeft');

    // Focus should be back on "Effort One"
    await expect(getTreeItemByText(page, 'Effort One')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('focused node has visible focus ring', async ({ page }) => {
    await getTreeItemByText(page, 'Effort One').click();

    const effortItem = getTreeItemByText(page, 'Effort One');
    // Check that the focused item has the outline style
    const outline = await effortItem.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });
    // The focus ring is "2px solid #3B82F6"
    expect(outline).toContain('rgb(59, 130, 246)');
  });

  test('clicking a node selects it (aria-selected)', async ({ page }) => {
    await getTreeItemByText(page, 'Effort One').click();
    await expect(getTreeItemByText(page, 'Effort One')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(getTreeItemByText(page, 'Effort Two')).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Click another node
    await getTreeItemByText(page, 'Effort Two').click();
    await expect(getTreeItemByText(page, 'Effort Two')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(getTreeItemByText(page, 'Effort One')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  test('expand/collapse state toggles with chevron click', async ({ page }) => {
    const effortItem = getTreeItemByText(page, 'Effort One');
    const chevronBtn = effortItem.getByRole('button', {
      name: /Expand|Collapse/,
    });

    // Toggle to expand
    await chevronBtn.click();
    await waitForTreeItem(page, 'Task Alpha');

    // Toggle to collapse
    await chevronBtn.click();
    // Task should no longer be visible
    await expect(getTreeItemByText(page, 'Task Alpha')).toBeHidden();
  });

  test('keyboard navigation works through expanded hierarchy', async ({
    page,
  }) => {
    // Start at Effort One
    await getTreeItemByText(page, 'Effort One').click();

    // Expand it
    await page.keyboard.press('ArrowRight');
    await waitForTreeItem(page, 'Task Alpha');

    // ArrowDown should go through visible nodes in order
    await page.keyboard.press('ArrowDown');
    await expect(getTreeItemByText(page, 'Task Alpha')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await page.keyboard.press('ArrowDown');
    await expect(getTreeItemByText(page, 'Task Beta')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await page.keyboard.press('ArrowDown');
    await expect(getTreeItemByText(page, 'Effort Two')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
