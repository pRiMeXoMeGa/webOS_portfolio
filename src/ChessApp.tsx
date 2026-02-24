import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================
// TYPES
// ============================================================
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Color = "w" | "b";

interface Piece {
  type: PieceType;
  color: Color;
}

type Square = Piece | null;
type Board = Square[][];

interface Move {
  from: [number, number];
  to: [number, number];
  promotion?: PieceType;
  captured?: Piece;
  castling?: "K" | "Q"; // kingside or queenside
  enPassant?: boolean;
}

interface GameState {
  board: Board;
  turn: Color;
  selectedSq: [number, number] | null;
  legalMoves: Move[];
  history: Move[];
  capturedW: Piece[]; // captured by white
  capturedB: Piece[]; // captured by black
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassantTarget: [number, number] | null;
  status: "playing" | "checkmate" | "stalemate" | "draw";
  inCheck: Color | null;
  moveLog: string[];
}

type GameMode = "ai" | "2p";

// ============================================================
// CONSTANTS
// ============================================================
const PIECE_UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

// Material values for minimax evaluation
const PIECE_VALUE: Record<PieceType, number> = {
  K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100,
};

// Positional bonus tables (from white's perspective, flipped for black)
const PST: Record<PieceType, number[][]> = {
  P: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0],
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20],
  ],
};

// ============================================================
// BOARD INITIALIZATION
// ============================================================
function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRank[c], color: "b" };
    b[1][c] = { type: "P", color: "b" };
    b[6][c] = { type: "P", color: "w" };
    b[7][c] = { type: backRank[c], color: "w" };
  }
  return b;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => sq ? { ...sq } : null));
}

// ============================================================
// MOVE GENERATION
// ============================================================
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPseudoLegalMoves(board: Board, r: number, c: number, enPassantTarget: [number,number] | null): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Move[] = [];
  const { type, color } = piece;
  const opp = color === "w" ? "b" : "w";

  const addMove = (tr: number, tc: number, extra?: Partial<Move>) => {
    if (!inBounds(tr, tc)) return false;
    const target = board[tr][tc];
    if (target?.color === color) return false;
    moves.push({ from: [r, c], to: [tr, tc], captured: target ?? undefined, ...extra });
    return !target; // return true if square was empty (can continue sliding)
  };

  const slide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const cont = addMove(nr, nc);
      if (!cont) break;
      nr += dr; nc += dc;
    }
  };

  switch (type) {
    case "P": {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      // Forward
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        addMove(r + dir, c);
        // Double push from start
        if (r === startRow && !board[r + dir * 2][c]) addMove(r + dir * 2, c);
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color === opp) addMove(nr, nc);
        // En passant
        if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
          moves.push({ from: [r, c], to: [nr, nc], enPassant: true, captured: { type: "P", color: opp } });
        }
      }
      break;
    }
    case "N":
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addMove(r+dr, c+dc);
      break;
    case "B":
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
      break;
    case "R":
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    case "Q":
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    case "K":
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addMove(r+dr, c+dc);
      break;
  }
  return moves;
}

function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color) return [r, c];
  return [-1, -1];
}

function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  for (let sr = 0; sr < 8; sr++)
    for (let sc = 0; sc < 8; sc++) {
      const p = board[sr][sc];
      if (!p || p.color !== byColor) continue;
      const moves = getPseudoLegalMoves(board, sr, sc, null);
      if (moves.some(m => m.to[0] === r && m.to[1] === c)) return true;
    }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  return isSquareAttacked(board, kr, kc, color === "w" ? "b" : "w");
}

function applyMoveToBoard(board: Board, move: Move): Board {
  const nb = cloneBoard(board);
  const piece = nb[move.from[0]][move.from[1]]!;
  nb[move.to[0]][move.to[1]] = piece;
  nb[move.from[0]][move.from[1]] = null;

  // En passant capture
  if (move.enPassant) {
    const capRow = piece.color === "w" ? move.to[0] + 1 : move.to[0] - 1;
    nb[capRow][move.to[1]] = null;
  }

  // Castling rook move
  if (move.castling) {
    const row = piece.color === "w" ? 7 : 0;
    if (move.castling === "K") {
      nb[row][5] = nb[row][7];
      nb[row][7] = null;
    } else {
      nb[row][3] = nb[row][0];
      nb[row][0] = null;
    }
  }

  // Pawn promotion — auto-queen
  if (piece.type === "P" && (move.to[0] === 0 || move.to[0] === 7)) {
    nb[move.to[0]][move.to[1]] = { type: "Q", color: piece.color };
  }

  return nb;
}

function getLegalMoves(
  board: Board,
  color: Color,
  castlingRights: GameState["castlingRights"],
  enPassantTarget: [number,number] | null,
  forSquare?: [number, number]
): Move[] {
  const moves: Move[] = [];

  const squares: [number, number][] = forSquare ? [forSquare] : [];
  if (!forSquare) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.color === color) squares.push([r, c]);
  }

  for (const [r, c] of squares) {
    const pseudo = getPseudoLegalMoves(board, r, c, enPassantTarget);
    for (const move of pseudo) {
      const nb = applyMoveToBoard(board, move);
      if (!isInCheck(nb, color)) moves.push(move);
    }
  }

  // Castling
  if (!forSquare || (forSquare[0] === (color === "w" ? 7 : 0) && forSquare[1] === 4)) {
    const row = color === "w" ? 7 : 0;
    const opp = color === "w" ? "b" : "w";
    if (!isInCheck(board, color)) {
      // Kingside
      if ((color === "w" ? castlingRights.wK : castlingRights.bK) &&
          !board[row][5] && !board[row][6] &&
          !isSquareAttacked(board, row, 5, opp) &&
          !isSquareAttacked(board, row, 6, opp)) {
        moves.push({ from: [row, 4], to: [row, 6], castling: "K" });
      }
      // Queenside
      if ((color === "w" ? castlingRights.wQ : castlingRights.bQ) &&
          !board[row][3] && !board[row][2] && !board[row][1] &&
          !isSquareAttacked(board, row, 3, opp) &&
          !isSquareAttacked(board, row, 2, opp)) {
        moves.push({ from: [row, 4], to: [row, 2], castling: "Q" });
      }
    }
  }

  return moves;
}

// ============================================================
// MOVE NOTATION
// ============================================================
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

function toNotation(move: Move, board: Board): string {
  const piece = board[move.from[0]][move.from[1]];
  if (!piece) return "";
  const dest = FILES[move.to[1]] + RANKS[move.to[0]];
  if (move.castling === "K") return "O-O";
  if (move.castling === "Q") return "O-O-O";
  const cap = move.captured ? "x" : "";
  const pieceName = piece.type === "P" ? (move.captured ? FILES[move.from[1]] : "") : piece.type;
  return `${pieceName}${cap}${dest}`;
}

// ============================================================
// AI — delegated entirely to Web Worker (non-blocking)
// The worker re-implements minimax so the main thread is free
// ============================================================

// Vite's ?worker suffix spins up a dedicated Worker thread
// import ChessWorker from "./chess.worker?worker";
// We create the worker lazily inside the hook below.

// ============================================================
// INITIAL GAME STATE
// ============================================================
function getInitialGameState(): GameState {
  return {
    board: initBoard(),
    turn: "w",
    selectedSq: null,
    legalMoves: [],
    history: [],
    capturedW: [],
    capturedB: [],
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    status: "playing",
    inCheck: null,
    moveLog: [],
  };
}

// ============================================================
// UPDATE CASTLING RIGHTS
// ============================================================
function updateCastlingRights(
  rights: GameState["castlingRights"],
  move: Move,
  board: Board
): GameState["castlingRights"] {
  const r = { ...rights };
  const piece = board[move.from[0]][move.from[1]];
  if (!piece) return r;
  if (piece.type === "K") {
    if (piece.color === "w") { r.wK = false; r.wQ = false; }
    else { r.bK = false; r.bQ = false; }
  }
  if (piece.type === "R") {
    if (move.from[0] === 7 && move.from[1] === 7) r.wK = false;
    if (move.from[0] === 7 && move.from[1] === 0) r.wQ = false;
    if (move.from[0] === 0 && move.from[1] === 7) r.bK = false;
    if (move.from[0] === 0 && move.from[1] === 0) r.bQ = false;
  }
  return r;
}

// ============================================================
// WORKER LOGIC STRING
// Inlined as a Blob so no extra build config is needed.
// This is the complete self-contained minimax implementation
// that runs inside the Web Worker thread.
// ============================================================
const workerLogic = `
function cloneBoard(board) {
  return board.map(function(row) { return row.map(function(sq) { return sq ? Object.assign({}, sq) : null; }); });
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
var PIECE_VALUE = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 };
var PST = {
  P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  R:[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  K:[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};
function getPseudoLegal(board, r, c, ep) {
  var piece = board[r][c]; if (!piece) return [];
  var moves = []; var type = piece.type; var color = piece.color; var opp = color==='w'?'b':'w';
  function addMove(tr,tc,extra) {
    if (!inBounds(tr,tc)) return false;
    var target = board[tr][tc];
    if (target && target.color===color) return false;
    var m = {from:[r,c],to:[tr,tc]}; if(target) m.captured=target; if(extra) Object.assign(m,extra);
    moves.push(m); return !target;
  }
  function slide(dr,dc) { var nr=r+dr,nc=c+dc; while(inBounds(nr,nc)){var cont=addMove(nr,nc);if(!cont)break;nr+=dr;nc+=dc;} }
  if(type==='P'){
    var dir=color==='w'?-1:1; var sr=color==='w'?6:1;
    if(inBounds(r+dir,c)&&!board[r+dir][c]){addMove(r+dir,c);if(r===sr&&!board[r+dir*2][c])addMove(r+dir*2,c);}
    [-1,1].forEach(function(dc){
      var nr=r+dir,nc=c+dc;
      if(inBounds(nr,nc)&&board[nr][nc]&&board[nr][nc].color===opp) addMove(nr,nc);
      if(ep&&ep[0]===nr&&ep[1]===nc) moves.push({from:[r,c],to:[nr,nc],enPassant:true,captured:{type:'P',color:opp}});
    });
  } else if(type==='N'){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(function(d){addMove(r+d[0],c+d[1]);});
  } else if(type==='B'){[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(d){slide(d[0],d[1]);});}
  else if(type==='R'){[[-1,0],[1,0],[0,-1],[0,1]].forEach(function(d){slide(d[0],d[1]);});}
  else if(type==='Q'){[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(function(d){slide(d[0],d[1]);});}
  else if(type==='K'){[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function(d){addMove(r+d[0],c+d[1]);});}
  return moves;
}
function findKing(board,color){for(var r=0;r<8;r++)for(var c=0;c<8;c++)if(board[r][c]&&board[r][c].type==='K'&&board[r][c].color===color)return[r,c];return[-1,-1];}
function isAttacked(board,r,c,byColor){
  for(var sr=0;sr<8;sr++)for(var sc=0;sc<8;sc++){var p=board[sr][sc];if(!p||p.color!==byColor)continue;var ms=getPseudoLegal(board,sr,sc,null);if(ms.some(function(m){return m.to[0]===r&&m.to[1]===c;}))return true;}return false;
}
function isInCheck(board,color){var k=findKing(board,color);return isAttacked(board,k[0],k[1],color==='w'?'b':'w');}
function applyMove(board,move){
  var nb=cloneBoard(board); var piece=nb[move.from[0]][move.from[1]];
  nb[move.to[0]][move.to[1]]=piece; nb[move.from[0]][move.from[1]]=null;
  if(move.enPassant){var cr=piece.color==='w'?move.to[0]+1:move.to[0]-1;nb[cr][move.to[1]]=null;}
  if(move.castling){var row=piece.color==='w'?7:0;if(move.castling==='K'){nb[row][5]=nb[row][7];nb[row][7]=null;}else{nb[row][3]=nb[row][0];nb[row][0]=null;}}
  if(piece.type==='P'&&(move.to[0]===0||move.to[0]===7))nb[move.to[0]][move.to[1]]={type:'Q',color:piece.color};
  return nb;
}
function getLegal(board,color,cr,ep){
  var moves=[];
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){if(!board[r][c]||board[r][c].color!==color)continue;var ps=getPseudoLegal(board,r,c,ep);ps.forEach(function(m){var nb=applyMove(board,m);if(!isInCheck(nb,color))moves.push(m);});}
  var row=color==='w'?7:0; var opp=color==='w'?'b':'w';
  if(!isInCheck(board,color)){
    if((color==='w'?cr.wK:cr.bK)&&!board[row][5]&&!board[row][6]&&!isAttacked(board,row,5,opp)&&!isAttacked(board,row,6,opp))moves.push({from:[row,4],to:[row,6],castling:'K'});
    if((color==='w'?cr.wQ:cr.bQ)&&!board[row][3]&&!board[row][2]&&!board[row][1]&&!isAttacked(board,row,3,opp)&&!isAttacked(board,row,2,opp))moves.push({from:[row,4],to:[row,2],castling:'Q'});
  }
  return moves;
}
function evaluate(board){
  var score=0;
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=board[r][c];if(!p)continue;var v=PIECE_VALUE[p.type];var pr=p.color==='w'?r:7-r;var ps=PST[p.type][pr][c];score+=p.color==='w'?v+ps:-(v+ps);}
  return score;
}
function minimax(board,depth,alpha,beta,max,cr,ep){
  if(depth===0)return evaluate(board);
  var color=max?'w':'b'; var moves=getLegal(board,color,cr,ep);
  if(moves.length===0){if(isInCheck(board,color))return max?-99999:99999;return 0;}
  if(max){var best=-Infinity;for(var i=0;i<moves.length;i++){var nb=applyMove(board,moves[i]);var s=minimax(nb,depth-1,alpha,beta,false,cr,ep);best=Math.max(best,s);alpha=Math.max(alpha,best);if(beta<=alpha)break;}return best;}
  else{var best2=Infinity;for(var j=0;j<moves.length;j++){var nb2=applyMove(board,moves[j]);var s2=minimax(nb2,depth-1,alpha,beta,true,cr,ep);best2=Math.min(best2,s2);beta=Math.min(beta,best2);if(beta<=alpha)break;}return best2;}
}
function chessWorkerHandler(data) {
  var board=data.board,cr=data.castlingRights,ep=data.enPassantTarget,depth=data.depth||3;
  var moves=getLegal(board,'b',cr,ep);
  if(moves.length===0)return null;
  var bestMove=moves[0],bestScore=Infinity;
  for(var i=0;i<moves.length;i++){
    var nb=applyMove(board,moves[i]);
    var s=minimax(nb,depth-1,-Infinity,Infinity,true,cr,ep);
    if(s<bestScore){bestScore=s;bestMove=moves[i];}
  }
  return bestMove;
}
`;

// ============================================================
// CHESS APP COMPONENT
// ============================================================
export default function ChessApp() {
  const [gs, setGs] = useState<GameState>(getInitialGameState());
  const [mode, setMode] = useState<GameMode>("ai");
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── APPLY AI MOVE — shared by worker result + fallback ──
  const applyAiMove = useCallback((move: Move) => {
    setGs(prev => {
      const newBoard = applyMoveToBoard(prev.board, move);
      const notation = toNotation(move, prev.board);
      const newCastling = updateCastlingRights(prev.castlingRights, move, prev.board);
      let newEP: [number, number] | null = null;
      const piece = prev.board[move.from[0]][move.from[1]];
      if (piece?.type === "P" && Math.abs(move.to[0] - move.from[0]) === 2) {
        newEP = [(move.from[0] + move.to[0]) / 2, move.to[1]];
      }
      const nextTurn: Color = "w";
      const nextLegal = getLegalMoves(newBoard, nextTurn, newCastling, newEP);
      const check = isInCheck(newBoard, nextTurn);
      let status: GameState["status"] = "playing";
      if (nextLegal.length === 0) status = check ? "checkmate" : "stalemate";
      const newCapturedB = move.captured && move.captured.color === "w"
        ? [...prev.capturedB, move.captured] : prev.capturedB;
      const lastLog = prev.moveLog[prev.moveLog.length - 1] ?? "";
      const newLog = [...prev.moveLog.slice(0, -1), `${lastLog} ${notation}`];
      return {
        ...prev, board: newBoard, turn: nextTurn,
        selectedSq: null, legalMoves: [],
        history: [...prev.history, move],
        capturedB: newCapturedB,
        castlingRights: newCastling,
        enPassantTarget: newEP,
        status, inCheck: check ? nextTurn : null,
        moveLog: newLog,
      };
    });
  }, []);

  // ── HANDLE SQUARE CLICK ────────────────────────────────
  const handleSquareClick = useCallback((r: number, c: number) => {
    setGs(prev => {
      if (prev.status !== "playing") return prev;
      if (mode === "ai" && prev.turn === "b") return prev;

      const clicked = prev.board[r][c];

      // If a square is already selected, try to move
      if (prev.selectedSq) {
        const [sr, sc] = prev.selectedSq;
        const move = prev.legalMoves.find(m => m.to[0] === r && m.to[1] === c);

        if (move) {
          // Execute move
          const newBoard = applyMoveToBoard(prev.board, move);
          const notation = toNotation(move, prev.board);
          const newCastling = updateCastlingRights(prev.castlingRights, move, prev.board);

          // En passant target
          let newEP: [number,number] | null = null;
          const piece = prev.board[move.from[0]][move.from[1]];
          if (piece?.type === "P" && Math.abs(move.to[0] - move.from[0]) === 2) {
            newEP = [(move.from[0] + move.to[0]) / 2, move.to[1]];
          }

          const nextTurn: Color = prev.turn === "w" ? "b" : "w";
          const nextLegal = getLegalMoves(newBoard, nextTurn, newCastling, newEP);
          const check = isInCheck(newBoard, nextTurn);

          let status: GameState["status"] = "playing";
          if (nextLegal.length === 0) {
            status = check ? "checkmate" : "stalemate";
          }

          const newCapturedW = move.captured && move.captured.color === "b"
            ? [...prev.capturedW, move.captured] : prev.capturedW;
          const newCapturedB = move.captured && move.captured.color === "w"
            ? [...prev.capturedB, move.captured] : prev.capturedB;

          const moveNum = Math.ceil((prev.history.length + 1) / 2);
          const logEntry = prev.turn === "w"
            ? `${moveNum}. ${notation}`
            : `${prev.moveLog[prev.moveLog.length - 1]} ${notation}`;
          const newLog = prev.turn === "w"
            ? [...prev.moveLog, logEntry]
            : [...prev.moveLog.slice(0, -1), logEntry];

          return {
            ...prev,
            board: newBoard,
            turn: nextTurn,
            selectedSq: null,
            legalMoves: [],
            history: [...prev.history, move],
            capturedW: newCapturedW,
            capturedB: newCapturedB,
            castlingRights: newCastling,
            enPassantTarget: newEP,
            status,
            inCheck: check ? nextTurn : null,
            moveLog: newLog,
          };
        }

        // Clicked same square — deselect
        if (sr === r && sc === c) {
          return { ...prev, selectedSq: null, legalMoves: [] };
        }
      }

      // Select a piece of current turn's color
      if (clicked?.color === prev.turn) {
        const moves = getLegalMoves(prev.board, prev.turn, prev.castlingRights, prev.enPassantTarget, [r, c]);
        return { ...prev, selectedSq: [r, c], legalMoves: moves };
      }

      return { ...prev, selectedSq: null, legalMoves: [] };
    });
  }, [mode]);

  // ── AI MOVE — runs in a Web Worker so UI never freezes ──
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (mode !== "ai" || gs.turn !== "b" || gs.status !== "playing") return;

    setAiThinking(true);

    // Terminate any previous worker that might still be running
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // Inline worker via Blob — no build config needed
    // This avoids the ?worker Vite syntax and works universally
    const workerCode = `
      ${workerLogic}
      self.onmessage = function(e) {
        var result = chessWorkerHandler(e.data);
        self.postMessage(result);
      };
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    // Safety timeout — if worker takes > 8s, fall back to random move
    const safetyTimer = setTimeout(() => {
      worker.terminate();
      workerRef.current = null;
      URL.revokeObjectURL(workerUrl);
      // Fallback: pick a random legal move
      const moves = getLegalMoves(gs.board, "b", gs.castlingRights, gs.enPassantTarget);
      if (moves.length > 0) {
        applyAiMove(moves[Math.floor(Math.random() * moves.length)]);
      }
      setAiThinking(false);
    }, 8000);

    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(safetyTimer);
      worker.terminate();
      workerRef.current = null;
      URL.revokeObjectURL(workerUrl);
      const move: Move | null = e.data;
      if (move) applyAiMove(move);
      setAiThinking(false);
    };

    worker.onerror = () => {
      clearTimeout(safetyTimer);
      worker.terminate();
      workerRef.current = null;
      URL.revokeObjectURL(workerUrl);
      // Fallback on error
      const moves = getLegalMoves(gs.board, "b", gs.castlingRights, gs.enPassantTarget);
      if (moves.length > 0) applyAiMove(moves[0]);
      setAiThinking(false);
    };

    // Send board state to worker
    worker.postMessage({
      board: gs.board,
      castlingRights: gs.castlingRights,
      enPassantTarget: gs.enPassantTarget,
      depth: 3,
    });

    return () => {
      clearTimeout(safetyTimer);
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      URL.revokeObjectURL(workerUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.turn, gs.status, mode]);

  // ── UNDO ───────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setGs(prev => {
      const movesToUndo = mode === "ai" ? 2 : 1;
      if (prev.history.length < movesToUndo) return prev;
      // Replay from scratch
      let state = getInitialGameState();
      const newHistory = prev.history.slice(0, -movesToUndo);
      for (const move of newHistory) {
        const newBoard = applyMoveToBoard(state.board, move);
        const newCastling = updateCastlingRights(state.castlingRights, move, state.board);
        let newEP: [number,number] | null = null;
        const piece = state.board[move.from[0]][move.from[1]];
        if (piece?.type === "P" && Math.abs(move.to[0] - move.from[0]) === 2) {
          newEP = [(move.from[0] + move.to[0]) / 2, move.to[1]];
        }
        const cap = move.captured;
        state = {
          ...state,
          board: newBoard,
          turn: state.turn === "w" ? "b" : "w",
          castlingRights: newCastling,
          enPassantTarget: newEP,
          history: [...state.history, move],
          capturedW: cap && cap.color === "b" ? [...state.capturedW, cap] : state.capturedW,
          capturedB: cap && cap.color === "w" ? [...state.capturedB, cap] : state.capturedB,
        };
      }
      return { ...state, selectedSq: null, legalMoves: [], status: "playing", inCheck: null, moveLog: prev.moveLog.slice(0, -movesToUndo) };
    });
  }, [mode]);

  // ── RESET ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    setAiThinking(false);
    setGs(getInitialGameState());
  }, []);

  // ── RENDER HELPERS ─────────────────────────────────────
  const legalDests = new Set(gs.legalMoves.map(m => `${m.to[0]},${m.to[1]}`));

  const sqSize = 54; // px per square

  const renderBoard = () => {
    const squares = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const isSelected = gs.selectedSq?.[0] === r && gs.selectedSq?.[1] === c;
        const isLegal = legalDests.has(`${r},${c}`);
        const isLastFrom = gs.history.length > 0 && gs.history[gs.history.length-1].from[0] === r && gs.history[gs.history.length-1].from[1] === c;
        const isLastTo = gs.history.length > 0 && gs.history[gs.history.length-1].to[0] === r && gs.history[gs.history.length-1].to[1] === c;
        const piece = gs.board[r][c];
        const isKingInCheck = piece?.type === "K" && piece?.color === gs.inCheck;

        let bg = isLight ? "#cbd5e1" : "#475569";
        if (isSelected) bg = "#00d4aa88";
        else if (isLastFrom || isLastTo) bg = isLight ? "#fde68a" : "#ca8a04";
        if (isKingInCheck) bg = "#ef444488";

        squares.push(
          <div
            key={`${r},${c}`}
            onClick={() => handleSquareClick(r, c)}
            style={{
              width: sqSize, height: sqSize,
              background: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {/* Legal move dot */}
            {isLegal && (
              <div style={{
                position: "absolute",
                width: piece ? sqSize - 4 : 18,
                height: piece ? sqSize - 4 : 18,
                borderRadius: "50%",
                background: piece ? "transparent" : "rgba(0,212,170,0.45)",
                border: piece ? "3px solid rgba(0,212,170,0.7)" : "none",
                zIndex: 1,
                pointerEvents: "none",
              }} />
            )}
            {/* Piece */}
            {piece && (
              <span style={{
                fontSize: sqSize * 0.62,
                lineHeight: 1,
                zIndex: 2,
                filter: piece.color === "w"
                  ? "drop-shadow(0 1px 2px rgba(0,0,0,0.6))"
                  : "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
                userSelect: "none",
              }}>
                {PIECE_UNICODE[piece.color][piece.type]}
              </span>
            )}
            {/* Rank label */}
            {c === 0 && (
              <span style={{ position: "absolute", top: 2, left: 3, fontSize: 10, color: isLight ? "#475569" : "#cbd5e1", fontWeight: 700, lineHeight: 1 }}>
                {RANKS[r]}
              </span>
            )}
            {/* File label */}
            {r === 7 && (
              <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 10, color: isLight ? "#475569" : "#cbd5e1", fontWeight: 700, lineHeight: 1 }}>
                {FILES[c]}
              </span>
            )}
          </div>
        );
      }
    }
    return squares;
  };

  const renderCaptured = (pieces: Piece[], byColor: Color) => {
    if (pieces.length === 0) return <span style={{ color: "#334155", fontSize: 11 }}>—</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {pieces.sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type]).map((p, i) => (
          <span key={i} style={{ fontSize: 16, lineHeight: 1 }}>{PIECE_UNICODE[p.color][p.type]}</span>
        ))}
      </div>
    );
  };

  const statusText = () => {
    if (gs.status === "checkmate") return `Checkmate — ${gs.turn === "w" ? "Black" : "White"} wins!`;
    if (gs.status === "stalemate") return "Stalemate — Draw!";
    if (aiThinking) return "AI is thinking...";
    if (gs.inCheck) return `${gs.inCheck === "w" ? "White" : "Black"} is in check!`;
    return `${gs.turn === "w" ? "White" : "Black"} to move`;
  };

  const statusColor = () => {
    if (gs.status === "checkmate") return "#ef4444";
    if (gs.status === "stalemate") return "#f59e0b";
    if (gs.inCheck) return "#f97316";
    if (aiThinking) return "#a78bfa";
    return "#00d4aa";
  };

  const moveLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (moveLogRef.current) moveLogRef.current.scrollTop = moveLogRef.current.scrollHeight;
  }, [gs.moveLog]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{
      height: "100%", background: "#0f172a",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, sans-serif",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderBottom: "1px solid #1e293b", flexShrink: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#1e293b", borderRadius: 8, padding: 3, gap: 3 }}>
          {(["ai", "2p"] as GameMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); handleReset(); }}
              style={{
                background: mode === m ? "#00d4aa22" : "transparent",
                border: mode === m ? "1px solid #00d4aa44" : "1px solid transparent",
                borderRadius: 6, color: mode === m ? "#00d4aa" : "#475569",
                fontSize: 12, padding: "4px 12px", cursor: "pointer", fontWeight: 700,
              }}>
              {m === "ai" ? "vs AI" : "2 Players"}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ color: statusColor(), fontSize: 13, fontWeight: 700 }}>{statusText()}</div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleUndo}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>
            ↩ Undo
          </button>
          <button onClick={handleReset}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Board */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12, flexShrink: 0 }}>
          {/* Black captured */}
          <div style={{ width: sqSize * 8, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748b", fontSize: 11, width: 80 }}>Captured:</span>
            {renderCaptured(gs.capturedB, "w")}
          </div>

          {/* Board grid */}
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(8, ${sqSize}px)`,
            border: "2px solid #334155", borderRadius: 6, overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            {renderBoard()}
          </div>

          {/* White captured */}
          <div style={{ width: sqSize * 8, marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748b", fontSize: 11, width: 80 }}>Captured:</span>
            {renderCaptured(gs.capturedW, "b")}
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          borderLeft: "1px solid #1e293b", minWidth: 0, overflow: "hidden",
        }}>
          {/* Player indicators */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b" }}>
            {(["b", "w"] as Color[]).map(color => {
              const isActive = gs.turn === color && gs.status === "playing";
              const isAI = mode === "ai" && color === "b";
              return (
                <div key={color} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  borderRadius: 8, marginBottom: 4,
                  background: isActive ? "#1e293b" : "transparent",
                  border: isActive ? "1px solid #00d4aa33" : "1px solid transparent",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: color === "w" ? "#f1f5f9" : "#1e293b",
                    border: "2px solid #475569",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12,
                  }}>
                    {color === "w" ? "♔" : "♚"}
                  </div>
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700 }}>
                      {color === "w" ? "White" : "Black"} {isAI ? "(AI)" : ""}
                    </div>
                    {isActive && <div style={{ color: "#00d4aa", fontSize: 10 }}>{aiThinking ? "thinking..." : "to move"}</div>}
                  </div>
                  {isActive && <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#00d4aa", boxShadow: "0 0 6px #00d4aa" }} />}
                </div>
              );
            })}
          </div>

          {/* Move history log */}
          <div style={{ padding: "8px 14px 4px", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>
            Move History
          </div>
          <div ref={moveLogRef} style={{
            flex: 1, overflowY: "auto", padding: "0 14px 14px",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {gs.moveLog.length === 0
              ? <div style={{ color: "#1e293b", fontSize: 12, marginTop: 8 }}>No moves yet</div>
              : gs.moveLog.map((entry, i) => (
                <div key={i} style={{
                  color: "#94a3b8", fontSize: 12, fontFamily: "monospace",
                  background: i === gs.moveLog.length - 1 ? "#1e293b" : "transparent",
                  borderRadius: 4, padding: "2px 6px",
                }}>
                  {entry}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}