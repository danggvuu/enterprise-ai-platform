# System UI Architecture — Enterprise AI Gateway

This document outlines the design system rules, themes (light/dark modes), loading states, and layout strategies for both portals.

## 1. Design Philosophy
We reject gaming-style layouts, glow effects, or heavy glassmorphism.
We adhere to a clean, minimal, enterprise SaaS style matching Datadog, Grafana, and Vercel:
- **Backgrounds**: Slate/Zinc dark shades for UI cards, absolute black/zinc-950 for layouts.
- **Accents**: Deep indigo, blue, emerald, and amber for indicators.
- **Typography**: Inter (sans-serif) for general content, jetbrains-mono for JSON/logs.
- **Borders**: Thin, high-contrast Slate boundaries (`border-slate-800`).

## 2. Layout Grids & Responsiveness
All dashboards follow a responsive CSS Grid:
- **Grid Layout**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for operational cards.
- **Data Tables**: Scrollable on smaller screens; columns priority-ranked for collapse on mobile.
- **Sidebars**: Collapsible to a hamburger drawer on mobile.

## 3. Loading, Error, & Empty States
Every operational view must implement:
- **Skeletons**: Tailored card and table row skeletons using standard pulses.
- **Error Boundaries**: Component-level catch blocks with a reload action button.
- **Empty States**: Clear messaging, visual icons, and call-to-actions when no data exists (e.g. no logs found).

## 4. Theme Configuration (Tailwind CSS v4)
We define the color tokens in CSS variables:
```css
:root {
  --background: #ffffff;
  --foreground: #09090b;
  --border: #e4e4e7;
  --primary: #2563eb;
  --success: #16a34a;
  --warning: #d97706;
  --destructive: #dc2626;
}

.dark {
  --background: #09090b;
  --foreground: #fafafa;
  --border: #27272a;
  --primary: #3b82f6;
  --success: #22c55e;
  --warning: #f59e0b;
  --destructive: #ef4444;
}
```
 All custom cards match these variables for effortless light/dark toggling.
