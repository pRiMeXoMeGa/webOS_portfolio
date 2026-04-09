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
| **Spy Game** | Local pass-and-play or online multiplayer spy/location deduction game |
| **Word Spy** | Online multiplayer word-hint deduction game with persistent scoring |

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
| Multiplayer Backend | Firebase Realtime Database |

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

### Firebase Setup (Online Multiplayer)

The Spy Game and Word Spy modes use Firebase Realtime Database. Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.region.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> Pass & Play (local) mode works without Firebase.

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
├── public/               # Static assets (logo, favicon)
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # Main OS shell — window manager, desktop, taskbar, all app UIs
│   ├── firebase.ts       # Firebase initialization
│   ├── vite-env.d.ts     # Vite env type declarations
│   ├── SnakeApp.tsx      # Snake game
│   ├── ChessApp.tsx      # Chess game
│   ├── App2048.tsx       # 2048 puzzle
│   ├── SpyGameApp.tsx    # Spy game (local + online multiplayer)
│   ├── WordSpyApp.tsx    # Word Spy multiplayer game
│   └── index.css         # Global styles
├── .env                  # Firebase credentials (not committed)
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

## Multiplayer Games

### Spy Game
One player is secretly the spy; others share a secret location. Players discuss and vote to expose the spy before time runs out.
- Create or join a room with a 4-letter code
- Host sets a custom timer (1–60 minutes)
- Each player votes on their own device
- Supports 3–8 players

### Word Spy
Players each get a secret word. The spy gets a different but related word. Over 3 rounds of one-word hints, players try to identify the spy without revealing their own word.
- 135+ word pairs across 7 categories
- Persistent scores across rounds in the same room
- Spy rotates each round — the same player won't be spy twice in a row
- Host can force results if a player disconnects

## Author

**Mohd Aqib**
Senior Generative AI & Full Stack Engineer
5+ years · Fractal.ai · LTIMindtree
M.Tech Information Security — MNNIT Allahabad

- Email: aqib.workplace@gmail.com
- LinkedIn: linkedin.com/in/aqib-workspace
- GitHub: github.com/mohd-aqib
