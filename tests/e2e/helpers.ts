import { type Page, type Locator, expect } from '@playwright/test';

const API_BASE = '/api';

/**
 * Fetch with automatic retry on 429 (rate limit) responses.
 * Defined as a string so it can be injected into page.evaluate browser context.
 */
const RETRY_FETCH_BODY = `
async function retryFetch(url, init, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return res;
  }
  throw new Error('retryFetch: exhausted retries');
}
`;

/**
 * Reset the database to a clean state by deleting all projects.
 * Calls the API directly to avoid UI overhead.
 */
export async function resetDatabase(page: Page): Promise<void> {
  await page.evaluate(async (base) => {
    async function retryFetch(url: string, init?: RequestInit, maxRetries = 3): Promise<Response> {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, init);
        if (res.status === 429 && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res;
      }
      throw new Error('retryFetch: exhausted retries');
    }

    const res = await retryFetch(`${base}/nodes`);
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;

    for (const project of data) {
      await retryFetch(`${base}/nodes/${project.id}`, { method: 'DELETE' });
    }
  }, API_BASE);
}

/**
 * Create a project via the API and return its id and title.
 */
export async function createProjectViaAPI(
  page: Page,
  title: string
): Promise<{ id: string; title: string }> {
  const result = await page.evaluate(
    async ({ base, title }) => {
      async function retryFetch(url: string, init?: RequestInit, maxRetries = 5): Promise<Response> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const res = await fetch(url, init);
          if (res.status === 429 && attempt < maxRetries) {
            const retryAfter = res.headers.get('retry-after');
            const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * (attempt + 1);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          return res;
        }
        throw new Error('retryFetch: exhausted retries');
      }

      const res = await retryFetch(`${base}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'project', parentId: null }),
      });
      if (!res.ok) throw new Error(`createProjectViaAPI failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
    { base: API_BASE, title }
  );
  return { id: result.id, title: result.title };
}

/**
 * Create a node (effort, task, subtask) via the API.
 */
export async function createNodeViaAPI(
  page: Page,
  title: string,
  type: 'effort' | 'task' | 'subtask',
  parentId: string,
  sortOrder = 0
): Promise<{ id: string; title: string }> {
  const result = await page.evaluate(
    async ({ base, title, type, parentId, sortOrder }) => {
      async function retryFetch(url: string, init?: RequestInit, maxRetries = 5): Promise<Response> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const res = await fetch(url, init);
          if (res.status === 429 && attempt < maxRetries) {
            const retryAfter = res.headers.get('retry-after');
            const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * (attempt + 1);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          return res;
        }
        throw new Error('retryFetch: exhausted retries');
      }

      const res = await retryFetch(`${base}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, parentId, sortOrder }),
      });
      if (!res.ok) throw new Error(`createNodeViaAPI failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
    { base: API_BASE, title, type, parentId, sortOrder }
  );
  return { id: result.id, title: result.title };
}

/**
 * Navigate to the app and wait for the layout to be ready.
 */
export async function navigateToApp(page: Page): Promise<void> {
  await page.goto('/');
  // Wait for the sidebar to be visible (layout has loaded)
  await page.locator('nav').first().waitFor({ state: 'visible' });
}

/**
 * Select a project in the sidebar by its title.
 */
export async function selectProjectInSidebar(
  page: Page,
  title: string
): Promise<void> {
  await page.getByRole('button', { name: title, exact: true }).click();
  // Wait for the tree view to appear
  await page.getByRole('tree', { name: 'Project tree' }).waitFor({ state: 'visible' });
}

/**
 * Get all visible tree items by role.
 */
export function getTreeItems(page: Page) {
  return page.getByRole('treeitem');
}

/**
 * Get a specific tree item by its text content.
 */
export function getTreeItemByText(page: Page, text: string) {
  return page.getByRole('treeitem').filter({ hasText: text });
}

/**
 * Wait for a tree item with specific text to appear.
 */
export async function waitForTreeItem(
  page: Page,
  text: string,
  timeout = 5000
): Promise<void> {
  await expect(
    page.getByRole('treeitem').filter({ hasText: text })
  ).toBeVisible({ timeout });
}

/**
 * Create a project via the tab bar "+" button and inline editing.
 */
export async function createProjectViaUI(
  page: Page,
  title: string
): Promise<void> {
  await page.getByRole('button', { name: 'Create new project' }).click();
  const input = page.getByPlaceholder('Project name...');
  await input.fill(title);
  await input.press('Enter');
  // Wait for project to appear in sidebar
  await expect(page.locator('nav').first().getByRole('button', { name: title })).toBeVisible();
}

/**
 * Perform a drag from a source locator to a target position using Playwright's
 * trusted mouse events. Moves in steps for reliable @dnd-kit PointerSensor
 * activation and drop indicator computation.
 */
export async function performDrag(
  page: Page,
  sourceHandle: Locator,
  targetPos: { x: number; y: number }
): Promise<void> {
  const handleBox = await sourceHandle.boundingBox();
  if (!handleBox) throw new Error('Source handle not found');

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Move in steps to target position
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const x = startX + (targetPos.x - startX) * ratio;
    const y = startY + (targetPos.y - startY) * ratio;
    await page.mouse.move(x, y);
  }

  // Brief pause to let @dnd-kit process the final position before releasing
  await page.waitForTimeout(100);
  await page.mouse.up();
}

/**
 * Seed a full hierarchy: Project > Effort > Task > Subtask via API.
 * Returns all created node IDs.
 */
export async function seedHierarchy(
  page: Page,
  projectTitle = 'Test Project'
): Promise<{
  projectId: string;
  effortId: string;
  taskId: string;
  subtaskId: string;
}> {
  const project = await createProjectViaAPI(page, projectTitle);
  const effort = await createNodeViaAPI(page, 'Test Effort', 'effort', project.id);
  const task = await createNodeViaAPI(page, 'Test Task', 'task', effort.id);
  const subtask = await createNodeViaAPI(page, 'Test Subtask', 'subtask', task.id);
  return {
    projectId: project.id,
    effortId: effort.id,
    taskId: task.id,
    subtaskId: subtask.id,
  };
}
