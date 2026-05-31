# 🟢 Oh My AgentWA (Collaborative AI Multi-Agent & Privacy Shield Hub)

Welcome to the official repository of **Oh My AgentWA**, an advanced sandbox and real-time operations dashboard for collaborative AI Employees integrated into WhatsApp chats, supported by an advanced **Privacy Shield Interceptor** and a **live simulation engine using Gemini**.

Designed explicitly for Indonesian UMKM (Small-Medium Enterprises), this system orchestrates multiple specialized AI agents working together as a high-conversion sales force, while strictly respecting customer data protection compliance (zero-leakage policies).

---

## 🌟 Key Capabilities & Key Architectural Features

### 1. 🏢 Interactive Gather-Style Virtual Office floor plan (`pro-max`)
*   **Real-Time Autonomous Agent Emulation**: Watch the interactive 2D office layout where virtual AI Employee pets (Siti Rahma, Budi Santoso, Yusuf Subagja, and Closing Admin) walk around their designated desks, the Gemini Core CPU, coffee pantry, and discussion lounge.
*   **Direct Click Navigation**: Simply select any agent from the quick control panel or map, and click on any custom coordinate inside the map floor to command them to walk there dynamically via fluid spring physics animations (`motion/react`).

### 2. 🛡️ Privacy Shield Interceptor & Security HUD
*   **Line-Level PII Masking Coverage (100% Compliant)**: Intercepts raw message flows and automatically filters private data such as phone numbers, emails, addresses, credit cards, or National ID (NIK) templates before they reach cloud servers.
*   **Data Reduction Indicators**: Real-time evaluation displays the precise compression delta metrics (`Raw Info` vs `Sanitized Info`) with readable visual progress bars and dynamic indicators conforming to the **Pro-Max WCAG AA/AAA guidelines**.

### 3. 📊 High-Contrast Traffic Diagnostic Analytics
*   **Smooth Metric Updates**: KPI values and counts (Total Sesi Volume, Kecepatan Respon, AI Accuracy Rating) animate gracefully on update using keyframe scale-fades.
*   **Interactive Traffic Saturated Warning**: Automatically triggers a glowing Red `[TRAFFIC PEAK SHIELD]` warning banner when message rates trigger simulator burst conditions, ensuring dynamic load optimization is highlighted.
*   **WCAG 7:1+ Contrast Ratio compliance**: Complete typography review utilizing Zinc-200 and custom high-contrast palettes on pure black slate backdrops.

### 4. 🔗 Advanced Multi-Agent Intelligence Delegation Harness
*   **Sales Closing Priority Routing**: Instantly identifies buyers showing high purchase intent (e.g., ordering, buying, discount inquiries, checkout) and maps them directly to high-priority Sales Agent closing flows.
*   **Autonomous Escalation Handoff**: Fluidly transitions messages across designated agents (CS Front-Office, Bonus & Nego, Complaint, billing database) based on intent recognition scores.

---

## 🛠️ Technology Stack

*   **Runtime Core**: React 18+ paired with **Vite** and **TypeScript** for supreme compilation safety.
*   **Design Framework**: Custom-themed **Tailwind CSS** highlighting structured negative space, pure dark cosmic aesthetics, and beautiful spacing clamps.
*   **Motion and Interaction**: Powered entirely by `motion/react` for micro-animations, slide-ins, spring-damped office walks, and smooth numerical status replacements.
*   **Diagrams and Monitoring**: Real-time statistics rendered with high-contrast **Recharts** area and line visual components.

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have Node.js (v18+) and npm installed on your system.

### Installation
1. Install complete packages and background dependencies:
   ```bash
   npm install
   ```

2. Generate local configurations by creating an environment file:
   ```bash
   cp .env.example .env
   ```

3. Launch development workspace with Hot-Reload:
   ```bash
   npm run dev
   ```

4. Build application optimized for production container assets:
   ```bash
   npm run build
   ```

---

## 📁 Key File Structure

*   `/src/components/LandingPage.tsx` — Serves as the primary viewport, incorporating the interactive Gather-style virtual office canvas and active simulation loops.
*   `/src/components/DashboardAnalytics.tsx` — High-efficiency metrics analyzer containing responsive chart renderers, animated metric outputs, and traffic burst detectors.
*   `/src/components/PrivacyShieldDashboard.tsx` — Redaction interceptor monitoring raw PII exposures and rendering side-by-side compliance audits.
*   `/src/components/AgentDelegationHarness.tsx` — Intent-matching system routes messages dynamically with priority closing rules.
*   `/src/index.css` — Centralized global style manager featuring smooth clamps, custom font imports, and strict WCAG styling.

---

## 🎨 Visual System & Zoom Optimization Guidelines

This application leverages highly responsive layout variables. Spacing attributes (`padding`, `gap`, `margins`) dynamically adapt across custom zoom factor alterations (`80%` through `100%`) utilizing fluid math clamp formulas:
```css
#dashboard-analytics-card {
  padding: clamp(1rem, 2vw, 1.75rem);
  gap: clamp(1rem, 2vw, 1.75rem);
}
```
This preserves pixel-perfect grid borders and ensures headers/footers do not wrap unnaturally when desktop scaling alters.
