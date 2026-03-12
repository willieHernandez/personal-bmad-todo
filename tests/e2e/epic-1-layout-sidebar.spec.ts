import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createProjectViaUI,
} from './helpers';

test.describe('Epic 1 - Story 1.3: App Layout & Project Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
    // Reload after reset to get a clean state
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
  });

  test('displays three-zone layout: capture bar, sidebar, content panel', async ({
    page,
  }) => {
    // Capture bar placeholder at the top
    await expect(page.locator('text=Quick capture')).toBeVisible();

    // Project tabs bar
    await expect(page.getByRole('tablist')).toBeVisible();

    // Sidebar navigation
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();

    // Content panel (shows "Select a project" when no project is active)
    await expect(
      page.getByText('Select a project from the sidebar')
    ).toBeVisible();
  });

  test('sidebar displays collapsible sections: Inbox, Pinned, Recent, On Hold', async ({
    page,
  }) => {
    await expect(page.getByText('Inbox')).toBeVisible();
    await expect(page.getByText('Pinned')).toBeVisible();
    await expect(page.getByText('Recent')).toBeVisible();
    await expect(page.getByText('On Hold')).toBeVisible();
  });

  test('sidebar sections are collapsible', async ({ page }) => {
    // Click "Recent" section header to collapse it
    const recentHeader = page.getByRole('button', { name: /Recent/i });
    // The "No projects yet" text should be visible initially
    await expect(page.getByText('No projects yet')).toBeVisible();

    // Collapse the section
    await recentHeader.click();
    // The content should be hidden
    await expect(page.getByText('No projects yet')).toBeHidden();

    // Expand again
    await recentHeader.click();
    await expect(page.getByText('No projects yet')).toBeVisible();
  });

  test('shows projects in sidebar Recent section sorted by recency', async ({
    page,
  }) => {
    // Create two projects via API
    await createProjectViaAPI(page, 'Project Alpha');
    // Small delay to ensure different updatedAt
    await page.waitForTimeout(50);
    await createProjectViaAPI(page, 'Project Beta');

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    // Both projects should appear in the sidebar
    await expect(page.getByRole('button', { name: 'Project Alpha' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Project Beta' })).toBeVisible();

    // "Project Beta" should appear first (most recently created)
    const sidebar = page.locator('nav').first();
    const projectButtons = sidebar.getByRole('button').filter({
      hasText: /Project (Alpha|Beta)/,
    });
    const texts = await projectButtons.allTextContents();
    expect(texts[0]).toContain('Project Beta');
    expect(texts[1]).toContain('Project Alpha');
  });

  test('clicking a project in the sidebar opens it in the content panel', async ({
    page,
  }) => {
    await createProjectViaAPI(page, 'My Project');
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    // Click the project
    await page.getByRole('button', { name: 'My Project' }).click();

    // The project tab should appear in the tab bar
    await expect(page.getByRole('tab', { name: /My Project/ })).toBeVisible();

    // The content panel should show the tree view (or the "no efforts" empty state)
    await expect(
      page.getByRole('tree', { name: 'Project tree' }).or(
        page.getByText('No efforts yet')
      )
    ).toBeVisible();
  });

  test('create project via tab bar "+" button', async ({ page }) => {
    await createProjectViaUI(page, 'Brand New Project');

    // Should be visible in sidebar
    await expect(
      page.getByRole('button', { name: 'Brand New Project' })
    ).toBeVisible();

    // Should be in the tab bar
    await expect(
      page.getByRole('tab', { name: /Brand New Project/ })
    ).toBeVisible();
  });

  test('project tab can be closed', async ({ page }) => {
    await createProjectViaAPI(page, 'Closeable Project');
    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });

    // Open the project
    await page.getByRole('button', { name: 'Closeable Project' }).click();
    await expect(
      page.getByRole('tab', { name: /Closeable Project/ })
    ).toBeVisible();

    // Close the tab
    await page
      .getByRole('button', { name: 'Close Closeable Project tab' })
      .click();

    // Tab should be gone
    await expect(
      page.getByRole('tab', { name: /Closeable Project/ })
    ).toBeHidden();

    // Should return to empty state
    await expect(
      page.getByText('Select a project from the sidebar')
    ).toBeVisible();
  });

  test('content panel shows "Create project" button when no project selected', async ({
    page,
  }) => {
    const createBtn = page.getByRole('button', { name: 'Create project' });
    await expect(createBtn).toBeVisible();

    // Clicking it creates a new project
    await createBtn.click();

    // A "New Project" should appear
    await expect(page.getByRole('tab', { name: /New Project/ })).toBeVisible();
  });
});
