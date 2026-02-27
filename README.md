# Mohd Aqib — WebOS Portfolio

A browser-based desktop OS experience built as a personal portfolio for **Mohd Aqib**, Senior Generative AI & Full Stack Engineer. The interface simulates a full desktop environment with draggable/resizable windows, a taskbar, desktop icons, and interactive apps — all running entirely in the browser.

## Live Experience

Open the portfolio and interact with it like a real operating system:
- Double-click desktop icons to open apps
- Drag windows by their title bars
- Resize windows from any edge or corner
- Minimize, maximize, or close windows
- Use the taskbar to switch between open windows

## Apps & Features

| App | Description |
|-----|-------------|
| **About Me** | Profile panel with bio, experience stats, education, certifications, and resume download |
| **Projects** | Portfolio of 5 featured AI & full-stack projects with client details, tech stacks, and impact metrics |
| **Skills Matrix** | Animated progress bars across 4 skill categories (Generative AI, Frontend, Backend, Cloud & Database) |
| **Terminal** | Interactive bash-style terminal with commands like `help`, `whoami`, `skills`, `projects`, `contact`, `clear` |
| **Contact** | Contact information and social/professional links |
| **Snake** | Playable Snake game |
| **Chess** | Playable Chess game |
| **2048** | Playable 2048 puzzle game |

## Featured Projects (showcased in the portfolio)

- **Funnel Automation Multi-Agent System** — Unilever · LangGraph + MCP · +50% prediction accuracy
- **Enterprise Forecasting Integration** — PepsiCo · FastAPI + MCP tools for secure LLM-DB bridging
- **GenAI Playground** — LTIMindtree · Unified interface for 17+ LLMs with Responsible AI middleware
- **Real-Time Conversational UI** — LTIMindtree · WebSocket/SSE streaming with sub-100ms latency
- **Production RAG Systems** — Fractal.ai · Scalable retrieval-augmented generation for enterprise

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Language | JavaScript (JSX) with TypeScript for game components |
| Styling | Tailwind CSS + inline styles |
| Animation | Framer Motion |
| Icons | Lucide React |
| State Management | Zustand + `useReducer` for window manager |
| Build Tool | Vite 5 |
| Type Checking | TypeScript 5 |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Other Scripts

```bash
npm run build        # Production build (TypeScript check + Vite bundle)
npm run preview      # Preview the production build locally
npm run lint         # ESLint check
npm run type-check   # TypeScript type check without emitting files
```

## Project Structure

```
webOS_portfolio/
├── public/             # Static assets (logo, favicon)
├── src/
│   ├── main.jsx        # Entry point
│   ├── App.jsx         # Main OS shell — window manager, desktop, taskbar, all app UIs
│   ├── SnakeApp.tsx    # Snake game component
│   ├── ChessApp.tsx    # Chess game component
│   ├── App2048.tsx     # 2048 puzzle component
│   └── index.css       # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Window Manager

The desktop environment is implemented with a custom `useReducer`-based window manager supporting:

- **OPEN_APP** — opens a window and brings it to the top of the z-stack
- **CLOSE_APP** — closes a window and resets its state
- **MINIMIZE_APP** — hides a window to the taskbar
- **FOCUS_APP** — raises a window to the front
- **MAXIMIZE_APP** — toggles fullscreen for a window
- **UPDATE_GEOMETRY** — updates position and size after drag/resize

## Author

**Mohd Aqib**
Senior Generative AI & Full Stack Engineer
5+ years · Fractal.ai · LTIMindtree
M.Tech Information Security — MNNIT Allahabad
