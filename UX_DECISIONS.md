# UX Decisions & Rationale

This document details the user experience choices made for the Enterprise AI Gateway frontend portals.

## 1. Portal Segmentation: Employee vs. SRE Admin
- **Employee Portal**: High-focus, conversational layout. Sidebar collapses automatically to maximize reading space. The chat input mimics Claude/Gemini with file upload attachments, model selectors, and clear visual indicators of which provider is currently handling the request.
- **Admin Control Plane**: Density-first dashboard layout. Operations teams require high information density. We display dense tables with minimal padding, inline filters, and immediate expandable detail sheets rather than navigating away from the page.

## 2. Dynamic Execution Details in Chat
We include a collapsible "Execution Details" panel inside each assistant chat bubble:
- **Why**: SREs and enterprise managers want to know which model served the response, the exact cost incurred, token count, cache hit/miss status, and whether the safety engine scanned for PII or Prompt Injection.
- **How**: Toggling the panel reveals a micro-dashboard for that single completion request.

## 3. Real-Time Update vs. Fatigue Prevention
- **Dashboard & Requests Monitor**: Update in real-time via Server-Sent Events (SSE). 
- **Fatigue Prevention**: Tables display an indicator like "N new requests since view" or update in place smoothly without shifting rows unexpectedly. Large charts update on a 5-second tick to prevent constant jitter.

## 4. Visual Routing Engine UX
- **The Challenge**: Administrators struggle to understand routing rules (weight, cost, latency, compliance filters).
- **The Solution**: An interactive flow diagram showing a request traversing:
  `Prompt Scanner -> PII Detector -> Policy Engine -> Score Engine -> Circuit Breaker -> Provider`
- Clicking any node opens a details pane showing the exact calculations (e.g. how the Score Engine computed Bedrock's score vs OpenAI).
