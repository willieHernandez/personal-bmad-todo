import { useCallback, useRef } from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '#/components/ui/resizable'
import { CaptureBarPlaceholder } from '#/components/features/capture-bar/capture-bar-placeholder'
import { ProjectTabs } from '#/components/features/project-tabs/project-tabs'
import { Sidebar } from '#/components/features/sidebar/sidebar'
import { ContentPanel } from '#/components/features/content-panel/content-panel'
import { useSidebarStore } from '#/stores/sidebar-store'
import { ErrorBoundary } from '#/components/error-boundary'

import '../styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const panelGroupRef = useRef<HTMLDivElement>(null)

  const handleSidebarResize = useCallback((size: number) => {
    const container = panelGroupRef.current
    if (container) {
      const pixelWidth = Math.round((size / 100) * container.offsetWidth)
      useSidebarStore.getState().setWidth(pixelWidth)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="flex h-screen flex-col overflow-hidden">
          <CaptureBarPlaceholder />
          <ProjectTabs />
          <div className="flex-1 overflow-hidden" ref={panelGroupRef}>
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel
                id="sidebar"
                defaultSize={20}
                minSize="180px"
                maxSize="400px"
                onResize={handleSidebarResize}
              >
                <Sidebar />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel id="content" defaultSize={80}>
                <ContentPanel />
                <Outlet />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
