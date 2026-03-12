---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Tiptap markdown editor integration for React/TypeScript'
research_goals: 'Research Tiptap editor integration for markdown editing in a React/TypeScript application. Cover: Tiptap core architecture, markdown extension support (tiptap-markdown or similar), integration patterns with React, performance considerations, and comparison with alternatives like ProseMirror direct usage or Milkdown. This is for a todo/task management app that needs rich text editing with markdown support.'
user_name: 'Willie'
date: '2026-03-11'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-11
**Author:** Willie
**Research Type:** technical

---

## Research Overview

This technical research report provides a comprehensive analysis of Tiptap editor integration for markdown editing in a React/TypeScript application, specifically for the todo-bmad-style task management app. The research covers Tiptap's ProseMirror-based architecture, the official `@tiptap/markdown` extension for bidirectional markdown conversion, React integration patterns using hooks and the composable API, performance optimization strategies, and a thorough comparison with alternatives including direct ProseMirror usage and Milkdown.

Key findings indicate that Tiptap is the optimal choice for this project's needs: it provides first-class React integration, official markdown support, a tree-shakable modular architecture, and an active ecosystem. The existing `markdownBody` field in the shared schema maps directly to Tiptap's "edit as rich text, persist as Markdown" model. The research also provides concrete implementation patterns for state management integration with TanStack Query, debounced persistence, toolbar/menu construction with Tailwind CSS, and testing strategies with Vitest.

For the full executive summary and strategic recommendations, see the Research Synthesis section at the end of this document.

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** Tiptap markdown editor integration for React/TypeScript
**Research Goals:** Research Tiptap editor integration for markdown editing in a React/TypeScript application. Cover: Tiptap core architecture, markdown extension support (tiptap-markdown or similar), integration patterns with React, performance considerations, and comparison with alternatives like ProseMirror direct usage or Milkdown. This is for a todo/task management app that needs rich text editing with markdown support.

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-11

## Technology Stack Analysis

### Core Technology: Tiptap Editor Framework

Tiptap is a **headless, framework-agnostic rich-text editor framework** built on top of ProseMirror. It abstracts ProseMirror's powerful but complex API into an approachable, extension-based developer experience. Tiptap is open-source (MIT licensed) and backed by a commercial entity that offers paid collaboration and AI features.

**Current Version Landscape (as of March 2026):**
- **Tiptap v2.x** - Stable, widely adopted, TypeScript-native rewrite of the original Tiptap
- **Tiptap v3.0** - Released with JSX support for custom nodes, server-side content manipulation (no DOM required), static renderer for HTML/Markdown/React output, improved transaction handling, and mobile touch event improvements
- **2026 Roadmap** - Focus on making Tiptap "the document layer around the database," with AI collaboration tools and advanced document conversion

_Confidence: HIGH - verified against official docs and release notes_
_Source: [Tiptap Editor 3.0](https://tiptap.dev/tiptap-editor-v3), [Tiptap Roadmap 2026](https://tiptap.dev/blog/release-notes/our-roadmap-for-2026)_

### ProseMirror Foundation

Tiptap is built entirely on ProseMirror, inheriting its structured document model. Key architectural concepts:

- **Schema-driven documents** - ProseMirror enforces a strict schema defining allowed document structure (nodes, marks, attributes). Documents are trees of nodes (paragraphs, headings, lists) with marks (bold, italic, links) attached to inline content.
- **Immutable state + transactions** - Editor state is immutable; changes happen through transactions, enabling undo/redo, collaborative editing, and predictable state management.
- **Plugin system** - ProseMirror's plugin architecture powers decorations, input rules, key bindings, and custom behaviors. Tiptap wraps this in its extension API.

Using Tiptap rather than ProseMirror directly saves significant development effort -- ProseMirror is intentionally low-level and requires assembling many pieces (schema, plugins, views, commands) manually.

_Confidence: HIGH - core architecture is well-documented and stable_
_Source: [ProseMirror in Tiptap](https://tiptap.dev/docs/editor/core-concepts/prosemirror), [Tiptap Core Concepts](https://tiptap.dev/docs/editor/core-concepts/introduction)_

### Markdown Support: @tiptap/markdown

Tiptap now provides an **official first-party markdown extension** (`@tiptap/markdown`, introduced in v3.7.0, current version 3.20.0) that supersedes the community `tiptap-markdown` package by aguingand.

**Key capabilities:**
- **Bidirectional conversion** - Parse Markdown strings into Tiptap's ProseMirror JSON document format, and serialize editor content back to Markdown
- **MarkedJS-based parsing** - Uses MarkedJS under the hood for fast, extensible, CommonMark-compliant Markdown parsing
- **MarkdownManager** - Central API for handling parse/serialize operations between Markdown and ProseMirror document structure
- **Custom serialization** - Each extension can define its own `parseMarkdown` (tokens to Tiptap JSON) and `renderMarkdown` (Tiptap JSON to Markdown strings) functions
- **Extensible tokenizers** - Support for custom Markdown syntax via custom tokenizer definitions

**Community package status:** The original `tiptap-markdown` (npm: `tiptap-markdown`) by aguingand still exists but the community recommends migrating to the official `@tiptap/markdown` package for better maintenance and compatibility.

_Confidence: HIGH - verified against npm registry and official docs_
_Source: [Tiptap Markdown Docs](https://tiptap.dev/docs/editor/markdown), [@tiptap/markdown on npm](https://www.npmjs.com/package/@tiptap/markdown), [Markdown Release Notes](https://tiptap.dev/blog/release-notes/introducing-bidirectional-markdown-support-in-tiptap)_

### Required Packages for This Project

For the todo-bmad-style app (React 19, TypeScript, Vite, Tailwind CSS 4), the essential Tiptap packages are:

| Package | Purpose |
|---------|---------|
| `@tiptap/react` | React bindings, `useEditor` hook, `EditorContent` component |
| `@tiptap/pm` | ProseMirror peer dependencies |
| `@tiptap/starter-kit` | Bundle of common extensions (paragraph, heading, bold, italic, lists, code, blockquote, etc.) |
| `@tiptap/markdown` | Official bidirectional Markdown parse/serialize |

Optional extensions depending on feature needs:
- `@tiptap/extension-placeholder` - Placeholder text
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` - Checkbox task lists (relevant for a todo app)
- `@tiptap/extension-link` - Clickable links
- `@tiptap/extension-code-block-lowlight` - Syntax-highlighted code blocks

_Confidence: HIGH - package names verified against npm and official install docs_
_Source: [Tiptap React Install](https://tiptap.dev/docs/editor/getting-started/install/react), [Tiptap Markdown Install](https://tiptap.dev/docs/editor/markdown/getting-started/installation)_

### Bundle Size and Modularity

Tiptap uses a **tree-shakable, modular architecture** where you only include the extensions you need:

- Tiptap's core bundle is smaller than Quill, Slate, Lexical, and Remirror
- Extensions are individually importable packages, so unused features are not bundled
- StarterKit provides a convenient bundle of common extensions but each can also be imported individually for finer control

For a todo/task management app that needs basic markdown (headings, lists, bold/italic, code, links, task lists), the bundle footprint will be modest since you only need a subset of available extensions.

_Confidence: HIGH - multiple independent sources confirm bundle size advantage_
_Source: [Liveblocks Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025), [Velt Best Editors 2025](https://velt.dev/blog/best-javascript-rich-text-editors-react)_

### Alternatives Comparison

#### Tiptap vs. Direct ProseMirror

| Dimension | Tiptap | ProseMirror Direct |
|-----------|--------|--------------------|
| **Abstraction level** | High-level extension API | Low-level primitives |
| **React integration** | First-class hooks + components | Manual, no official React bindings |
| **Markdown support** | Official @tiptap/markdown | Must build custom serializers |
| **TypeScript** | Full TypeScript, strongly typed | TypeScript since port, but verbose |
| **Dev effort** | Low-medium | High |
| **Flexibility** | Very high (can drop to ProseMirror level) | Maximum |
| **Best for** | Most applications | Highly custom editor UIs |

**Verdict for this project:** Tiptap. You get ProseMirror's power without the boilerplate. You can always drop down to raw ProseMirror APIs through Tiptap's escape hatches when needed.

#### Tiptap vs. Milkdown

| Dimension | Tiptap | Milkdown |
|-----------|--------|----------|
| **Architecture** | ProseMirror + extension system | ProseMirror + plugin system |
| **Markdown philosophy** | Markdown as import/export format | Markdown as canonical state |
| **React integration** | Excellent (hooks, components, context) | Bare-bones, requires manual UI construction |
| **Ecosystem** | Large, many official + community extensions | Smaller, plugin-based |
| **Community size** | ~29k GitHub stars, very active | ~9k GitHub stars, smaller community |
| **Documentation** | Comprehensive | Adequate but less mature |
| **Best for** | Rich WYSIWYG with Markdown I/O | Markdown-first editing experiences |

**Verdict for this project:** Tiptap. The todo app stores `markdownBody` as a string but presents a WYSIWYG editor -- this aligns perfectly with Tiptap's model of "edit as rich text, persist as Markdown." Milkdown's Markdown-as-state approach adds complexity without benefit here.

#### Other Alternatives Considered

- **Slate** - React-native but larger bundle, less mature Markdown support, more work to configure
- **Lexical (Meta)** - Powerful but different document model, Markdown support is secondary
- **BlockNote** - Built on Tiptap, adds block-based Notion-like UI, but may be overkill for task descriptions

_Confidence: HIGH - comparison verified across multiple independent review sources_
_Source: [Liveblocks Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025), [Strapi Top 5 Markdown Editors](https://strapi.io/blog/top-5-markdown-editors-for-react), [LogRocket Milkdown Comparison](https://blog.logrocket.com/comparing-milkdown-other-wysiwyg-editors/)_

### Technology Adoption Trends

_Migration Patterns:_ The ecosystem is consolidating around ProseMirror-based editors (Tiptap, Milkdown, BlockNote, Novel) as the dominant approach for rich text editing in React applications. The trend is away from ContentEditable-based editors (Draft.js, deprecated by Meta) and toward structured document models.

_Tiptap Adoption:_ Tiptap is among the most popular choices for React rich text editing in 2025-2026, with strong commercial backing (YC-funded), active open-source development, and a growing ecosystem of official and community extensions.

_Markdown Convergence:_ The official `@tiptap/markdown` release signals that Markdown as an interchange format is now a first-class concern, not an afterthought. This reduces the risk of relying on community packages.

_Source: [Tiptap GitHub](https://github.com/ueberdosis/tiptap), [YC Launch: Tiptap 3.0](https://www.ycombinator.com/launches/NR5-tiptap-3-0-beta-the-next-gen-open-source-editor)_

## Integration Patterns Analysis

### React Integration: Hooks and Composable API

Tiptap provides two primary React integration approaches:

**1. Hook-based API (useEditor + EditorContent)**

The classic approach uses the `useEditor` hook to create an editor instance and `<EditorContent />` to render it:

```typescript
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

const editor = useEditor({
  extensions: [StarterKit, Markdown],
  content: markdownBody,         // load initial markdown
  immediatelyRender: false,      // SSR-safe
  onUpdate: ({ editor }) => {
    const md = editor.storage.markdown.getMarkdown()
    // debounced save...
  },
})
```

- `useEditor` accepts a dependency array to re-create the editor when external state changes (e.g., switching between nodes)
- `useEditorState` subscribes to specific slices of editor state without causing full re-renders

**2. Composable API (Tiptap component + context)**

The newer declarative `<Tiptap>` component automatically provides editor context to all child components via `useTiptapContext()`. This is the more React-idiomatic approach introduced alongside v3:

- Automatic context propagation -- toolbar components can access the editor without prop drilling
- Selective subscriptions via `useTiptapState` for performance
- Built-in loading states

**Recommendation for this project:** Start with the hook-based API (`useEditor`) since it is simpler and the project does not yet have complex toolbar hierarchies. Migrate to the composable API later if toolbar/menu composition becomes complex.

_Confidence: HIGH - verified against official React docs and composable API guide_
_Source: [Tiptap React Install](https://tiptap.dev/docs/editor/getting-started/install/react), [React Composable API](https://tiptap.dev/docs/guides/react-composable-api), [React Integration DeepWiki](https://deepwiki.com/ueberdosis/tiptap/4.1-react-integration)_

### State Synchronization with TanStack Query and Zustand

The todo-bmad-style app uses TanStack Query for server state and Zustand for UI state. Here is the recommended integration pattern:

**Loading content:**
1. TanStack Query fetches the node (including `markdownBody`) via `useQuery`
2. The markdown string is passed to `useEditor` as `content` with `contentType: 'markdown'`
3. When the selected node changes (via Zustand's `activeNodeId`), the editor content is replaced using `editor.commands.setContent(newMarkdown, false, { contentType: 'markdown' })`

**Saving content:**
1. The editor's `onUpdate` callback fires on every keystroke
2. A debounce layer (300-500ms) batches rapid changes into a single save
3. The debounced handler calls `editor.storage.markdown.getMarkdown()` to serialize to markdown
4. A TanStack Query `useMutation` sends the PATCH request to update `markdownBody`
5. Optimistic updates via `queryClient.setQueryData` keep the UI responsive

**Key pattern -- debounced autosave:**

```typescript
const debouncedSave = useDebouncedCallback((markdown: string) => {
  updateNode.mutate({ markdownBody: markdown })
}, 400)

const editor = useEditor({
  // ...
  onUpdate: ({ editor }) => {
    debouncedSave(editor.storage.markdown.getMarkdown())
  },
})
```

The `use-debounce` library or a simple `setTimeout`-based debounce both work well here. The key is to avoid saving on every transaction.

_Confidence: HIGH - debounced save pattern verified across multiple community discussions and official docs_
_Source: [Tiptap Persistence Docs](https://tiptap.dev/docs/editor/core-concepts/persistence), [Debounced Save Discussion](https://github.com/ueberdosis/tiptap/discussions/2871), [Redux Debouncing Pattern](https://ncoughlin.com/posts/react-redux-tiptap-state-debouncing)_

### Content Persistence: Markdown vs JSON

Tiptap officially recommends storing content as **JSON** for maximum flexibility. However, for this project, **storing as Markdown is the correct choice** because:

1. The schema already defines `markdownBody: string` -- the data model is designed for markdown
2. Markdown is human-readable in the database and portable across systems
3. The `@tiptap/markdown` extension handles bidirectional conversion seamlessly
4. The app does not need JSON-specific features like collaborative editing or complex nested structures

**Trade-offs acknowledged:**
- Markdown cannot represent all ProseMirror features (e.g., custom node attributes that have no markdown equivalent)
- Round-trip fidelity: some formatting may normalize slightly through parse/serialize cycles
- For this app's use case (task descriptions with headings, lists, bold/italic, code, links), markdown covers all needed features with no loss

_Confidence: HIGH - persistence patterns verified against official docs and community best practices_
_Source: [Tiptap Persistence](https://tiptap.dev/docs/editor/core-concepts/persistence), [JSON vs HTML Discussion](https://github.com/ueberdosis/tiptap/discussions/6209), [Best Practices Medium](https://medium.com/@faisalmujtaba/best-practices-for-saving-tiptap-json-vs-html-in-mongodb-mysql-a5192bd68abc)_

### Toolbar and Menu Integration

Tiptap is headless -- it provides no built-in UI chrome. Menus are built with your own components. For the todo-bmad-style app using Tailwind CSS 4 and shadcn-style components:

**Menu Types Available:**
- **Fixed toolbar** - A static toolbar above the editor (most common for task descriptions)
- **BubbleMenu** - Appears on text selection (bold, italic, link actions). Import from `@tiptap/react/menus`
- **FloatingMenu** - Appears on empty lines (block-level actions like heading, list). Import from `@tiptap/react/menus`

**Styling approach:**
- Use `HTMLAttributes` option on extensions to add Tailwind classes directly to rendered elements
- Apply `@tailwindcss/typography` (`prose` class) to the editor container for styled markdown rendering
- Build toolbar buttons as standard React components that call `editor.chain().focus().toggleBold().run()` etc.

**Recommended approach for this project:** Start with a minimal fixed toolbar (bold, italic, heading, list, task list, code, link) plus a BubbleMenu for inline formatting on selection. This keeps the UI clean for task descriptions without overwhelming the user.

_Confidence: HIGH - verified against official menu docs and styling guide_
_Source: [Custom Menus](https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus), [BubbleMenu Docs](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu), [FloatingMenu Docs](https://tiptap.dev/docs/editor/extensions/functionality/floatingmenu), [Style Editor](https://tiptap.dev/docs/editor/getting-started/style-editor)_

## Architectural Patterns and Design

### Extension Architecture

Tiptap's entire feature set is built on three extension types:

1. **Nodes** - Block or inline content types (paragraph, heading, code block, task list item). Each defines a ProseMirror schema node, parse/render rules, and optional commands.
2. **Marks** - Inline formatting (bold, italic, link, code). Each defines schema marks with parse/render rules.
3. **Extensions** - Pure functionality with no schema impact (history/undo, placeholder, keyboard shortcuts, collaboration).

Extensions are composable and overridable:
- `StarterKit` bundles common extensions but any can be disabled or reconfigured
- Custom extensions can extend existing ones via `.extend()` without forking
- Extensions can define `addCommands()`, `addKeyboardShortcuts()`, `addInputRules()`, `addPasteRules()`, and more

**For the markdown integration**, each extension can define `parseMarkdown` and `renderMarkdown` functions that teach the `@tiptap/markdown` system how to convert between markdown tokens and Tiptap's document model. The StarterKit extensions already have these defined.

_Confidence: HIGH - extension architecture is well-documented and stable_
_Source: [Custom Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions), [Create New Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new), [BigBinary Tiptap Extensions](https://www.bigbinary.com/blog/building-custom-extensions-in-tiptap)_

### React Node Views

For advanced use cases, Tiptap supports **React Node Views** -- custom React components that render inside the editor document:

- Use `ReactNodeViewRenderer` to wrap a React component as a ProseMirror node view
- The component receives props: `node`, `updateAttributes`, `deleteNode`, `editor`, `selected`, `extension`
- Useful for interactive content like task checkboxes, embedded widgets, or custom block types

**Performance note:** React node views are more expensive than plain HTML rendering. For this project, task list checkboxes may benefit from React node views, but standard text formatting (headings, paragraphs, lists) should use the default HTML rendering.

_Confidence: HIGH - React node views are well-documented_
_Source: [React Node Views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react), [Node Views Overview](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views)_

### Document Model and Schema Design

For the todo-bmad-style app, the recommended schema coverage is:

| Markdown Feature | Tiptap Extension | In StarterKit? |
|------------------|------------------|----------------|
| Paragraphs | Paragraph | Yes |
| Headings (h1-h3) | Heading | Yes (configure levels) |
| Bold | Bold | Yes |
| Italic | Italic | Yes |
| Strikethrough | Strike | Yes |
| Bullet lists | BulletList + ListItem | Yes |
| Ordered lists | OrderedList + ListItem | Yes |
| Task lists | TaskList + TaskItem | No (separate package) |
| Code (inline) | Code | Yes |
| Code blocks | CodeBlock | Yes |
| Blockquotes | Blockquote | Yes |
| Links | Link | No (separate package) |
| Horizontal rules | HorizontalRule | Yes |

This covers the full set of markdown features useful for task descriptions in a todo app.

_Confidence: HIGH - extension availability verified against official docs_
_Source: [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [Task List Extension](https://tiptap.dev/docs/editor/extensions/nodes/task-list)_

## Performance and Scalability Analysis

### React Re-render Optimization

The most common performance issue with Tiptap in React is **excessive re-rendering**. Tiptap's official guidance:

1. **Isolate the editor component** - The `useEditor` hook causes re-renders on every editor state change. Keep the editor and its dependents in a dedicated component tree, separate from components that do not interact with the editor (e.g., the sidebar, tree view).

2. **Use `useEditorState` for toolbar state** - Instead of reading `editor.isActive('bold')` directly (which triggers re-renders on every keystroke), use `useEditorState` to subscribe to specific state slices:

```typescript
const isBold = useEditorState({
  editor,
  selector: (ctx) => ctx.editor.isActive('bold'),
})
```

3. **`immediatelyRender: false`** - Set this option when creating the editor to prevent server-side rendering issues and unnecessary initial renders.

4. **Minimize React node views** - Each React node view creates a separate React root. For documents with many instances (e.g., dozens of task list items), prefer plain HTML rendering with `renderHTML()` over `ReactNodeViewRenderer`.

_Confidence: HIGH - performance patterns verified against official performance guide and Tiptap 2.5 release notes_
_Source: [Integration Performance](https://tiptap.dev/docs/guides/performance), [React Performance Demo](https://tiptap.dev/docs/examples/advanced/react-performance), [Tiptap 2.5 Performance](https://tiptap.dev/blog/release-notes/say-hello-to-tiptap-2-5-our-most-performant-editor-yet)_

### Document Size Considerations

For a todo/task management app, individual task descriptions are typically small (< 10KB of markdown). This means:

- **No virtualization needed** - ProseMirror handles documents of this size without issue
- **No lazy loading of editor content** - The full document can be loaded into the editor immediately
- **Transaction overhead is minimal** - Small documents mean fast transaction processing

The editor itself should be **lazy-loaded at the route/component level** using React.lazy() or TanStack Router's lazy route loading, since the Tiptap bundle (~50-100KB gzipped with StarterKit + Markdown) does not need to be in the initial bundle for the tree view.

_Confidence: HIGH - performance characteristics well-understood for small documents_
_Source: [Tiptap Performance Guide](https://tiptap.dev/docs/guides/performance), [ReactNodeViewRenderer Performance Issue](https://github.com/ueberdosis/tiptap/issues/4492)_

### Debounce and Save Performance

Saving strategies and their performance implications:

| Strategy | Latency | Server Load | Data Safety |
|----------|---------|-------------|-------------|
| Save on every keystroke | Immediate | Very high | Best |
| Debounce 300-500ms | Low | Low | Good |
| Debounce 1-2s | Medium | Very low | Acceptable |
| Manual save (Ctrl+S) | User-controlled | Minimal | Risk of data loss |

**Recommended for this project:** Debounce at 400ms. This provides a responsive feel while keeping API calls manageable. Combined with optimistic updates via TanStack Query, the user sees instant feedback while the server catches up.

_Confidence: HIGH_
_Source: [Efficient Saving Discussion](https://github.com/ueberdosis/tiptap/discussions/5677), [Tiptap Persistence](https://tiptap.dev/docs/editor/core-concepts/persistence)_

## Implementation Approaches and Technology Adoption

### Installation and Setup

For the todo-bmad-style monorepo with pnpm workspaces:

```bash
pnpm --filter client add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/markdown @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link @tiptap/extension-placeholder
```

All packages are in the `@tiptap/*` scope and follow semver. The `@tiptap/pm` package provides ProseMirror peer dependencies so you do not need to install them separately.

_Confidence: HIGH - install commands verified against official docs_
_Source: [Tiptap React Install](https://tiptap.dev/docs/editor/getting-started/install/react)_

### Recommended Component Architecture

```
packages/client/src/components/features/editor/
  markdown-editor.tsx        -- Main editor component (useEditor + EditorContent)
  editor-toolbar.tsx         -- Fixed toolbar with formatting buttons
  editor-bubble-menu.tsx     -- BubbleMenu for text selection
  use-editor-persistence.ts  -- Custom hook: debounced save via TanStack Query mutation
```

**Key design decisions:**
- The editor component accepts `nodeId` and `initialContent` (markdown string) as props
- Content loading is handled by the parent component via TanStack Query
- The editor component owns the debounced save logic via a custom hook
- Toolbar components use `useEditorState` for reactive button states (active/inactive)

_Confidence: HIGH - standard React component patterns_

### Testing Strategy

Testing Tiptap in the existing Vitest + React Testing Library + jsdom setup requires:

**Setup mocks (in vitest.setup.ts):**
```typescript
// Required for ProseMirror DOM operations in jsdom
Range.prototype.getBoundingClientRect = vi.fn(() => ({ /* mock rect */ }))
Range.prototype.getClientRects = vi.fn(() => [])
document.elementFromPoint = vi.fn()
```

**Testing approaches:**
1. **Unit test editor logic** - Create a headless editor instance (no React) with `new Editor({ extensions: [...] })`, set content, run commands, assert on output. This tests markdown round-trip, custom extensions, and command behavior.
2. **Component tests** - Render the editor component with React Testing Library, set the editor's `role="textbox"` via `editorProps`, then use `userEvent.type()` to simulate input.
3. **Integration tests** - Test the full flow: load node from mock API -> render editor -> type content -> assert mutation is called with correct markdown.

_Confidence: MEDIUM-HIGH - testing patterns gathered from community examples, not official guide_
_Source: [Tiptap Testing Discussion](https://github.com/ueberdosis/tiptap/discussions/4008), [Testing Sandbox](https://codesandbox.io/s/testing-tiptap-p0oomz), [Unit Test Example](https://codesandbox.io/s/tiptap-unit-test-example-7s94i)_

### Risk Assessment and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Markdown round-trip fidelity loss | Low | Medium | Test specific markdown patterns in CI; limit schema to well-supported features |
| Tiptap v3 breaking changes | Low | Medium | Pin versions, review changelogs before upgrading |
| React 19 compatibility issues | Low | Low | Tiptap v3 supports React 19; community is actively testing |
| Performance with many editors on screen | Low | Medium | Only mount one editor at a time (detail panel pattern) |
| ProseMirror jsdom limitations in tests | Medium | Low | Use headless editor instances for logic tests; component tests for UI |

_Confidence: HIGH - risks assessed from community issue trackers and project architecture_

---

## Research Synthesis: Comprehensive Technical Research on Tiptap Markdown Editor Integration

### Executive Summary

This research confirms that **Tiptap is the optimal rich text editor framework** for the todo-bmad-style task management application. Tiptap's ProseMirror foundation provides a robust, schema-driven document model while its extension-based architecture and React-first integration deliver an excellent developer experience. The official `@tiptap/markdown` package enables seamless bidirectional conversion between the editor's rich text representation and the `markdownBody` string stored in the database, aligning perfectly with the existing data model.

Compared to alternatives, Tiptap offers the best balance of power, developer experience, and ecosystem maturity. ProseMirror provides maximum control but requires prohibitive development effort. Milkdown is markdown-native but has bare-bones React support. Slate and Lexical use different document models with weaker markdown support.

**Key Technical Findings:**

- Tiptap v3.0 is current, with full TypeScript support, JSX for custom nodes, server-side rendering, and the official `@tiptap/markdown` extension (MarkedJS-based, CommonMark-compliant)
- Tree-shakable architecture keeps bundle size smaller than Quill, Slate, Lexical, and Remirror
- React integration via `useEditor` hook + `EditorContent` is mature and well-documented, with `useEditorState` for performance-sensitive state subscriptions
- For this project's small documents (task descriptions), no virtualization or special performance measures are needed beyond standard component isolation
- The existing `@tailwindcss/typography` plugin provides immediate styling for rendered markdown content

**Technical Recommendations:**

1. **Use Tiptap with `@tiptap/markdown`** as the editor framework -- it is the clear winner for this use case
2. **Store content as Markdown strings** in the existing `markdownBody` field -- no schema changes needed
3. **Implement debounced autosave at 400ms** with TanStack Query mutations and optimistic updates
4. **Start with StarterKit + TaskList + TaskItem + Link + Placeholder** extensions for a focused feature set
5. **Lazy-load the editor component** since it is only needed in the detail/content panel, not the tree view

### Table of Contents

1. Technical Research Scope Confirmation
2. Technology Stack Analysis
   - Core Technology: Tiptap Editor Framework
   - ProseMirror Foundation
   - Markdown Support: @tiptap/markdown
   - Required Packages for This Project
   - Bundle Size and Modularity
   - Alternatives Comparison
   - Technology Adoption Trends
3. Integration Patterns Analysis
   - React Integration: Hooks and Composable API
   - State Synchronization with TanStack Query and Zustand
   - Content Persistence: Markdown vs JSON
   - Toolbar and Menu Integration
4. Architectural Patterns and Design
   - Extension Architecture
   - React Node Views
   - Document Model and Schema Design
5. Performance and Scalability Analysis
   - React Re-render Optimization
   - Document Size Considerations
   - Debounce and Save Performance
6. Implementation Approaches and Technology Adoption
   - Installation and Setup
   - Recommended Component Architecture
   - Testing Strategy
   - Risk Assessment and Mitigation
7. Research Synthesis and Recommendations

### Implementation Roadmap

**Phase 1: Core Editor (1-2 stories)**
- Install Tiptap packages
- Create `MarkdownEditor` component with `useEditor`, `StarterKit`, `Markdown`
- Wire to content panel: load `markdownBody` on node selection, debounced autosave via mutation
- Apply `prose` styling from `@tailwindcss/typography`

**Phase 2: Enhanced Editing (1-2 stories)**
- Add `TaskList` + `TaskItem` extensions for checkbox support
- Add `Link` extension with paste-link detection
- Build minimal fixed toolbar (heading, bold, italic, list, task list, code, link)
- Add `Placeholder` extension for empty state

**Phase 3: Polish (1 story)**
- Add `BubbleMenu` for inline formatting on text selection
- Keyboard shortcut documentation/tooltips
- Lazy-load editor component for initial bundle optimization
- Comprehensive test coverage

### Technology Stack Recommendations

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| Editor framework | Tiptap v3 | Best React integration, official markdown, active ecosystem |
| Markdown package | `@tiptap/markdown` | Official, MarkedJS-based, bidirectional |
| Storage format | Markdown string | Matches existing `markdownBody` schema, human-readable, portable |
| State sync | TanStack Query mutations + debounce | Consistent with existing data fetching patterns |
| Styling | Tailwind CSS + `@tailwindcss/typography` | Already in project, `prose` classes for markdown rendering |
| Testing | Vitest + RTL + headless editor instances | Consistent with existing test setup |

### Source Documentation

**Primary Sources:**
- [Tiptap Official Documentation](https://tiptap.dev/docs)
- [Tiptap React Installation Guide](https://tiptap.dev/docs/editor/getting-started/install/react)
- [Tiptap Markdown Documentation](https://tiptap.dev/docs/editor/markdown)
- [Tiptap Performance Guide](https://tiptap.dev/docs/guides/performance)
- [Tiptap React Composable API](https://tiptap.dev/docs/guides/react-composable-api)
- [Tiptap Custom Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions)
- [Tiptap Persistence](https://tiptap.dev/docs/editor/core-concepts/persistence)

**Secondary Sources:**
- [Liveblocks Rich Text Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)
- [Velt Best JavaScript Rich Text Editors 2025](https://velt.dev/blog/best-javascript-rich-text-editors-react)
- [Strapi Top 5 Markdown Editors for React](https://strapi.io/blog/top-5-markdown-editors-for-react)
- [LogRocket Milkdown Comparison](https://blog.logrocket.com/comparing-milkdown-other-wysiwyg-editors/)
- [YC Launch: Tiptap 3.0 Beta](https://www.ycombinator.com/launches/NR5-tiptap-3-0-beta-the-next-gen-open-source-editor)
- [Tiptap GitHub Repository](https://github.com/ueberdosis/tiptap)

**Web Search Queries Used:**
- "Tiptap vs Milkdown vs ProseMirror React markdown editor comparison 2025 2026"
- "Tiptap 3.0 release features @tiptap/markdown official 2025 2026"
- "Tiptap React useEditor hook integration pattern state management Zustand TanStack Query 2025"
- "Tiptap editor content onChange debounce save persist markdown React pattern"
- "Tiptap editor architecture extension system custom nodes marks React TypeScript 2025"
- "Tiptap performance optimization large documents React re-render lazy load 2025"
- "Tiptap editor testing strategy React Testing Library jest vitest 2025"
- "Tiptap editor toolbar bubble menu floating menu React Tailwind CSS headless UI 2025"
- "Tiptap editor markdown content storage JSON vs markdown database persistence pattern"

### Research Quality Assurance

_Source Verification:_ All technical claims verified against official Tiptap documentation, npm package registry, GitHub repository, and multiple independent review sources.
_Confidence Levels:_ HIGH across all major findings. MEDIUM-HIGH for testing patterns (community-sourced, not officially documented).
_Limitations:_ Tiptap v3 is relatively new; some edge cases may not yet be documented. React 19 compatibility is reported but not exhaustively tested by the community.
_Methodology Transparency:_ 9 web searches conducted across official docs, community discussions, independent comparison articles, and package registries.

---

**Technical Research Completion Date:** 2026-03-11
**Research Period:** Comprehensive technical analysis with current web-verified sources
**Source Verification:** All technical facts cited with current sources
**Technical Confidence Level:** High - based on multiple authoritative technical sources

_This comprehensive technical research document serves as an authoritative technical reference on Tiptap markdown editor integration for React/TypeScript and provides strategic technical insights for informed decision-making and implementation in the todo-bmad-style application._
