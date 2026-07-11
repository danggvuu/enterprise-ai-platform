# Component Guide — Enterprise AI UI Components

This guide details the reusable UI components implemented inside the Control Plane & Employee Portal.

## 1. Common / Shared Components

### `StatCard`
- **Purpose**: Displays key telemetry metrics (Requests, Costs, Latency).
- **Props**:
  - `title: string`
  - `value: string | number`
  - `change: number` (percentage change)
  - `trend: 'up' | 'down' | 'neutral'`
  - `loading?: boolean`

### `LoadingSkeleton`
- **Purpose**: Generates dynamic loading grids or lists matching the standard container layout.

---

## 2. Admin Portal Components

### `RoutingVisualizer`
- **Purpose**: Displays the animated flow of an incoming request through the gateway steps.
- **Sub-components**:
  - `NodeCell`: Individual stage button showing status (Success/Skipped/Error).
  - `DetailsPanel`: Interactive sidebar showing input/output payload for clicked stages.

### `ProviderScoreRadar`
- **Purpose**: Displays the score variables of a single provider.
- **Specs**: Recharts Radar chart plotting: Cost, Health, Latency, Capability, Availability, Context Window, and Compliance.

### `LiveRequestTable`
- **Purpose**: High-density logs table with instant SSE row-insertions.

---

## 3. Employee Portal Components

### `ChatInput`
- **Purpose**: Rich chat bar supporting prompt selection, multi-line growth, and file attachments.

### `ChatBubble`
- **Purpose**: Displays conversation history.
- **Includes**:
  - **Markdown & Highlight**: Automatic code highlight with copy buttons.
  - **ExecutionDetails**: Collapsible drawer showing:
    - Target Provider
    - Elapsed Latency (ms)
    - Calculated Cost ($)
    - Prompt Security scan details
