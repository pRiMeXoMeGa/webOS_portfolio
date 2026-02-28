import React from "react";
import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import SnakeApp from "./SnakeApp";
import ChessApp from "./ChessApp";
import App2048 from "./App2048";
// ============================================================
// TYPES & CONSTANTS (TypeScript interfaces as JSDoc comments)
// ============================================================

/**
 * @typedef {Object} IWindow
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {boolean} isOpen
 * @property {boolean} isMinimized
 * @property {boolean} isMaximized
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} zIndex
 * @property {React.ReactNode} content
 */

/**
 * @typedef {Object} IProject
 * @property {string} id
 * @property {string} name
 * @property {string} client
 * @property {string} description
 * @property {string[]} tags
 * @property {string} impact
 * @property {string} color
 */

/**
 * @typedef {Object} ISkill
 * @property {string} name
 * @property {number} level
 * @property {string} category
 */

// ============================================================
// DATA LAYER
// ============================================================

const PROJECTS = [
  {
    id: "funnel",
    name: "Funnel Automation Multi-Agent System",
    client: "Unilever",
    description:
      "Architected a multi-agent system utilizing MCP tools to autonomously retrieve data, run statistical analysis, and generate market funnel predictions with dramatic accuracy improvements.",
    tags: ["Python", "LangGraph", "Agentic AI", "MCP", "AutoGen"],
    impact: "+50% Prediction Accuracy",
    color: "#00d4aa",
  },
  {
    id: "pepsico",
    name: "Enterprise Forecasting Integration",
    client: "PepsiCo",
    description:
      "Designed custom Model Context Protocol (MCP) tools using FastAPI and Python, enabling secure and standardized LLM integration with internal forecasting databases at enterprise scale.",
    tags: ["FastAPI", "Python", "MCP", "FastMCP", "PostgreSQL"],
    impact: "Secure LLM-DB Bridge",
    color: "#0066ff",
  },
  {
    id: "genai",
    name: "GenAI Playground",
    client: "LTIMindtree",
    description:
      "Engineered a unified interface integrating 17+ LLMs including Azure OpenAI, GPT-4, Claude, and Bedrock. Features a proprietary Responsible AI middleware layer for PII filtration, toxicity checks, and jailbreak prevention.",
    tags: ["Azure AI Foundry", "React", "Python", "Anthropic Claude", "OpenAI"],
    impact: "17+ LLMs Unified",
    color: "#9b59b6",
  },
  {
    id: "realtime",
    name: "Real-Time Conversational UI",
    client: "LTIMindtree",
    description:
      "Developed high-performance conversational frontends utilizing WebSockets and Server-Sent Events (SSE) for real-time token streaming, delivering sub-100ms perceived latency for enterprise users.",
    tags: ["React", "Redux", "WebSockets", "SSE", "TypeScript"],
    impact: "Real-Time Streaming",
    color: "#e74c3c",
  },
  {
    id: "rag",
    name: "Production RAG Systems",
    client: "Fractal.ai",
    description:
      "Deployed scalable Retrieval-Augmented Generation solutions for enterprise decision support, optimizing vector retrieval pipelines for complex multi-document queries across massive knowledge bases.",
    tags: ["Pinecone", "PostgreSQL", "LangChain", "RAG", "AWS Bedrock"],
    impact: "Enterprise-Scale Retrieval",
    color: "#f39c12",
  },
];

const SKILLS = [
  // Generative AI
  { name: "LangChain / LangGraph", level: 88, category: "Generative AI" },
  { name: "Azure OpenAI / AWS Bedrock", level: 88, category: "Generative AI" },
  { name: "RAG & Vector Stores", level: 85, category: "Generative AI" },
  { name: "MCP / FastMCP", level: 90, category: "Generative AI" },
  // Frontend
  { name: "React / Redux", level: 90, category: "Frontend" },
  { name: "TypeScript", level: 88, category: "Frontend" },
  { name: "WebSockets / SSE", level: 85, category: "Frontend" },
  { name: "Tailwind / Sass", level: 87, category: "Frontend" },
  // Backend
  { name: "Python", level: 95, category: "Backend" },
  { name: "FastAPI / Flask", level: 90, category: "Backend" },
  { name: "Kafka / RabbitMQ", level: 80, category: "Backend" },
  // Cloud & Database
  { name: "PostgreSQL / MongoDB", level: 85, category: "Cloud & Database" },
  { name: "Docker / Kubernetes", level: 82, category: "Cloud & Database" },
  { name: "Azure Functions", level: 83, category: "Cloud & Database" },
  { name: "AWS Sagemaker", level: 80, category: "Cloud & Database" },
];

const DESKTOP_ICONS = [
  { id: "about", label: "About Me", emoji: "👤" },
  { id: "projects", label: "Projects", emoji: "🚀" },
  { id: "skills", label: "Skills Matrix", emoji: "⚡" },
  { id: "terminal", label: "Terminal", emoji: "💻" },
  { id: "contact", label: "Contact", emoji: "📬" },
  { id: "snake", label: "Snake", emoji: "🐍" },
  { id: "chess", label: "Chess", emoji: "♟️" },
  { id: "2048", label: "2048", emoji: "🧩" },
];

// ============================================================
// ZUSTAND-LIKE STORE (using useReducer for global state)
// ============================================================

const initialWindows = [
  {
    id: "about",
    title: "About — Mohd Aqib",
    emoji: "👤",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 80,
    y: 60,
    width: 760,
    height: 500,
    zIndex: 10,
  },
  {
    id: "projects",
    title: "Projects Portfolio",
    emoji: "🚀",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 120,
    y: 80,
    width: 860,
    height: 560,
    zIndex: 10,
  },
  {
    id: "skills",
    title: "Skills Matrix",
    emoji: "⚡",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 160,
    y: 100,
    width: 700,
    height: 520,
    zIndex: 10,
  },
  {
    id: "terminal",
    title: "Terminal — bash",
    emoji: "💻",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 200,
    y: 120,
    width: 680,
    height: 440,
    zIndex: 10,
  },
  {
    id: "contact",
    title: "Contact",
    emoji: "📬",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 240,
    y: 140,
    width: 500,
    height: 380,
    zIndex: 10,
  },
  {
    id: "snake",
    title: "Snake",
    emoji: "🐍",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 180,
    y: 80,
    width: 500,
    height: 680,
    zIndex: 10,
  },
  {
    id: "chess",
    title: "Chess",
    emoji: "♟️",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 60,
    y: 40,
    width: 860,
    height: 560,
    zIndex: 10,
  },
  {
    id: "2048",
    title: "2048",
    emoji: "🧩",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    x: 100,
    y: 60,
    width: 520,
    height: 680,
    zIndex: 10,
  },
];

function windowsReducer(state, action) {
  switch (action.type) {
    case "OPEN_APP": {
      const maxZ = Math.max(...state.map((w) => w.zIndex), 10);
      return state.map((w) =>
        w.id === action.id
          ? { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 }
          : w
      );
    }
    case "CLOSE_APP":
      return state.map((w) =>
        w.id === action.id ? { ...w, isOpen: false, isMinimized: false, isMaximized: false } : w
      );
    case "MINIMIZE_APP":
      return state.map((w) =>
        w.id === action.id ? { ...w, isMinimized: true } : w
      );
    case "FOCUS_APP": {
      const maxZ = Math.max(...state.map((w) => w.zIndex), 10);
      return state.map((w) =>
        w.id === action.id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w
      );
    }
    case "MAXIMIZE_APP":
      return state.map((w) =>
        w.id === action.id ? { ...w, isMaximized: !w.isMaximized } : w
      );
    case "UPDATE_GEOMETRY":
      return state.map((w) =>
        w.id === action.id
          ? { ...w, x: action.x, y: action.y, width: action.width, height: action.height }
          : w
      );
    default:
      return state;
  }
}

// ============================================================
// CLOCK COMPONENT
// ============================================================
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ fontFamily: "monospace", fontSize: 13, color: "#e2e8f0", letterSpacing: 1 }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 11 }}>
        {time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

// ============================================================
// SKILL BAR COMPONENT
// ============================================================
function SkillBar({ skill }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const categoryColors = {
    "Generative AI": "#00d4aa",
    Frontend: "#60a5fa",
    Backend: "#f97316",
    "Cloud & Database": "#a78bfa",
  };
  const color = categoryColors[skill.category] || "#60a5fa";

  return (
    <div ref={ref} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{skill.name}</span>
        <span style={{ fontSize: 12, color: color, fontWeight: 700 }}>{skill.level}%</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: animated ? `${skill.level}%` : "0%",
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: 6,
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// APP CONTENT COMPONENTS
// ============================================================

function AboutApp() {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0f172a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, height: "100%", minHeight: 400 }}>
        {/* Left Panel */}
        <div
          style={{
            background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
            borderRight: "1px solid #1e293b",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #00d4aa, #0066ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              marginTop: 8,
              boxShadow: "0 0 30px #00d4aa44",
            }}
          >
            🧑‍💻
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>Mohd Aqib</div>
            <div style={{ color: "#00d4aa", fontSize: 11, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
              Senior GenAI & Full Stack Engineer
            </div>
          </div>
          <div style={{ width: "100%", borderTop: "1px solid #1e293b", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Experience", value: "5+ Years" },
              { label: "Certifications", value: "2 Active" },
              { label: "LLMs Integrated", value: "17+" },
              { label: "Accuracy Boost", value: "+50%" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: 12 }}>{s.label}</span>
                <span style={{ color: "#00d4aa", fontSize: 13, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{ width: "100%", borderTop: "1px solid #1e293b", paddingTop: 16 }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Certifications</div>
            {["Microsoft Azure Fundamentals (AZ-900)", "Angular Level 2 Intermediate"].map((c) => (
              <div key={c} style={{ background: "#1e293b", borderRadius: 6, padding: "6px 10px", marginBottom: 6, fontSize: 11, color: "#94a3b8", border: "1px solid #334155" }}>
                🏆 {c}
              </div>
            ))}
          </div>
          <div style={{ width: "100%", borderTop: "1px solid #1e293b", paddingTop: 16 }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Location</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>🇦🇪 United Arab Emirates</div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Visit Visa till 10 Mar 2026</div>
          </div>
        </div>
        {/* Right Panel */}
        <div style={{ padding: 32, overflowY: "auto" }}>
          <div style={{ color: "#00d4aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Profile</div>
          <h2 style={{ color: "#f1f5f9", fontSize: 26, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            Building the Intelligent<br />
            <span style={{ color: "#00d4aa" }}>Web of Tomorrow</span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            I'm a Senior Generative AI & Full Stack Engineer with 5+ years crafting scalable enterprise AI solutions and high-performance progressive web applications. My expertise spans the full spectrum — from architecting multi-agent LangGraph systems to building real-time React frontends with sub-100ms streaming.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
            I've led engineering teams of 5 at Fractal.ai, delivering production-grade Agentic AI systems for global brands like <span style={{ color: "#00d4aa" }}>PepsiCo</span> and <span style={{ color: "#00d4aa" }}>Unilever</span>. My GenAI Playground at LTIMindtree unified 17+ LLMs behind a proprietary Responsible AI layer — protecting enterprise users from PII leakage and adversarial prompts.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { title: "Education", desc: "M.Tech Information Security · MNNIT Allahabad", icon: "🎓" },
              { title: "Undergrad", desc: "B.Tech Information Technology · AKTU", icon: "📚" },
              { title: "Current Role", desc: "Senior FullStack Engineer · Fractal.ai (2024–Present)", icon: "💼" },
              { title: "Previous", desc: "AI FullStack Engineer · LTIMindtree (2022–2024)", icon: "🏢" },
            ].map((item) => (
              <div key={item.title} style={{ background: "#1e293b", borderRadius: 10, padding: 16, border: "1px solid #334155" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700 }}>{item.title}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #00d4aa, #0066ff)",
              color: "white",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 20px #00d4aa44",
              cursor: "pointer",
            }}
          >
            ⬇ Download Resume
          </a>
        </div>
      </div>
    </div>
  );
}

function ProjectsApp() {
  const [selected, setSelected] = useState(null);

  if (selected) {
    const p = PROJECTS.find((x) => x.id === selected);
    return (
      <div style={{ height: "100%", overflowY: "auto", background: "#0f172a", padding: 28 }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, marginBottom: 20 }}
        >
          ← Back to Projects
        </button>
        <div style={{ borderLeft: `4px solid ${p.color}`, paddingLeft: 20 }}>
          <div style={{ color: p.color, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            Client: {p.client}
          </div>
          <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{p.name}</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>{p.description}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${p.color}22`, border: `1px solid ${p.color}44`, borderRadius: 8, padding: "8px 16px", marginBottom: 20 }}>
            <span style={{ color: p.color, fontSize: 13, fontWeight: 700 }}>⚡ Impact: {p.impact}</span>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Tech Stack</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {p.tags.map((tag) => (
                <span key={tag} style={{ background: "#1e293b", border: `1px solid ${p.color}44`, color: p.color, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0f172a", padding: 24 }}>
      <div style={{ color: "#00d4aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Portfolio</div>
      <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Featured Projects</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {PROJECTS.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: `1px solid #1e293b`,
              borderRadius: 12,
              padding: 20,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = p.color + "88";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 30px ${p.color}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e293b";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${p.color}22, transparent)` }} />
            <div style={{ color: p.color, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
              {p.client}
            </div>
            <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{p.name}</div>
            <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              {p.description.slice(0, 100)}...
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
              {p.tags.slice(0, 3).map((tag) => (
                <span key={tag} style={{ background: `${p.color}15`, color: p.color, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{tag}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: p.color, fontSize: 12, fontWeight: 700 }}>⚡ {p.impact}</span>
              <span style={{ color: "#475569", fontSize: 12 }}>View details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsApp() {
  const categories = [...new Set(SKILLS.map((s) => s.category))];
  const categoryColors = {
    "Generative AI": "#00d4aa",
    Frontend: "#60a5fa",
    Backend: "#f97316",
    "Cloud & Database": "#a78bfa",
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0f172a", padding: 28 }}>
      <div style={{ color: "#00d4aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Expertise</div>
      <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Skills Matrix</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {categories.map((cat) => (
          <div
            key={cat}
            style={{
              background: "#1e293b",
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${categoryColors[cat]}22`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 20, background: categoryColors[cat], borderRadius: 2 }} />
              <span style={{ color: categoryColors[cat], fontSize: 13, fontWeight: 700 }}>{cat}</span>
            </div>
            {SKILLS.filter((s) => s.category === cat).map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalApp() {
  const [history, setHistory] = useState([
    { type: "system", text: "Mohd Aqib Portfolio OS v2.0.0 — GenAI Edition" },
    { type: "system", text: 'Type "help" for available commands.' },
    { type: "prompt", text: "" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [history]);

  const handleCommand = (cmd) => {
    const trimmed = cmd.trim().toLowerCase();
    const newHistory = [...history.slice(0, -1), { type: "input", text: `$ ${cmd}` }];

    const outputs = {
      whoami: [
        { type: "output", text: "Name      : Mohd Aqib" },
        { type: "output", text: "Role      : Senior Generative AI & Full Stack Engineer" },
        { type: "output", text: "Location  : United Arab Emirates" },
        { type: "output", text: "Email     : aqib.workplace@gmail.com" },
        { type: "output", text: "Phone     : +971 50 387 0649" },
        { type: "output", text: "Exp       : 5+ Years" },
        { type: "output", text: "LLMs Used : 17+" },
      ],
      ls: PROJECTS.map((p) => ({ type: "output", text: `📁 ${p.id}/   — ${p.name} (${p.client})` })),
      skills: [
        { type: "output", text: "─── Generative AI ──────────────────────" },
        ...SKILLS.filter((s) => s.category === "Generative AI").map((s) => ({
          type: "output",
          text: `  ${s.name.padEnd(28)} ${s.level}%  ${"█".repeat(Math.floor(s.level / 10))}`,
        })),
        { type: "output", text: "─── Backend ────────────────────────────" },
        ...SKILLS.filter((s) => s.category === "Backend").map((s) => ({
          type: "output",
          text: `  ${s.name.padEnd(28)} ${s.level}%  ${"█".repeat(Math.floor(s.level / 10))}`,
        })),
      ],
      help: [
        { type: "output", text: "Available commands:" },
        { type: "output", text: "  whoami    — Profile information" },
        { type: "output", text: "  ls        — List projects" },
        { type: "output", text: "  skills    — Skills overview" },
        { type: "output", text: "  education — Education background" },
        { type: "output", text: "  clear     — Clear terminal" },
        { type: "output", text: "  contact   — Contact info" },
      ],
      education: [
        { type: "output", text: "M.Tech — Information Security" },
        { type: "output", text: "  Institution : MNNIT Allahabad" },
        { type: "output", text: "  Year        : 2020 – 2022" },
        { type: "output", text: "" },
        { type: "output", text: "B.Tech — Information Technology" },
        { type: "output", text: "  Institution : Dr. A.P.J Abdul Kalam Technical University" },
        { type: "output", text: "  Year        : 2014 – 2018" },
      ],
      contact: [
        { type: "output", text: "📧 aqib.workplace@gmail.com" },
        { type: "output", text: "📱 +971 50 387 0649" },
        { type: "output", text: "🌐 LinkedIn / Github (see portfolio)" },
        { type: "output", text: "📍 United Arab Emirates" },
      ],
    };

    if (trimmed === "clear") {
      setHistory([{ type: "system", text: "Terminal cleared." }, { type: "prompt", text: "" }]);
      setInput("");
      return;
    }

    const result = outputs[trimmed] || [{ type: "error", text: `Command not found: ${cmd}. Type "help" for commands.` }];
    setHistory([...newHistory, ...result, { type: "prompt", text: "" }]);
    setInput("");
  };

  const colorMap = {
    system: "#00d4aa",
    input: "#f1f5f9",
    output: "#94a3b8",
    error: "#ef4444",
    prompt: "#00d4aa",
  };

  return (
    <div
      style={{ height: "100%", background: "#020817", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {history.map((line, i) => (
          <div key={i} style={{ color: colorMap[line.type] || "#94a3b8", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre" }}>
            {line.text}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", color: "#00d4aa", fontSize: 13 }}>
          <span>$ </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommand(input);
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f1f5f9",
              fontSize: 13,
              fontFamily: "inherit",
              marginLeft: 6,
              flex: 1,
              caretColor: "#00d4aa",
            }}
            autoFocus
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ContactApp() {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0f172a", padding: 28 }}>
      <div style={{ color: "#00d4aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Get In Touch</div>
      <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Contact</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { icon: "📧", label: "Email", value: "aqib.workplace@gmail.com", color: "#00d4aa" },
          { icon: "📱", label: "Phone", value: "+971 50 387 0649", color: "#60a5fa" },
          { icon: "📍", label: "Location", value: "United Arab Emirates", color: "#f97316" },
          { icon: "🔗", label: "LinkedIn", value: "linkedin.com/in/aqib-workspace", color: "#a78bfa" },
          { icon: "💻", label: "GitHub", value: "github.com/mohd-aqib", color: "#f1f5f9" },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#1e293b",
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${c.color}22`,
            }}
          >
            <div style={{ fontSize: 22, width: 36, textAlign: "center" }}>{c.icon}</div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</div>
              <div style={{ color: c.color, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
        <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Currently Available For</div>
        {["Senior AI/ML Engineer roles", "Full Stack Engineering positions", "Agentic AI & MCP consulting", "UAE-based opportunities (Visit Visa)"].map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "#00d4aa" }}>✓</span> {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// WINDOW BOX — Core Physics Component
// ============================================================
function WindowBox({ win, dispatch, getContent }) {
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });

  // DRAG LOGIC: onMouseDown on header initiates drag
  const onHeaderMouseDown = useCallback(
    (e) => {
      if (win.isMaximized) return;
      if (e.target.closest("[data-control]")) return; // Don't drag from control buttons
      isDragging.current = true;
      dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, winX: win.x, winY: win.y };
      dispatch({ type: "FOCUS_APP", id: win.id });
      e.preventDefault();
    },
    [win.isMaximized, win.x, win.y, win.id, dispatch]
  );

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const newX = Math.max(0, dragStart.current.winX + dx);
      const newY = Math.max(0, dragStart.current.winY + dy);
      dispatch({ type: "UPDATE_GEOMETRY", id: win.id, x: newX, y: newY, width: win.width, height: win.height });
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [win.id, win.width, win.height, dispatch]);

  if (!win.isOpen || win.isMinimized) return null;

  // GPU-accelerated positioning via transform: translate3d (NOT top/left)
  const style = win.isMaximized
    ? {
        position: "fixed",
        inset: "0 0 48px 0",
        zIndex: win.zIndex,
        transform: "translate3d(0, 0, 0)",
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        width: win.width,
        height: win.height,
        // Key: GPU-accelerated translate3d for buttery drag performance
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        zIndex: win.zIndex,
      };

  return (
    <div
      ref={dragRef}
      style={{
        ...style,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: win.isMaximized ? 0 : 12,
        overflow: "hidden",
        boxShadow: "0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseDown={() => dispatch({ type: "FOCUS_APP", id: win.id })}
    >
      {/* Window Header / Title Bar */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          height: 40,
          background: "linear-gradient(90deg, #1e293b 0%, #1a2332 100%)",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          paddingRight: 12,
          cursor: win.isMaximized ? "default" : "grab",
          userSelect: "none",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* macOS-style traffic lights */}
        <div data-control="true" style={{ display: "flex", gap: 6, marginRight: 8 }}>
          <button
            onClick={() => dispatch({ type: "CLOSE_APP", id: win.id })}
            style={{
              width: 13, height: 13, borderRadius: "50%",
              background: "#ef4444", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7f1d1d"; e.currentTarget.textContent = "✕"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "transparent"; e.currentTarget.textContent = ""; }}
          />
          <button
            onClick={() => dispatch({ type: "MINIMIZE_APP", id: win.id })}
            style={{
              width: 13, height: 13, borderRadius: "50%",
              background: "#f59e0b", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#78350f"; e.currentTarget.textContent = "−"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "transparent"; e.currentTarget.textContent = ""; }}
          />
          <button
            onClick={() => dispatch({ type: "MAXIMIZE_APP", id: win.id })}
            style={{
              width: 13, height: 13, borderRadius: "50%",
              background: "#22c55e", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#14532d"; e.currentTarget.textContent = "+"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "transparent"; e.currentTarget.textContent = ""; }}
          />
        </div>
        <span style={{ fontSize: 12, color: "#94a3b8", flex: 1, textAlign: "center" }}>
          {win.emoji} {win.title}
        </span>
      </div>
      {/* Window Content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {getContent(win.id)}
      </div>
    </div>
  );
}

// ============================================================
// DESKTOP ICONS
// ============================================================
function DesktopIcon({ icon, onDoubleClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 8px", borderRadius: 10, cursor: "pointer", width: 72,
        background: hover ? "rgba(255,255,255,0.08)" : "transparent",
        transition: "background 0.15s, transform 0.15s",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 32, lineHeight: 1 }}>{icon.emoji}</div>
      <div style={{
        color: "#e2e8f0", fontSize: 11, textAlign: "center", lineHeight: 1.3,
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        background: hover ? "rgba(59,130,246,0.7)" : "transparent",
        borderRadius: 4, padding: "1px 4px",
      }}>
        {icon.label}
      </div>
    </div>
  );
}

// ============================================================
// TASKBAR
// ============================================================
function Taskbar({ windows, dispatch }) {
  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 48,
        background: "rgba(15,23,42,0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid #1e293b",
        display: "flex", alignItems: "center",
        paddingLeft: 12, paddingRight: 12,
        gap: 6, zIndex: 99999,
      }}
    >
      {/* App Launcher */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "linear-gradient(135deg, #00d4aa, #0066ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, marginRight: 8, cursor: "pointer",
        boxShadow: "0 0 12px #00d4aa44",
      }}>🚀</div>
      <div style={{ width: 1, height: 24, background: "#1e293b", marginRight: 4 }} />
      {/* Open Windows */}
      {windows.filter((w) => w.isOpen).map((w) => (
        <button
          key={w.id}
          onClick={() => {
            if (w.isMinimized) {
              dispatch({ type: "FOCUS_APP", id: w.id });
            } else {
              dispatch({ type: "MINIMIZE_APP", id: w.id });
            }
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: w.isMinimized ? "#1e293b" : "rgba(255,255,255,0.08)",
            border: w.isMinimized ? "1px solid #334155" : "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "4px 12px", cursor: "pointer",
            color: "#e2e8f0", fontSize: 12,
            transition: "all 0.15s",
            maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          <span>{w.emoji}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {w.title.split(" — ")[0].split(" ").slice(0, 2).join(" ")}
          </span>
          {!w.isMinimized && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4aa", flexShrink: 0 }} />
          )}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <Clock />
    </div>
  );
}

// ============================================================
// DESKTOP BACKGROUND
// ============================================================
function DesktopBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Deep space gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 20% 30%, #0d2137 0%, #020817 50%, #0a0f1e 100%)",
      }} />
      {/* Constellation grid */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00d4aa" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Glowing orbs */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #0066ff11, transparent)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", top: "50%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #00d4aa09, transparent)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "20%", left: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #9b59b611, transparent)", filter: "blur(40px)" }} />
    </div>
  );
}

// ============================================================
// ROOT APP COMPONENT
// ============================================================
export default function App() {
  const [windows, dispatch] = useReducer(windowsReducer, initialWindows);

  const openApp = useCallback((id) => dispatch({ type: "OPEN_APP", id }), []);

  const getContent = useCallback((id) => {
    switch (id) {
      case "about": return <AboutApp />;
      case "projects": return <ProjectsApp />;
      case "skills": return <SkillsApp />;
      case "terminal": return <TerminalApp />;
      case "contact": return <ContactApp />;
      case "snake": return <SnakeApp />;
      case "chess": return <ChessApp />;
      case "2048": return <App2048 />;
      default: return null;
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Desktop Background */}
      <DesktopBackground />

      {/* Desktop Canvas */}
      <div style={{ position: "absolute", inset: "0 0 48px 0", overflow: "hidden" }}>
        {/* Hero Banner */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center", pointerEvents: "none",
          zIndex: 1,
        }}>
          <div style={{ color: "#1e293b", fontSize: 120, fontWeight: 900, letterSpacing: -4, lineHeight: 1, userSelect: "none" }}>
            AQIB
          </div>
          <div style={{ color: "#0f172a", fontSize: 14, letterSpacing: 8, textTransform: "uppercase", marginTop: -10, userSelect: "none" }}>
            Senior GenAI & Full Stack Engineer
          </div>
        </div>

        {/* Desktop Icons — top-left */}
        <div style={{ position: "absolute", top: 20, left: 16, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
          {DESKTOP_ICONS.map((icon) => (
            <DesktopIcon key={icon.id} icon={icon} onDoubleClick={() => openApp(icon.id)} />
          ))}
        </div>

        {/* Quick launch hint */}
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          color: "#334155", fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
          userSelect: "none", pointerEvents: "none",
        }}>
          Double-click icons to open • Drag windows to move
        </div>
      </div>

      {/* Window Manager — renders all open windows */}
      {windows.map((win) => (
        <WindowBox key={win.id} win={win} dispatch={dispatch} getContent={getContent} />
      ))}

      {/* Taskbar */}
      <Taskbar windows={windows} dispatch={dispatch} />
    </div>
  );
}