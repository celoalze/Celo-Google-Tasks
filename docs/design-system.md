# 🎨 Material Design 3 (M3) Design System

**Google Tasks Desktop** faithfully adheres to Google's official [Material Design 3 (M3) Design Language](https://m3.material.io/). This document details our design token architecture, tonal surface hierarchy, typography scale, state layers, and reusable component catalog.

---

## 📑 Table of Contents
1. [Core Principles](#1-core-principles)
2. [Tonal Surface Container Hierarchy](#2-tonal-surface-container-hierarchy)
3. [Design Token Catalog](#3-design-token-catalog)
4. [Typography & Font Scaling](#4-typography--font-scaling)
5. [Shape & Radii Scale](#5-shape--radii-scale)
6. [State Layers & Opacity](#6-state-layers--opacity)
7. [Reusable UI Component Catalog](#7-reusable-ui-component-catalog)

---

## 1. Core Principles

1. **Elevation by Tone, Not Shadow**: Rather than relying on heavy drop shadows, elevation is conveyed through color shift across **Surface Containers** (`Lowest` → `Low` → `Container` → `High` → `Highest`).
2. **Intentional Color Roles**: Colors are mapped to functional roles (`primary`, `secondary`, `tertiary`, `surface`, `error`) with matching `on-*` readable foreground contrasts.
3. **Organic Shapes**: Pill-shaped action buttons (`rounded-full`), soft rounded cards (`16px`-`24px`), and spacious dialogs (`28px`).
4. **Accessible Contrast**: In both Dark and Light modes, text and interactive elements maintain strict WCAG AA/AAA contrast ratios.

---

## 2. Tonal Surface Container Hierarchy

| Surface Container Role | Tailwind Class | Dark Value | Light Value | Semantic Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Surface** | `bg-m3-surface` | `#1b1b1b` | `#f8fafd` | App base canvas, frameless titlebar, sidebar background |
| **Surface Dim** | `bg-m3-surface-dim` | `#141414` | `#d9dce1` | Recessed zones, backdrop backgrounds |
| **Surface Bright** | `bg-m3-surface-bright` | `#37393b` | `#ffffff` | Elevated hover surfaces in dark mode |
| **Surface Container Lowest** | `bg-m3-surface-container-lowest` | `#0e0e0f` | `#ffffff` | Deepest recessed card level |
| **Surface Container Low** | `bg-m3-surface-container-low` | `#161616` | `#f2f4f8` | Secondary panels, subtle item highlights |
| **Surface Container** | `bg-m3-surface-container` | `#131314` | `#ffffff` | Main task view card, standard content containers |
| **Surface Container High** | `bg-m3-surface-container-high` | `#2d2f31` | `#e9eef6` | Modals, dialogs, dropdown menus, popovers |
| **Surface Container Highest**| `bg-m3-surface-container-highest`| `#37393b` | `#e1e3e1` | Input fields, subtask rows, "+ Add Task" button |

---

## 3. Design Token Catalog

### 3.1 Accent Roles
```
Primary:           bg-m3-primary                text-m3-on-primary
Primary Container: bg-m3-primary-container      text-m3-on-primary-container
Secondary:         bg-m3-secondary              text-m3-on-secondary
Secondary Cont:    bg-m3-secondary-container    text-m3-on-secondary-container
Tertiary:          bg-m3-tertiary               text-m3-on-tertiary
Tertiary Cont:     bg-m3-tertiary-container     text-m3-on-tertiary-container
```

* **Dark Mode Primary**: `#7fcfff` (Soft Cyan Blue) | **On-Primary**: `#003366`
* **Light Mode Primary**: `#0b57d0` (Google Blue) | **On-Primary**: `#ffffff`

### 3.2 Semantic Status Tokens
* `text-m3-star` / `bg-m3-star`: Google Star highlight (`#fcc408` Dark / `#fbbc04` Light).
* `text-m3-overdue`: Overdue alert (`#f28b82` Dark / `#b3261e` Light).
* `text-m3-success`: Success & completion confirmation (`#81c995` Dark / `#1e8e3e` Light).
* `text-m3-important`: High-priority task flag (`#7fcfff` Dark / `#1a73e8` Light).
* `text-m3-error`: Error states & destructive buttons (`#f28b82` Dark / `#b3261e` Light).

---

## 4. Typography & Font Scaling

### Font Family
The application bundles **Google Sans** locally in `src/assets/fonts/` for offline use:
```css
font-family: 'Google Sans', 'Google Sans Text', 'Segoe UI', Roboto, sans-serif;
```

### Dynamic Font Scaling
Font scaling is driven by the CSS variable `--font-scale`:
```css
html {
  font-size: calc(16px * var(--font-scale, 1));
}
```

The scale is managed in `src/store/useThemeStore.ts`:
* **Small**: `var(--font-scale) = 0.9`
* **Normal**: `var(--font-scale) = 1.0` (Default)
* **Large**: `var(--font-scale) = 1.15`

---

## 5. Shape & Radii Scale

Configured in `tailwind.config.js`:
* `rounded-m3-xs` (`4px`): Tiny indicators, badges.
* `rounded-m3-sm` (`8px`): Small chips, tags, tooltip bubbles.
* `rounded-m3-md` (`12px`): Input boxes, subtask list items.
* `rounded-m3-lg` (`16px`): Cards, task list containers.
* `rounded-m3-xl` (`20px`): Floating quick-add bars.
* `rounded-m3-2xl` (`24px`): Main task content card, sheet panels.
* `rounded-m3-3xl` (`28px`): M3 Dialogs, full modal windows.
* `rounded-full` (`9999px`): Action buttons, checkboxes, nav pills, icon buttons.

---

## 6. State Layers & Opacity

M3 interactive feedback is applied via alpha layers on top of base elements:
* **Hover State**: `hover:bg-m3-on-surface/10` or `hover:bg-m3-primary/10`.
* **Pressed / Active State**: `active:bg-m3-on-surface/15` or `active:bg-m3-primary/20`.
* **Focus State**: `focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none`.
* **Disabled State**: `disabled:opacity-40 disabled:cursor-not-allowed`.

---

## 7. Reusable UI Component Catalog

Located in `src/components/ui/`.

### 7.1 `M3Button`
Multi-variant button supporting pill and rounded shapes.

```tsx
import { M3Button } from '../ui/M3Button';

<M3Button variant="filled" size="md" icon="add" onClick={handleCreate}>
  Create Task
</M3Button>

<M3Button variant="tonal" size="sm" icon="check">
  Mark Complete
</M3Button>

<M3Button variant="danger" size="sm" icon="delete" onClick={handleDelete}>
  Delete
</M3Button>
```

#### Props:
* `variant?: 'text' | 'filled' | 'tonal' | 'elevated' | 'danger'`
* `size?: 'sm' | 'md' | 'lg'`
* `shape?: 'pill' | 'rounded'`
* `icon?: string` (Google Material Symbol name)
* `iconPosition?: 'leading' | 'trailing'`

---

### 7.2 `M3IconButton`
Circular icon button with hover state layer and optional active state.

```tsx
import { M3IconButton } from '../ui/M3IconButton';

<M3IconButton
  icon="star"
  active={isStarred}
  title="Star task"
  onClick={toggleStar}
/>
```

---

### 7.3 `M3Checkbox`
Animated circular checkbox matching Google Tasks mobile and web UI.

```tsx
import { M3Checkbox } from '../ui/M3Checkbox';

<M3Checkbox
  checked={task.completed}
  onChange={() => toggleTask(task.id)}
  title="Toggle completion"
/>
```

---

### 7.4 `M3Dialog`
Accessible full-screen modal with backdrop blur, keyboard dismissal, and M3 28px border radius.

```tsx
import { M3Dialog } from '../ui/M3Dialog';

<M3Dialog
  isOpen={isDialogOpen}
  onClose={() => setDialogOpen(false)}
  title="Delete Task"
  description="Are you sure you want to permanently delete this task?"
  actions={
    <>
      <M3Button variant="text" onClick={() => setDialogOpen(false)}>Cancel</M3Button>
      <M3Button variant="danger" onClick={confirmDelete}>Delete</M3Button>
    </>
  }
>
  <p className="text-sm">This action cannot be undone.</p>
</M3Dialog>
```

---

### 7.5 `M3NavItem`
High-precision sidebar row with active pill container (`bg-m3-primary-container`), icon slot, and counter badge.

```tsx
import { M3NavItem } from '../ui/M3NavItem';

<M3NavItem
  label="Today"
  icon="today"
  active={currentFilter === 'today'}
  badge={todayTasksCount}
  onClick={() => selectFilter('today')}
/>
```

---

### 7.6 `M3TextField`
Filled-style text field with bottom indicator line and error message caption.

```tsx
import { M3TextField } from '../ui/M3TextField';

<M3TextField
  label="Task Title"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="Enter title..."
  error={titleError}
/>
```
