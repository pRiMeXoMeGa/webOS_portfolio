# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Type-check + production build (tsc && vite build)
npm run preview      # Preview production build locally
npm run lint         # ESLint with zero warnings allowed
npm run type-check   # TypeScript type check without emitting files
```

## Architecture

This is a browser-based WebOS portfolio — a single-page React app that simulates a desktop OS experience for Mohd Aqib's personal portfolio.

**Entry flow:** `index.html` → `src/main.jsx` → `src/App.jsx`

### Core: `src/App.jsx`

The entire OS shell lives in this single large file (~45KB). It contains:

- **Window manager** built with `useReducer`, handling actions: `OPEN_APP`, `CLOSE_APP`, `MINIMIZE_APP`, `FOCUS_APP`, `MAXIMIZE_APP`, `UPDATE_GEOMETRY`
- **Desktop icon grid** with double-click to open apps
- **Draggable/resizable window container** — drag by title bar, resize from edges/corners, z-index stacking for focus
- **Taskbar** with clock and minimized window buttons
- **All non-game app UIs inline**: About Me, Projects, Skills Matrix, Terminal, Contact
- **Hardcoded data arrays**: `PROJECTS`, `SKILLS`, `DESKTOP_ICONS`

### Game Components (TypeScript)

The three game apps are separate `.tsx` files imported into `App.jsx`:
- `src/SnakeApp.tsx` — Snake game
- `src/ChessApp.tsx` — Chess game
- `src/App2048.tsx` — 2048 puzzle

### State Management

- `useReducer` for window state (geometry, focus, minimize/maximize)
- `useState` for individual component/app state
- No global store despite Zustand being listed as a dependency

### Tech Stack

React 18 + Vite 5, Tailwind CSS, Framer Motion (animations), Lucide React (icons), TypeScript 5 (game components only).

### TypeScript Config

Strict mode is on. `noUnusedLocals` and `noUnusedParameters` are disabled. Mixed JS/TS codebase — `App.jsx` and `main.jsx` are plain JavaScript; game components are TypeScript.
