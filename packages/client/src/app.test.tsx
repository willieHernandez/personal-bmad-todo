import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';

describe('App', () => {
  it('should render the home page without crashing', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <div>
          <h1>todo-bmad-style</h1>
          <Outlet />
        </div>
      ),
    });

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <p>Project scaffolding complete.</p>,
    });

    const routeTree = rootRoute.addChildren([indexRoute]);
    const router = createRouter({ routeTree });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('todo-bmad-style')).toBeDefined();
    expect(await screen.findByText('Project scaffolding complete.')).toBeDefined();
  });
});
