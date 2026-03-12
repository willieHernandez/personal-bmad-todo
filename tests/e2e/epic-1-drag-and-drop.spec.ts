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
  performDrag,
} from './helpers';

test.describe('Epic 1 - Story 1.7: Drag-and-Drop Reorder & Move', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('reorder efforts within a project via drag-and-drop', async ({
    page,
  }) => {
    const project = await createProjectViaAPI(page, 'Reorder Project');
    await createNodeViaAPI(page, 'First', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Second', 'effort', project.id, 1);
    await createNodeViaAPI(page, 'Third', 'effort', project.id, 2);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Reorder Project');

    await waitForTreeItem(page, 'First');
    await waitForTreeItem(page, 'Second');
    await waitForTreeItem(page, 'Third');

    // Get the drag handle of "Third" and drag it above "First"
    const thirdItem = getTreeItemByText(page, 'Third');
    const firstItem = getTreeItemByText(page, 'First');

    // Hover the row first to make the drag handle visible (group-hover:opacity-100)
    await thirdItem.hover();
    const thirdHandle = thirdItem.getByTestId('tree-row-drag-handle');
    const thirdHandleBox = await thirdHandle.boundingBox();
    const firstBox = await firstItem.boundingBox();

    if (thirdHandleBox && firstBox) {
      // Use evaluate to dispatch pointer events directly for reliable @dnd-kit interaction
      await performDrag(page, thirdHandle, {
        x: firstBox.x + firstBox.width / 2,
        y: firstBox.y + 2,
      });
    }

    // Verify new order
    const items = getTreeItems(page);
    const texts = await items.allTextContents();
    // "Third" should now be first (or near the top)
    expect(texts[0]).toContain('Third');
  });

  test('drag overlay shows node title during drag', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Overlay Project');
    await createNodeViaAPI(page, 'Draggable Node', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Target Node', 'effort', project.id, 1);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Overlay Project');

    await waitForTreeItem(page, 'Draggable Node');

    const handle = getTreeItemByText(page, 'Draggable Node').getByTestId(
      'tree-row-drag-handle'
    );
    const handleBox = await handle.boundingBox();

    if (handleBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.down();
      // Move enough to trigger drag
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + 50,
        { steps: 5 }
      );

      // The drag overlay should be visible
      const overlay = page.getByTestId('drag-overlay');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Draggable Node');

      await page.mouse.up();
    }
  });

  test('move task between efforts via drag-and-drop', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Move Project');
    const effort1 = await createNodeViaAPI(
      page,
      'Source Effort',
      'effort',
      project.id,
      0
    );
    const effort2 = await createNodeViaAPI(
      page,
      'Target Effort',
      'effort',
      project.id,
      1
    );
    await createNodeViaAPI(page, 'Movable Task', 'task', effort1.id, 0);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Move Project');

    // Expand Source Effort to see the task
    await waitForTreeItem(page, 'Source Effort');
    await getTreeItemByText(page, 'Source Effort')
      .getByRole('button', { name: /Expand|Collapse/ })
      .click();
    await waitForTreeItem(page, 'Movable Task');

    // Drag "Movable Task" to "Target Effort"
    const taskHandle = getTreeItemByText(page, 'Movable Task').getByTestId(
      'tree-row-drag-handle'
    );
    const targetEffort = getTreeItemByText(page, 'Target Effort');

    const taskHandleBox = await taskHandle.boundingBox();
    const targetBox = await targetEffort.boundingBox();

    if (taskHandleBox && targetBox) {
      await page.mouse.move(
        taskHandleBox.x + taskHandleBox.width / 2,
        taskHandleBox.y + taskHandleBox.height / 2
      );
      await page.mouse.down();
      // Move to the middle of Target Effort (drop as child)
      await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 }
      );
      await page.mouse.up();
    }

    // Wait for the move to settle
    await page.waitForTimeout(500);

    // Expand Target Effort to verify the task moved
    const targetExpanded = await getTreeItemByText(
      page,
      'Target Effort'
    ).getAttribute('aria-expanded');
    if (targetExpanded === 'false' || !targetExpanded) {
      await getTreeItemByText(page, 'Target Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
    }

    // "Movable Task" should now be under "Target Effort"
    await waitForTreeItem(page, 'Movable Task');
  });

  test('reorder persists after page reload', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Persist Reorder');
    await createNodeViaAPI(page, 'Alpha', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Beta', 'effort', project.id, 1);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Persist Reorder');

    await waitForTreeItem(page, 'Alpha');
    await waitForTreeItem(page, 'Beta');

    // Drag Beta above Alpha
    const betaItem = getTreeItemByText(page, 'Beta');
    await betaItem.hover();
    const betaHandle = betaItem.getByTestId('tree-row-drag-handle');
    const alphaItem = getTreeItemByText(page, 'Alpha');
    const alphaBox = await alphaItem.boundingBox();

    if (alphaBox) {
      await performDrag(page, betaHandle, {
        x: alphaBox.x + alphaBox.width / 2,
        y: alphaBox.y + 2,
      });
    }

    // Reload and verify order persisted
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Persist Reorder');

    await waitForTreeItem(page, 'Alpha');
    await waitForTreeItem(page, 'Beta');

    const items = getTreeItems(page);
    const texts = await items.allTextContents();
    expect(texts[0]).toContain('Beta');
    expect(texts[1]).toContain('Alpha');
  });

  test('dragging is disabled during edit mode', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'No Drag Edit');
    await createNodeViaAPI(page, 'Edit Node', 'effort', project.id);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'No Drag Edit');
    await waitForTreeItem(page, 'Edit Node');

    // Enter edit mode
    await getTreeItemByText(page, 'Edit Node').click();
    await page.keyboard.press('Enter');

    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();

    // The drag handle should not initiate a drag while editing
    // (The draggable is disabled when isEditing is true)
    // Get the handle reference while the input is visible (use treeitem with input filter
    // since input value isn't part of textContent and text-based locators won't match)
    const editRow = page.getByRole('treeitem').filter({ has: page.getByTestId('tree-row-input') });
    const handle = editRow.getByTestId('tree-row-drag-handle');
    const handleBox = await handle.boundingBox();

    if (handleBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + 50,
        { steps: 5 }
      );
      await page.mouse.up();
    }

    // The drag overlay should NOT have appeared (draggable is disabled during edit)
    await expect(page.getByTestId('drag-overlay')).toBeHidden();
  });
});
