import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// TYPES
// ============================================================
interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  isMerged: boolean;
}

type GridSize = 4 | 5;
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface GameState {
  tiles: Tile[];
  score: number;
  status: "playing" | "won" | "over" | "continue";
  gridSize: GridSize;
}

// ============================================================
// CONSTANTS
// ============================================================
const WIN_TARGET = 4096;
const HS_KEY_4 = "aqib_os_2048_hs_4";
const HS_KEY_5 = "aqib_os_2048_hs_5";
const BT_KEY_4 = "aqib_os_2048_bt_4";
const BT_KEY_5 = "aqib_os_2048_bt_5";

// Tile color map — teal/blue palette matching OS theme
const TILE_COLORS: Record<number, { bg: string; fg: string; shadow: string }> = {
  0:    { bg: "#1e293b",  fg: "transparent",  shadow: "none" },
  2:    { bg: "#1e3a5f",  fg: "#e2e8f0",       shadow: "none" },
  4:    { bg: "#1e4976",  fg: "#e2e8f0",       shadow: "none" },
  8:    { bg: "#0e7490",  fg: "#f0fdfa",       shadow: "0 0 12px #0e749044" },
  16:   { bg: "#0891b2",  fg: "#f0fdfa",       shadow: "0 0 14px #0891b244" },
  32:   { bg: "#06b6d4",  fg: "#0f172a",       shadow: "0 0 16px #06b6d466" },
  64:   { bg: "#00d4aa",  fg: "#0f172a",       shadow: "0 0 20px #00d4aa66" },
  128:  { bg: "#0066ff",  fg: "#f0fdfa",       shadow: "0 0 22px #0066ff66" },
  256:  { bg: "#2563eb",  fg: "#f0fdfa",       shadow: "0 0 24px #2563eb66" },
  512:  { bg: "#7c3aed",  fg: "#f0fdfa",       shadow: "0 0 26px #7c3aed66" },
  1024: { bg: "#9333ea",  fg: "#f0fdfa",       shadow: "0 0 30px #9333ea88" },
  2048: { bg: "#c026d3",  fg: "#fdf4ff",       shadow: "0 0 36px #c026d388" },
  4096: { bg: "linear-gradient(135deg, #f59e0b, #ef4444)", fg: "#fefce8", shadow: "0 0 40px #f59e0baa" },
};

function getTileStyle(value: number) {
  const key = Math.min(value, 4096);
  return TILE_COLORS[key] ?? { bg: "#0f172a", fg: "#f1f5f9", shadow: "0 0 40px #ffffff44" };
}

// Font size based on digit count
function tileFontSize(value: number, cellPx: number): number {
  const digits = String(value).length;
  if (digits <= 2) return cellPx * 0.42;
  if (digits === 3) return cellPx * 0.35;
  if (digits === 4) return cellPx * 0.28;
  return cellPx * 0.22;
}

// ============================================================
// LOCALSTORAGE HELPERS
// ============================================================
function getHS(size: GridSize): number {
  try { return parseInt(localStorage.getItem(size === 4 ? HS_KEY_4 : HS_KEY_5) ?? "0") || 0; }
  catch { return 0; }
}
function saveHS(size: GridSize, score: number) {
  try {
    const key = size === 4 ? HS_KEY_4 : HS_KEY_5;
    if (score > getHS(size)) localStorage.setItem(key, String(score));
  } catch { /* ignore */ }
}
function getBT(size: GridSize): number {
  try { return parseInt(localStorage.getItem(size === 4 ? BT_KEY_4 : BT_KEY_5) ?? "0") || 0; }
  catch { return 0; }
}
function saveBT(size: GridSize, tile: number) {
  try {
    const key = size === 4 ? BT_KEY_4 : BT_KEY_5;
    if (tile > getBT(size)) localStorage.setItem(key, String(tile));
  } catch { /* ignore */ }
}

// ============================================================
// TILE ID GENERATOR
// ============================================================
let nextId = 1;
function newId() { return nextId++; }

// ============================================================
// GAME LOGIC
// ============================================================

// Convert tiles array to 2D grid of values
function tilesToGrid(tiles: Tile[], size: GridSize): number[][] {
  const grid: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  for (const t of tiles) grid[t.row][t.col] = t.value;
  return grid;
}

// Get all empty cells
function emptyCells(tiles: Tile[], size: GridSize): [number, number][] {
  const grid = tilesToGrid(tiles, size);
  const cells: [number, number][] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === 0) cells.push([r, c]);
  return cells;
}

// Spawn a new tile (90% chance of 2, 10% chance of 4)
function spawnTile(tiles: Tile[], size: GridSize): Tile[] {
  const empty = emptyCells(tiles, size);
  if (empty.length === 0) return tiles;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  return [...tiles, { id: newId(), value, row, col, isNew: true, isMerged: false }];
}

// Slide a single row/column LEFT — returns { row, score }
function slideLeft(line: number[]): { result: number[]; score: number } {
  const filtered = line.filter(v => v !== 0);
  const result: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < line.length) result.push(0);
  return { result, score };
}

// Move the board in a direction — returns new tiles + score delta
function moveBoard(
  tiles: Tile[],
  direction: Direction,
  size: GridSize
): { tiles: Tile[]; scoreDelta: number; moved: boolean } {
  const grid = tilesToGrid(tiles, size);
  let totalScore = 0;
  let moved = false;

  // We normalize: always slide LEFT on the extracted line
  // then map back to original coordinates
  const newGrid: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  const mergedAt: Set<string> = new Set();

  for (let i = 0; i < size; i++) {
    let line: number[] = [];

    if (direction === "LEFT")  line = grid[i].slice();
    if (direction === "RIGHT") line = grid[i].slice().reverse();
    if (direction === "UP")    line = grid.map(r => r[i]);
    if (direction === "DOWN")  line = grid.map(r => r[i]).reverse();

    const { result, score } = slideLeft(line);
    totalScore += score;

    // Check if anything moved
    if (result.some((v, idx) => v !== line[idx])) moved = true;

    // Map back
    for (let j = 0; j < size; j++) {
      if (direction === "LEFT")  { newGrid[i][j] = result[j]; }
      if (direction === "RIGHT") { newGrid[i][size - 1 - j] = result[j]; }
      if (direction === "UP")    { newGrid[j][i] = result[j]; }
      if (direction === "DOWN")  { newGrid[size - 1 - j][i] = result[j]; }
    }
  }

  if (!moved) return { tiles, scoreDelta: 0, moved: false };

  // Rebuild tiles array from newGrid
  // We try to match existing tiles to track merges/moves
  const newTiles: Tile[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = newGrid[r][c];
      if (val === 0) continue;
      // Find if this tile was merged (value doubled from original)
      const isMerged = mergedAt.has(`${r},${c}`) || false;
      newTiles.push({
        id: newId(),
        value: val,
        row: r,
        col: c,
        isNew: false,
        isMerged: false, // will be set below
      });
    }
  }

  // Mark merged tiles (value exists in newGrid but doubled)
  // Simple heuristic: if value appears in newGrid but wasn't in old grid at that pos
  const oldGrid = tilesToGrid(tiles, size);
  for (const t of newTiles) {
    if (oldGrid[t.row][t.col] !== t.value && t.value > 0) {
      // Could be a merge or a slide — mark merges
      const halfExists = tiles.some(ot => ot.value === t.value / 2);
      if (halfExists && t.value > 2) t.isMerged = true;
    }
  }

  return { tiles: newTiles, scoreDelta: totalScore, moved: true };
}

// Check if any moves remain
function hasMovesLeft(tiles: Tile[], size: GridSize): boolean {
  if (emptyCells(tiles, size).length > 0) return true;
  const grid = tilesToGrid(tiles, size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (r + 1 < size && grid[r + 1][c] === v) return true;
      if (c + 1 < size && grid[r][c + 1] === v) return true;
    }
  }
  return false;
}

// ============================================================
// INITIAL STATE
// ============================================================
function createInitialState(size: GridSize): GameState {
  let tiles: Tile[] = [];
  tiles = spawnTile(tiles, size);
  tiles = spawnTile(tiles, size);
  return { tiles, score: 0, status: "playing", gridSize: size };
}

// ============================================================
// TILE COMPONENT — with CSS animations
// ============================================================
interface TileProps {
  tile: Tile;
  cellPx: number;
  gap: number;
}

function TileCell({ tile, cellPx, gap }: TileProps) {
  const style = getTileStyle(tile.value);
  const fontSize = tileFontSize(tile.value, cellPx);

  const x = tile.col * (cellPx + gap) + gap;
  const y = tile.row * (cellPx + gap) + gap;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: cellPx,
        height: cellPx,
        borderRadius: 10,
        background: style.bg,
        boxShadow: style.shadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize,
        color: style.fg,
        userSelect: "none",
        // Smooth slide via CSS transition on left/top
        transition: "left 0.12s ease, top 0.12s ease",
        // Pop animation for new/merged tiles
        animation: tile.isNew
          ? "tile-appear 0.15s ease forwards"
          : tile.isMerged
          ? "tile-merge 0.18s ease forwards"
          : "none",
        zIndex: tile.isMerged ? 2 : 1,
        letterSpacing: -1,
      }}
    >
      {tile.value}
    </div>
  );
}

// ============================================================
// SCORE FLASH — shows +score delta
// ============================================================
interface ScoreFlashProps { delta: number; key: number; }
function ScoreFlash({ delta }: ScoreFlashProps) {
  if (delta === 0) return null;
  return (
    <div style={{
      position: "absolute", top: -8, right: 0,
      color: "#00d4aa", fontSize: 13, fontWeight: 800,
      animation: "score-fly 0.8s ease forwards",
      pointerEvents: "none", zIndex: 99,
    }}>
      +{delta}
    </div>
  );
}

// ============================================================
// MAIN 2048 APP
// ============================================================
export default function App2048() {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [gs, setGs] = useState<GameState>(() => createInitialState(4));
  const [highScore, setHighScore] = useState(() => getHS(4));
  const [bestTile, setBestTile] = useState(() => getBT(4));
  const [flashDelta, setFlashDelta] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  // Touch tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const MIN_SWIPE = 30;

  // Cell size based on grid
  const cellPx = gridSize === 4 ? 90 : 72;
  const gap = 10;
  const boardPx = gridSize * cellPx + (gridSize + 1) * gap;

  // ── APPLY MOVE ─────────────────────────────────────────
  const applyMove = useCallback((dir: Direction) => {
    setGs(prev => {
      if (prev.status === "over") return prev;
      if (prev.status === "won") return prev; // locked unless continue pressed

      const { tiles, scoreDelta, moved } = moveBoard(prev.tiles, dir, prev.gridSize);
      if (!moved) return prev;

      // Spawn new tile
      const afterSpawn = spawnTile(tiles, prev.gridSize);

      const newScore = prev.score + scoreDelta;
      const maxTile = Math.max(...afterSpawn.map(t => t.value));

      // Persist records
      saveHS(prev.gridSize, newScore);
      saveBT(prev.gridSize, maxTile);
      setHighScore(getHS(prev.gridSize));
      setBestTile(getBT(prev.gridSize));

      if (scoreDelta > 0) {
        setFlashDelta(scoreDelta);
        setFlashKey(k => k + 1);
      }

      let status: GameState["status"] = "playing";
      if (maxTile >= WIN_TARGET && prev.status === "playing") status = "won";
      else if (!hasMovesLeft(afterSpawn, prev.gridSize)) status = "over";

      return { ...prev, tiles: afterSpawn, score: newScore, status };
    });
  }, []);

  // ── KEYBOARD ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "UP", w: "UP", W: "UP",
        ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
        ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
        ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
      };
      if (map[e.key]) {
        e.preventDefault();
        applyMove(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove]);

  // ── SWIPE ──────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? "RIGHT" : "LEFT");
    else applyMove(dy > 0 ? "DOWN" : "UP");
  }, [applyMove]);

  // ── NEW GAME ───────────────────────────────────────────
  const newGame = useCallback((size?: GridSize) => {
    const s = size ?? gridSize;
    setGridSize(s);
    setGs(createInitialState(s));
    setHighScore(getHS(s));
    setBestTile(getBT(s));
  }, [gridSize]);

  // ── CONTINUE after win ─────────────────────────────────
  const continueGame = useCallback(() => {
    setGs(prev => ({ ...prev, status: "continue" }));
  }, []);

  // ── RENDER ─────────────────────────────────────────────
  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes tile-appear {
          0%   { transform: scale(0);   opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes tile-merge {
          0%   { transform: scale(1);   }
          40%  { transform: scale(1.2); }
          100% { transform: scale(1);   }
        }
        @keyframes score-fly {
          0%   { transform: translateY(0);   opacity: 1; }
          100% { transform: translateY(-32px); opacity: 0; }
        }
        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div style={{
        height: "100%", background: "#0f172a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        fontFamily: "-apple-system, sans-serif",
        overflowY: "auto", padding: "16px 12px",
        gap: 14,
      }}>
        {/* Header */}
        <div style={{ width: boardPx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#00d4aa", fontSize: 26, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>2048</div>
            <div style={{ color: "#334155", fontSize: 10, textTransform: "uppercase", letterSpacing: 2 }}>
              Target: {WIN_TARGET.toLocaleString()}
            </div>
          </div>

          {/* Score cards */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Score", value: gs.score, accent: true },
              { label: "Best",  value: highScore, accent: false },
              { label: "Top Tile", value: bestTile, accent: false },
            ].map(s => (
              <div key={s.label} style={{
                background: "#1e293b", borderRadius: 10,
                padding: "6px 14px", textAlign: "center", minWidth: 64,
                border: s.accent ? "1px solid #00d4aa33" : "1px solid #334155",
                position: "relative",
              }}>
                <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                <div style={{ color: s.accent ? "#00d4aa" : "#f1f5f9", fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>
                  {s.value.toLocaleString()}
                </div>
                {s.accent && <ScoreFlash delta={flashDelta} key={flashKey} />}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: boardPx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Grid size toggle */}
          <div style={{ display: "flex", background: "#1e293b", borderRadius: 8, padding: 3, gap: 3 }}>
            {([4, 5] as GridSize[]).map(s => (
              <button key={s} onClick={() => newGame(s)}
                style={{
                  background: gridSize === s ? "#00d4aa22" : "transparent",
                  border: gridSize === s ? "1px solid #00d4aa44" : "1px solid transparent",
                  borderRadius: 6, color: gridSize === s ? "#00d4aa" : "#475569",
                  fontSize: 12, padding: "4px 14px", cursor: "pointer", fontWeight: 700,
                }}>
                {s}×{s}
              </button>
            ))}
          </div>

          <button onClick={() => newGame()}
            style={{
              background: "linear-gradient(135deg, #00d4aa22, #0066ff22)",
              border: "1px solid #00d4aa44",
              borderRadius: 8, color: "#00d4aa",
              fontSize: 12, padding: "6px 18px", cursor: "pointer", fontWeight: 700,
            }}>
            New Game
          </button>
        </div>

        {/* Board */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            position: "relative",
            width: boardPx, height: boardPx,
            background: "#0f172a",
            borderRadius: 14,
            border: "1px solid #1e293b",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          {/* Background grid cells */}
          {Array(gridSize).fill(null).map((_, r) =>
            Array(gridSize).fill(null).map((_, c) => (
              <div key={`${r},${c}`} style={{
                position: "absolute",
                left: c * (cellPx + gap) + gap,
                top: r * (cellPx + gap) + gap,
                width: cellPx, height: cellPx,
                background: "#1e293b",
                borderRadius: 10,
              }} />
            ))
          )}

          {/* Tiles */}
          {gs.tiles.map(tile => (
            <TileCell key={tile.id} tile={tile} cellPx={cellPx} gap={gap} />
          ))}

          {/* Win overlay */}
          {gs.status === "won" && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              background: "rgba(0, 212, 170, 0.88)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
              animation: "overlay-in 0.3s ease",
              zIndex: 10,
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a" }}>🎉 {WIN_TARGET}!</div>
              <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>You reached {WIN_TARGET.toLocaleString()}!</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={continueGame} style={{
                  background: "#0f172a", color: "#00d4aa", border: "none",
                  borderRadius: 8, padding: "8px 20px", fontSize: 13,
                  fontWeight: 700, cursor: "pointer",
                }}>
                  Keep Going
                </button>
                <button onClick={() => newGame()} style={{
                  background: "#0f172a88", color: "#0f172a", border: "none",
                  borderRadius: 8, padding: "8px 20px", fontSize: 13,
                  fontWeight: 700, cursor: "pointer",
                }}>
                  New Game
                </button>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gs.status === "over" && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 14,
              background: "rgba(15, 23, 42, 0.90)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
              animation: "overlay-in 0.3s ease",
              zIndex: 10,
            }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>Game Over</div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>Score: <strong style={{ color: "#f1f5f9" }}>{gs.score.toLocaleString()}</strong></div>
              <button onClick={() => newGame()} style={{
                background: "linear-gradient(135deg, #00d4aa, #0066ff)",
                color: "#0f172a", border: "none",
                borderRadius: 8, padding: "8px 24px", fontSize: 13,
                fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 20px #00d4aa44",
              }}>
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* D-pad for touch */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <DpadBtn2048 label="▲" onPress={() => applyMove("UP")} />
          <div style={{ display: "flex", gap: 4 }}>
            <DpadBtn2048 label="◀" onPress={() => applyMove("LEFT")} />
            <div style={{ width: 44, height: 44 }} />
            <DpadBtn2048 label="▶" onPress={() => applyMove("RIGHT")} />
          </div>
          <DpadBtn2048 label="▼" onPress={() => applyMove("DOWN")} />
        </div>

        {/* Hint */}
        <div style={{ color: "#1e293b", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
          Arrow keys · WASD · Swipe
        </div>
      </div>
    </>
  );
}

// ============================================================
// D-PAD BUTTON
// ============================================================
interface DpadBtn2048Props { label: string; onPress: () => void; }

function DpadBtn2048({ label, onPress }: DpadBtn2048Props) {
  const [pressed, setPressed] = useState(false);
  const handle = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setPressed(true);
    onPress();
    setTimeout(() => setPressed(false), 120);
  };
  return (
    <button
      onTouchStart={handle}
      onMouseDown={handle}
      style={{
        width: 44, height: 44, borderRadius: 10,
        background: pressed ? "#334155" : "#1e293b",
        border: "1px solid #334155",
        color: "#475569", fontSize: 14,
        cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        transition: "background 0.1s, transform 0.1s",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "none", userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}