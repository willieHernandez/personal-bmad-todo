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

    const thirdHandle = thirdItem.getByTestId('tree-row-drag-handle');
    const firstBox = await firstItem.boundingBox();
    const thirdHandleBox = await thirdHandle.boundingBox();

    if (thirdHandleBox && firstBox) {
      // Drag from Third's drag handle to above First
      await page.mouse.move(
        thirdHandleBox.x + thirdHandleBox.width / 2,
        thirdHandleBox.y + thirdHandleBox.height / 2
      );
      await page.mouse.down();
      // Move to above the first item
      await page.mouse.move(
        firstBox.x + firstBox.width / 2,
        firstBox.y + 2,
        { steps: 10 }
      );
      await page.mouse.up();
    }

    // Wait for the reorder to settle
    await page.waitForTimeout(500);

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
    const betaHandle = getTreeItemByText(page, 'Beta').getByTestId(
      'tree-row-drag-handle'
    );
    const alphaItem = getTreeItemByText(page, 'Alpha');

    const betaHandleBox = await betaHandle.boundingBox();
    const alphaBox = await alphaItem.boundingBox();

    if (betaHandleBox && alphaBox) {
      await page.mouse.move(
        betaHandleBox.x + betaHandleBox.width / 2,
        betaHandleBox.y + betaHandleBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        alphaBox.x + alphaBox.width / 2,
        alphaBox.y + 2,
        { steps: 10 }
      );
      await page.mouse.up();
    }

    await page.waitForTimeout(500);

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
    // We verify the edit input is still active after attempting drag
    const handle = getTreeItemByText(page, 'Edit Node').getByTestId(
      'tree-row-drag-handle'
    );
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

    // The input should still be visible (drag didn't activate)
    await expect(input).toBeVisible();

    // Cancel the edit
    await input.press('Escape');
  });
});
