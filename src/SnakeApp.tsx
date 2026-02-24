import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// CONSTANTS & TYPES
// ============================================================

const GRID_SIZE = 20;       // 20x20 grid cells
const CELL_PX = 22;         // pixels per cell
const TICK_MS = 130;        // ms per game tick (single speed)
const CANVAS_PX = GRID_SIZE * CELL_PX; // 440px

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Point {
  x: number;
  y: number;
}

interface GameState {
  snake: Point[];
  food: Point;
  dir: Direction;
  nextDir: Direction;
  score: number;
  running: boolean;
  dead: boolean;
}

// ============================================================
// AUDIO ENGINE — Web Audio API synth sounds (no assets needed)
// ============================================================
function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playEat(ctx: AudioContext) {
  // Short ascending blip
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

function playDie(ctx: AudioContext) {
  // Descending buzz on death
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(330, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function playMove(ctx: AudioContext) {
  // Very subtle tick
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

// ============================================================
// HELPERS
// ============================================================

function randomFood(snake: Point[]): Point {
  // Keep generating until food doesn't overlap snake body
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function getInitialState(): GameState {
  const snake: Point[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  return {
    snake,
    food: randomFood(snake),
    dir: "RIGHT",
    nextDir: "RIGHT",
    score: 0,
    running: false,
    dead: false,
  };
}

// ============================================================
// HIGH SCORE — localStorage
// ============================================================
const HS_KEY = "aqib_os_snake_highscore";

function getHighScore(): number {
  try {
    return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    const current = getHighScore();
    if (score > current) localStorage.setItem(HS_KEY, String(score));
  } catch {
    // localStorage may be unavailable; silently ignore
  }
}

// ============================================================
// D-PAD BUTTON COMPONENT
// ============================================================
interface DpadBtnProps {
  label: string;
  onPress: () => void;
  accent?: boolean;
}

function DpadBtn({ label, onPress, accent = false }: DpadBtnProps) {
  const [pressed, setPressed] = useState(false);

  const handlePress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // prevent ghost mouse events after touch
    setPressed(true);
    onPress();
    setTimeout(() => setPressed(false), 120);
  };

  return (
    <button
      onTouchStart={handlePress}
      onMouseDown={handlePress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: pressed
          ? accent ? "#00d4aa33" : "#334155"
          : accent ? "#1e293b" : "#0f172a",
        border: `1px solid ${accent ? "#00d4aa55" : "#1e293b"}`,
        color: accent ? "#00d4aa" : "#475569",
        fontSize: accent ? 16 : 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.1s, transform 0.1s",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        WebkitTapHighlightColor: "transparent", // remove blue flash on iOS
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

// ============================================================
// SNAKE APP COMPONENT
// ============================================================
export default function SnakeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(getInitialState());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // React state only for UI re-renders (score, status) — game physics live in ref
  const [uiScore, setUiScore] = useState(0);
  const [uiDead, setUiDead] = useState(false);
  const [uiRunning, setUiRunning] = useState(false);
  const [highScore, setHighScore] = useState(getHighScore());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ── AUDIO BOOTSTRAP ──────────────────────────────────────
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const sound = useCallback(
    (fn: (ctx: AudioContext) => void) => {
      if (!soundEnabled) return;
      ensureAudio();
      if (audioCtxRef.current) fn(audioCtxRef.current);
    },
    [soundEnabled, ensureAudio]
  );

  // ── CANVAS DRAW ───────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background
    ctx.fillStyle = "#020817";
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    // Grid dots (subtle)
    ctx.fillStyle = "#0f172a";
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.fillRect(x * CELL_PX + CELL_PX / 2 - 1, y * CELL_PX + CELL_PX / 2 - 1, 2, 2);
      }
    }

    // Food — pulsing teal circle
    const foodX = g.food.x * CELL_PX + CELL_PX / 2;
    const foodY = g.food.y * CELL_PX + CELL_PX / 2;
    const pulse = Math.sin(Date.now() / 200) * 2;

    // Glow
    const grd = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, CELL_PX / 2 + 4 + pulse);
    grd.addColorStop(0, "#00d4aa");
    grd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(foodX, foodY, CELL_PX / 2 + 4 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Food core
    ctx.beginPath();
    ctx.arc(foodX, foodY, CELL_PX / 2 - 3, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4aa";
    ctx.fill();

    // Snake body
    g.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const px = seg.x * CELL_PX;
      const py = seg.y * CELL_PX;
      const pad = isHead ? 1 : 3;
      const radius = isHead ? 6 : 4;
      const alpha = isHead ? 1 : Math.max(0.3, 1 - i * (0.6 / g.snake.length));

      // Segment glow
      if (isHead) {
        ctx.shadowColor = "#00d4aa";
        ctx.shadowBlur = 12;
      }

      // Rounded rect helper
      const rx = px + pad;
      const ry = py + pad;
      const rw = CELL_PX - pad * 2;
      const rh = CELL_PX - pad * 2;

      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();

      // Gradient fill — head is bright, tail fades
      const grad = ctx.createLinearGradient(px, py, px + CELL_PX, py + CELL_PX);
      grad.addColorStop(0, `rgba(0, 212, 170, ${alpha})`);
      grad.addColorStop(1, `rgba(0, 102, 255, ${alpha * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Head eyes
      if (isHead) {
        ctx.fillStyle = "#020817";
        const eyeOffset = 4;
        const { dir } = g;
        let e1: Point, e2: Point;
        if (dir === "RIGHT") { e1 = { x: px + CELL_PX - 6, y: py + 5 }; e2 = { x: px + CELL_PX - 6, y: py + CELL_PX - 7 }; }
        else if (dir === "LEFT") { e1 = { x: px + 5, y: py + 5 }; e2 = { x: px + 5, y: py + CELL_PX - 7 }; }
        else if (dir === "UP") { e1 = { x: px + 5, y: py + 5 }; e2 = { x: px + CELL_PX - 7, y: py + 5 }; }
        else { e1 = { x: px + 5, y: py + CELL_PX - 6 }; e2 = { x: px + CELL_PX - 7, y: py + CELL_PX - 6 }; }
        ctx.beginPath(); ctx.arc(e1.x, e1.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2.x, e2.y, 2, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Death overlay
    if (g.dead) {
      ctx.fillStyle = "rgba(2, 8, 23, 0.75)";
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CANVAS_PX / 2, CANVAS_PX / 2 - 16);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      ctx.fillText(`Score: ${g.score}`, CANVAS_PX / 2, CANVAS_PX / 2 + 14);
      ctx.fillText("Press R to restart", CANVAS_PX / 2, CANVAS_PX / 2 + 36);
    }

    // Not started overlay
    if (!g.running && !g.dead) {
      ctx.fillStyle = "rgba(2, 8, 23, 0.6)";
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
      ctx.fillStyle = "#00d4aa";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SNAKE", CANVAS_PX / 2, CANVAS_PX / 2 - 14);
      ctx.fillStyle = "#64748b";
      ctx.font = "13px monospace";
      ctx.fillText("Press SPACE or Enter to start", CANVAS_PX / 2, CANVAS_PX / 2 + 12);
      ctx.fillText("Arrow keys or WASD to move", CANVAS_PX / 2, CANVAS_PX / 2 + 30);
    }
  }, []);

  // ── GAME TICK ─────────────────────────────────────────────
  const tick = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || g.dead) return;

    // Commit queued direction
    g.dir = g.nextDir;

    const head = g.snake[0];
    let nx = head.x;
    let ny = head.y;

    if (g.dir === "UP")    ny -= 1;
    if (g.dir === "DOWN")  ny += 1;
    if (g.dir === "LEFT")  nx -= 1;
    if (g.dir === "RIGHT") nx += 1;

    // Wall wrap-around (instead of death on wall)
    nx = (nx + GRID_SIZE) % GRID_SIZE;
    ny = (ny + GRID_SIZE) % GRID_SIZE;

    const newHead: Point = { x: nx, y: ny };

    // Self-collision check
    const hitSelf = g.snake.some((s) => s.x === nx && s.y === ny);
    if (hitSelf) {
      g.dead = true;
      g.running = false;
      saveHighScore(g.score);
      setHighScore(getHighScore());
      setUiDead(true);
      setUiRunning(false);
      sound(playDie);
      draw();
      return;
    }

    const ateFood = nx === g.food.x && ny === g.food.y;

    // Build new snake — grow if ate food, else remove tail
    const newSnake = ateFood
      ? [newHead, ...g.snake]
      : [newHead, ...g.snake.slice(0, -1)];

    if (ateFood) {
      g.score += 10;
      g.food = randomFood(newSnake);
      setUiScore(g.score);
      sound(playEat);
    } else {
      sound(playMove);
    }

    g.snake = newSnake;
    draw();
  }, [draw, sound]);

  // ── ANIMATION LOOP for food pulse ────────────────────────
  const animFrameRef = useRef<number>(0);
  const animate = useCallback(() => {
    draw();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animate]);

  // ── START / STOP TICK ────────────────────────────────────
  const startGame = useCallback(() => {
    ensureAudio();
    const g = gameRef.current;
    if (g.dead) {
      // Restart
      gameRef.current = getInitialState();
      gameRef.current.running = true;
      setUiScore(0);
      setUiDead(false);
    } else {
      g.running = true;
    }
    setUiRunning(true);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS);
  }, [tick, ensureAudio]);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => () => stopTick(), [stopTick]);

  // Re-bind tick when tick function changes
  useEffect(() => {
    if (uiRunning && !uiDead) {
      stopTick();
      tickRef.current = setInterval(tick, TICK_MS);
    }
  }, [tick, uiRunning, uiDead, stopTick]);

  // ── DIRECTION HANDLER (shared by keyboard, touch, d-pad) ──
  const applyDirection = useCallback((dir: Direction) => {
    const g = gameRef.current;
    const opposite: Record<Direction, Direction> = {
      UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
    };
    if (dir !== opposite[g.dir]) g.nextDir = dir;
  }, []);

  // ── KEYBOARD CONTROLS ────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "UP", w: "UP", W: "UP",
        ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
        ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
        ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
      };

      if (map[e.key]) {
        applyDirection(map[e.key]);
        e.preventDefault();
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        startGame();
      }
      if (e.key === "r" || e.key === "R") {
        stopTick();
        gameRef.current = getInitialState();
        gameRef.current.running = true;
        setUiScore(0);
        setUiDead(false);
        setUiRunning(true);
        tickRef.current = setInterval(tick, TICK_MS);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, stopTick, tick, applyDirection]);

  // ── TOUCH / SWIPE CONTROLS ───────────────────────────────
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const MIN_SWIPE_PX = 20; // minimum px to register as a swipe

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    // Start game on first tap if not running
    if (!gameRef.current.running || gameRef.current.dead) startGame();
  }, [startGame]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Ignore tiny taps
    if (Math.abs(dx) < MIN_SWIPE_PX && Math.abs(dy) < MIN_SWIPE_PX) return;

    // Determine dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      applyDirection(dx > 0 ? "RIGHT" : "LEFT");
    } else {
      applyDirection(dy > 0 ? "DOWN" : "UP");
    }
  }, [applyDirection]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      style={{
        height: "100%",
        background: "#020817",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "'Courier New', monospace",
        userSelect: "none",
      }}
      // Allow canvas to receive focus for keyboard events
      tabIndex={0}
    >
      {/* HUD */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: CANVAS_PX,
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ color: "#334155", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Score</div>
            <div style={{ color: "#00d4aa", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{uiScore}</div>
          </div>
          <div>
            <div style={{ color: "#334155", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Best</div>
            <div style={{ color: "#60a5fa", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{highScore}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            style={{
              background: soundEnabled ? "#1e293b" : "#0f172a",
              border: `1px solid ${soundEnabled ? "#00d4aa44" : "#334155"}`,
              borderRadius: 6,
              color: soundEnabled ? "#00d4aa" : "#475569",
              fontSize: 14,
              padding: "4px 10px",
              cursor: "pointer",
            }}
            title="Toggle sound"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>

          {/* Start / Restart button */}
          <button
            onClick={startGame}
            style={{
              background: "linear-gradient(135deg, #00d4aa22, #0066ff22)",
              border: "1px solid #00d4aa44",
              borderRadius: 6,
              color: "#00d4aa",
              fontSize: 12,
              padding: "4px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {uiDead ? "RESTART" : uiRunning ? "RUNNING" : "START"}
          </button>
        </div>
      </div>

      {/* Canvas — swipe zone */}
      <canvas
        ref={canvasRef}
        width={CANVAS_PX}
        height={CANVAS_PX}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: "block",
          border: "1px solid #1e293b",
          borderRadius: 8,
          boxShadow: "0 0 30px #00d4aa11, 0 0 60px #0066ff08",
          touchAction: "none",
        }}
      />

      {/* On-screen D-pad */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 6 }}>
        <DpadBtn label="▲" onPress={() => { applyDirection("UP"); if (!gameRef.current.running) startGame(); }} />
        <div style={{ display: "flex", gap: 4 }}>
          <DpadBtn label="◀" onPress={() => { applyDirection("LEFT"); if (!gameRef.current.running) startGame(); }} />
          <DpadBtn
            label={uiDead ? "↺" : "●"}
            accent
            onPress={startGame}
          />
          <DpadBtn label="▶" onPress={() => { applyDirection("RIGHT"); if (!gameRef.current.running) startGame(); }} />
        </div>
        <DpadBtn label="▼" onPress={() => { applyDirection("DOWN"); if (!gameRef.current.running) startGame(); }} />
      </div>

      {/* Controls hint */}
      <div style={{ color: "#1e293b", fontSize: 11, letterSpacing: 1, textAlign: "center", marginTop: 2 }}>
        SWIPE · WASD · ARROW KEYS · WALLS WRAP
      </div>
    </div>
  );
}