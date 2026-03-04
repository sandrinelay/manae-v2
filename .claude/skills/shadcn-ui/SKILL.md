---
name: shadcn-ui
description: "ShadCN UI component patterns, forms, data tables, and page layouts. Use when building interfaces with ShadCN components, creating forms with react-hook-form, tables with TanStack Table, or designing page layouts."
---

# ShadCN UI Patterns

## Critical Rules

- **Always use ShadCN primitives first** — before building custom components.
- **Never rebuild keyboard or focus behavior** — use the component primitives.
- **Never mix primitive systems** — don't combine Radix, Headless UI, React Aria in the same surface.
- **Never use `h-screen`** — use `h-dvh` for correct mobile viewport.
- **Empty states must have one clear next action** — never blank screens.
- **No gradients or glow effects** unless explicitly requested.

## Installation & Setup

- Install components individually with `npx shadcn@latest add <component>` — never install all at once.
- Components are copied to `src/components/ui/` — they are yours to customize.
- Configure `components.json` for path aliases and styling preferences.
- Use `cn()` from `src/lib/utils` for class merging (clsx + tailwind-merge).

## Component Usage

- **Always use ShadCN primitives** before building custom components:
  - `Button` for all clickable actions (with appropriate `variant` and `size`)
  - `Card` for content containers
  - `Dialog` for modal overlays
  - `Sheet` for slide-out panels
  - `DropdownMenu` for action menus
  - `Select` for option picking
  - `Table` for data display
  - `Form` + `Input` + `Label` for forms
  - `Badge` for tags and status indicators
  - `Tabs` for content switching
  - `Toast` / `Sonner` for notifications

## Forms

- Use `react-hook-form` + `zod` with ShadCN's `Form` component:
  ```tsx
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })
  ```
- Stack form fields with `space-y-4`.
- Use `grid gap-4 md:grid-cols-2` for side-by-side fields on desktop.
- Show validation errors inline with `FormMessage`.
- Use `FormDescription` for helper text below fields.

## Data Tables

- Use ShadCN `DataTable` pattern with `@tanstack/react-table`:
  - Define columns with type-safe `ColumnDef`.
  - Support sorting, filtering, and pagination.
  - Add row actions via `DropdownMenu`.
- Use `tabular-nums` on numeric columns for alignment.
- Add loading skeletons with ShadCN `Skeleton` for async data.
- **Toolbar pattern**: search input + result counter + limit selector in every table.
- Hide columns progressively by breakpoint: `hidden sm:table-cell`, `hidden md:table-cell`.

## Dialogs & Alerts

- Use `Dialog` for informational or form-based modals.
- Use `AlertDialog` for destructive or irreversible actions — never a plain `Dialog`.
- Keep dialog content focused — one primary action per dialog.
- Always provide a way to dismiss (close button, escape key, outside click).

## Page Layout Pattern

Structure pages with Cards for consistent visual hierarchy:

```tsx
// Header → Cards → Footer pattern
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
    <Button>Primary Action</Button>
  </div>

  <Card>
    <CardHeader><CardTitle>Section</CardTitle></CardHeader>
    <CardContent>{/* content */}</CardContent>
  </Card>
</div>
```

- Multi-Card forms: split complex forms into logical Card sections.
- Use `CardHeader` + `CardTitle` + `CardDescription` for section context.

## Charts

- Use `ChartContainer` from ShadCN with Recharts for data visualization.
- Wrap charts in a `Card` with descriptive `CardHeader`.
- Always include a `ChartTooltip` for data point details.

## File Upload

- Use a `FileUpload` dropzone component with drag-and-drop support.
- Show preview for images, file name + size for documents.
- Validate file type and size client-side before upload.

## Theming

- Use CSS variables from the ShadCN theme system: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, etc.
- Never hardcode hex colors — always use semantic tokens.
- Support dark mode via the `dark` class on `<html>` — CSS variables handle the switch.
- Limit accent color usage to one per view.

## Accessibility

- All icon-only buttons must have `aria-label`.
- Use `sr-only` class for screen-reader-only text.
- Ensure all interactive elements have visible focus states (ShadCN handles this by default).
- Use `role` and `aria-*` attributes when composing custom components.
- Never block paste in `input` or `textarea` elements.

## Do

- Use ShadCN primitives before building anything custom — check the component library first.
- Use `cn()` from `@/lib/utils` for all conditional class merging.
- Use `AlertDialog` for destructive actions — never a plain `Dialog`.
- Use `FormMessage` for inline validation errors in every form field.
- Use `Skeleton` components for loading states in async data areas.
- Provide `aria-label` on every icon-only `Button`.
- Use `Sheet` for mobile navigation and side panels instead of custom drawers.
- Wrap charts in `Card` with descriptive `CardHeader` for context.
- Install components individually with `npx shadcn@latest add` — only what you need.

## Don't

- Don't rebuild keyboard navigation, focus traps, or dismiss behavior — use the primitives.
- Don't mix Radix, Headless UI, and React Aria in the same surface.
- Don't use `h-screen` — use `h-dvh` for correct mobile viewport height.
- Don't add gradients or glow effects unless explicitly requested.
- Don't leave empty states blank — always provide a message and a clear next action.
- Don't hardcode hex colors — use semantic tokens from the ShadCN theme system.
- Don't use `Dialog` for destructive confirmations — use `AlertDialog`.
- Don't install all ShadCN components at once — install individually as needed.
- Don't block paste on `input` or `textarea` elements.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Custom modal from scratch** | Missing focus trap, escape handling, scroll lock | Use `Dialog` or `AlertDialog` from ShadCN |
| **Plain `Dialog` for delete** | No forced confirmation, easy accidental deletion | Use `AlertDialog` with explicit confirm/cancel |
| **Mixing component libraries** | Conflicting styles, broken focus management | Stick to ShadCN/Radix for all primitives |
| **`select` HTML element** | Inconsistent styling, no search/filter support | Use ShadCN `Select` or `Combobox` |
| **Manual form validation** | Inconsistent error handling, no schema reuse | Use `react-hook-form` + `zod` + ShadCN `Form` |
| **Blank empty state** | User confusion, no clear path forward | Add message + primary action `Button` |
| **Inline hex colors** | Breaks dark mode, inconsistent theming | Use `bg-background`, `text-foreground`, etc. |
| **`onClick` on `div`** | Not keyboard accessible, no focus state | Use `Button` with appropriate `variant` |

## Animation

- Never add animation unless explicitly requested.
- Use `transition-colors` for hover/focus state changes.
- Keep interaction feedback under 200ms.
- Avoid animating layout properties (`width`, `height`, `margin`, `padding`) — use `transform` and `opacity` only.
- Respect `prefers-reduced-motion` media query.
