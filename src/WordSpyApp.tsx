import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, set, get, onValue, update, push } from 'firebase/database';
import { db } from './firebase';

// ── Word Pairs ────────────────────────────────────────────────────────────────
// [normal word, spy word] — related but different enough to trip up the spy

const WORD_PAIRS: [string, string][] = [
  ['Apple',      'Pear'],
  ['Cat',        'Dog'],
  ['Sun',        'Moon'],
  ['Coffee',     'Tea'],
  ['Guitar',     'Piano'],
  ['Mountain',   'Volcano'],
  ['Ocean',      'Lake'],
  ['Castle',     'Palace'],
  ['Diamond',    'Ruby'],
  ['Soccer',     'Rugby'],
  ['Pizza',      'Flatbread'],
  ['Lion',       'Tiger'],
  ['Summer',     'Spring'],
  ['Doctor',     'Nurse'],
  ['Violin',     'Cello'],
  ['Butter',     'Margarine'],
  ['Airplane',   'Helicopter'],
  ['Gold',       'Silver'],
  ['Shark',      'Dolphin'],
  ['Rose',       'Tulip'],
  ['King',       'Emperor'],
  ['Thunder',    'Lightning'],
  ['Chocolate',  'Vanilla'],
  ['Eagle',      'Hawk'],
  ['Monkey',     'Ape'],
  ['Bicycle',    'Motorcycle'],
  ['Sword',      'Dagger'],
  ['Spaghetti',  'Noodles'],
  ['Whiskey',    'Rum'],
  ['Desert',     'Savanna'],
  ['Painting',   'Sculpture'],
  ['Laptop',     'Tablet'],
  ['Bread',      'Croissant'],
  ['River',      'Stream'],
  ['Snow',       'Hail'],

  // Animals
  ['Wolf',       'Fox'],
  ['Penguin',    'Seal'],
  ['Elephant',   'Hippo'],
  ['Crocodile',  'Alligator'],
  ['Parrot',     'Toucan'],
  ['Rabbit',     'Hare'],
  ['Deer',       'Antelope'],
  ['Crab',       'Lobster'],
  ['Frog',       'Toad'],
  ['Butterfly',  'Moth'],
  ['Bee',        'Wasp'],
  ['Peacock',    'Flamingo'],
  ['Bear',       'Panda'],
  ['Whale',      'Manatee'],
  ['Gorilla',    'Chimpanzee'],

  // Food & Drink
  ['Burger',     'Hotdog'],
  ['Sushi',      'Sashimi'],
  ['Cake',       'Muffin'],
  ['Pasta',      'Risotto'],
  ['Lemon',      'Lime'],
  ['Strawberry', 'Raspberry'],
  ['Milk',       'Yogurt'],
  ['Soup',       'Stew'],
  ['Bacon',      'Ham'],
  ['Cookie',     'Biscuit'],
  ['Waffle',     'Pancake'],
  ['Grape',      'Plum'],
  ['Mango',      'Papaya'],
  ['Onion',      'Garlic'],
  ['Shrimp',     'Prawn'],

  // Nature & Places
  ['Forest',     'Jungle'],
  ['Island',     'Peninsula'],
  ['Cave',       'Tunnel'],
  ['Waterfall',  'Geyser'],
  ['Cliff',      'Ravine'],
  ['Pond',       'Swamp'],
  ['Glacier',    'Iceberg'],
  ['Valley',     'Canyon'],
  ['Tornado',    'Hurricane'],
  ['Fog',        'Mist'],
  ['Beach',      'Coast'],
  ['Prairie',    'Meadow'],
  ['Volcano',    'Geyser'],
  ['Dune',       'Cliff'],
  ['Aurora',     'Eclipse'],

  // Sports & Games
  ['Tennis',     'Badminton'],
  ['Boxing',     'Wrestling'],
  ['Swimming',   'Diving'],
  ['Chess',      'Checkers'],
  ['Marathon',   'Triathlon'],
  ['Archery',    'Javelin'],
  ['Skiing',     'Snowboarding'],
  ['Surfing',    'Kiteboarding'],
  ['Golf',       'Croquet'],
  ['Volleyball', 'Basketball'],
  ['Darts',      'Bowling'],
  ['Fencing',    'Judo'],
  ['Poker',      'Blackjack'],
  ['Cricket',    'Baseball'],
  ['Kayaking',   'Rowing'],

  // Objects & Technology
  ['Telescope',  'Microscope'],
  ['Clock',      'Compass'],
  ['Lantern',    'Torch'],
  ['Hammer',     'Wrench'],
  ['Candle',     'Lamp'],
  ['Mirror',     'Window'],
  ['Umbrella',   'Raincoat'],
  ['Backpack',   'Suitcase'],
  ['Camera',     'Binoculars'],
  ['Rope',       'Chain'],
  ['Helmet',     'Shield'],
  ['Anchor',     'Compass'],
  ['Drum',       'Tambourine'],
  ['Flute',      'Clarinet'],
  ['Cannon',     'Catapult'],

  // People & Roles
  ['Chef',       'Baker'],
  ['Pilot',      'Astronaut'],
  ['Knight',     'Samurai'],
  ['Wizard',     'Witch'],
  ['Pirate',     'Viking'],
  ['Detective',  'Spy'],
  ['Sculptor',   'Painter'],
  ['Sailor',     'Fisherman'],
  ['Carpenter',  'Blacksmith'],
  ['Judge',      'Lawyer'],

  // Misc concepts
  ['Dream',      'Nightmare'],
  ['Smile',      'Laugh'],
  ['Whisper',    'Shout'],
  ['Shadow',     'Reflection'],
  ['Legend',     'Myth'],
  ['Trophy',     'Medal'],
  ['Prison',     'Dungeon'],
  ['Throne',     'Crown'],
  ['Compass',    'Map'],
  ['Secret',     'Riddle'],
];

const MAX_ROUNDS = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

type WordPhase = 'lobby' | 'reveal' | 'hints' | 'guessing' | 'result';

interface WordPlayer {
  name: string;
  isHost: boolean;
  isSpy: boolean;
  score: number;
  cardSeen: boolean;
  hints: Record<string, string>; // '1' | '2' | '3' → hint word
  vote: string;                  // player name voted as spy
}

interface WordRoomData {
  phase: WordPhase;
  round: number;
  wordPair: { normal: string; spy: string };
  players: Record<string, WordPlayer>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#0f172a',
  panel:  '#1e293b',
  border: '#334155',
  accent: '#00d4aa',
  danger: '#ef4444',
  text:   '#f1f5f9',
  muted:  '#94a3b8',
  dimmed: '#64748b',
  gold:   '#f59e0b',
};

const btnBase: React.CSSProperties = {
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: 14, padding: '10px 20px',
};

const wrap: React.CSSProperties = {
  background: C.bg, height: '100%', overflowY: 'auto',
  padding: 24, boxSizing: 'border-box', color: C.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WordSpyApp({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<'entry' | 'lobby' | 'game'>('entry');

  // Entry
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining]     = useState(false);
  const [error, setError]         = useState('');

  // Session — persisted to sessionStorage
  const [roomCode, setRoomCode] = useState('');
  const [myKey, setMyKey]       = useState('');

  // Live room data
  const [room, setRoom] = useState<WordRoomData | null>(null);

  // Derived — host status from Firebase (survives refresh)
  const isHost = !!(room && myKey && room.players[myKey]?.isHost);

  // Hint input (local only — submission status derived from Firebase)
  const [hintInput, setHintInput] = useState('');

  // Vote (local selection — submitted status derived from Firebase)
  const [myVote, setMyVote] = useState('');

  // Prevent duplicate phase transitions
  const resultTransitioned = useRef(false);
  // Track previous spy so the same player isn't spy twice in a row
  const lastSpyKey = useRef<string>('');

  // ── Session restore on remount ────────────────────────────────────────────

  useEffect(() => {
    const savedRoom = sessionStorage.getItem('wordspy_roomCode');
    if (!savedRoom) return;
    const savedKey = sessionStorage.getItem(`wordspy_myKey_${savedRoom}`);
    if (!savedKey) return;
    get(ref(db, `wordRooms/${savedRoom}/players/${savedKey}`)).then(snap => {
      if (snap.exists()) {
        setRoomCode(savedRoom);
        setMyKey(savedKey);
      } else {
        sessionStorage.removeItem('wordspy_roomCode');
        sessionStorage.removeItem(`wordspy_myKey_${savedRoom}`);
      }
    });
  }, []);

  // ── Subscribe to room ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `wordRooms/${roomCode}`);
    const unsub = onValue(roomRef, snap => {
      if (!snap.exists()) { setRoom(null); return; }
      setRoom(snap.val() as WordRoomData);
    });
    return () => unsub();
  }, [roomCode]);

  // ── Navigate based on phase ───────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;
    if (room.phase === 'lobby') setScreen('lobby');
    else setScreen('game');
  }, [room?.phase]);

  // ── Clear hint input when round advances ─────────────────────────────────

  useEffect(() => {
    setHintInput('');
  }, [room?.round]);

  // ── Clear vote selection and reset transition guard on phase change ────────

  useEffect(() => {
    setMyVote('');
    if (room?.phase !== 'guessing') resultTransitioned.current = false;
  }, [room?.phase]);

  // ── Auto-advance: when all hints in → next round or guessing ─────────────

  useEffect(() => {
    if (!room || !roomCode || room.phase !== 'hints') return;
    const entries = Object.entries(room.players);
    const roundKey = String(room.round);
    const allSubmitted = entries.every(([, p]) => !!p.hints?.[roundKey]);
    if (!allSubmitted) return;

    if (room.round >= MAX_ROUNDS) {
      update(ref(db, `wordRooms/${roomCode}`), { phase: 'guessing' });
    } else {
      update(ref(db, `wordRooms/${roomCode}`), { round: room.round + 1 });
    }
  }, [room, roomCode]);

  // ── Auto-transition: all voted → calculate scores → result ───────────────

  const calculateAndFinish = useCallback(async (currentRoom: WordRoomData) => {
    if (!roomCode || resultTransitioned.current) return;
    resultTransitioned.current = true;

    const entries = Object.entries(currentRoom.players);
    const spyEntry = entries.find(([, p]) => p.isSpy);
    if (!spyEntry) return;
    const spyName = spyEntry[1].name;

    const nonSpies = entries.filter(([, p]) => !p.isSpy);
    const allCorrect = nonSpies.every(([, p]) => p.vote === spyName);

    const scoreUpdates: Record<string, unknown> = { phase: 'result' };
    entries.forEach(([key, p]) => {
      const gained = p.isSpy ? (allCorrect ? 0 : 1) : (allCorrect ? 1 : 0);
      scoreUpdates[`players/${key}/score`] = p.score + gained;
    });
    await update(ref(db, `wordRooms/${roomCode}`), scoreUpdates);
  }, [roomCode]);

  useEffect(() => {
    if (!room || !roomCode || room.phase !== 'guessing') return;
    const entries = Object.entries(room.players);
    if (entries.length === 0) return;
    if (entries.every(([, p]) => p.vote !== '')) {
      calculateAndFinish(room);
    }
  }, [room, roomCode, calculateAndFinish]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('wordspy_roomCode');
    if (roomCode) sessionStorage.removeItem(`wordspy_myKey_${roomCode}`);
    onBack();
  }, [roomCode, onBack]);

  const createRoom = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) { setError('Enter your name'); return; }
    setJoining(true); setError('');
    try {
      const code = genCode();
      const key = push(ref(db, `wordRooms/${code}/players`)).key!;
      await set(ref(db, `wordRooms/${code}`), {
        phase: 'lobby', round: 1,
        wordPair: { normal: '', spy: '' },
        players: {
          [key]: { name, isHost: true, isSpy: false, score: 0, cardSeen: false, hints: {}, vote: '' },
        },
      });
      sessionStorage.setItem('wordspy_roomCode', code);
      sessionStorage.setItem(`wordspy_myKey_${code}`, key);
      setRoomCode(code); setMyKey(key); setScreen('lobby');
    } catch { setError('Failed to create room. Check connection.'); }
    finally { setJoining(false); }
  }, [nameInput]);

  const joinRoom = useCallback(async () => {
    const name = nameInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!name) { setError('Enter your name'); return; }
    if (code.length < 4) { setError('Enter a valid room code'); return; }
    setJoining(true); setError('');
    try {
      const snap = await get(ref(db, `wordRooms/${code}`));
      if (!snap.exists()) { setError('Room not found'); setJoining(false); return; }
      const data = snap.val() as WordRoomData;
      if (data.phase !== 'lobby') { setError('Game already in progress'); setJoining(false); return; }
      const key = push(ref(db, `wordRooms/${code}/players`)).key!;
      await set(ref(db, `wordRooms/${code}/players/${key}`), {
        name, isHost: false, isSpy: false, score: 0, cardSeen: false, hints: {}, vote: '',
      });
      sessionStorage.setItem('wordspy_roomCode', code);
      sessionStorage.setItem(`wordspy_myKey_${code}`, key);
      setRoomCode(code); setMyKey(key); setScreen('lobby');
    } catch { setError('Failed to join room. Check connection.'); }
    finally { setJoining(false); }
  }, [nameInput, codeInput]);

  const startGame = useCallback(async () => {
    if (!room || !roomCode) return;
    const playerEntries = Object.entries(room.players);
    if (playerEntries.length < 2) return;

    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    const eligible = playerEntries.filter(([key]) => key !== lastSpyKey.current);
    const pickFrom = eligible.length > 0 ? eligible : playerEntries;
    const spyKey = pickFrom[Math.floor(Math.random() * pickFrom.length)][0];
    lastSpyKey.current = spyKey;
    const updatedPlayers: Record<string, WordPlayer> = {};
    playerEntries.forEach(([key, p]) => {
      updatedPlayers[key] = { ...p, isSpy: key === spyKey, cardSeen: false, hints: {}, vote: '' };
    });
    await update(ref(db, `wordRooms/${roomCode}`), {
      phase: 'reveal', round: 1,
      wordPair: { normal: pair[0], spy: pair[1] },
      players: updatedPlayers,
    });
  }, [room, roomCode]);

  const markCardSeen = useCallback(async () => {
    if (!roomCode || !myKey || !room) return;
    await update(ref(db, `wordRooms/${roomCode}/players/${myKey}`), { cardSeen: true });
    // Start hints phase when last player has seen their card
    const allSeen = Object.entries(room.players).every(([k, p]) => k === myKey ? true : p.cardSeen);
    if (allSeen) {
      await update(ref(db, `wordRooms/${roomCode}`), { phase: 'hints', round: 1 });
    }
  }, [roomCode, myKey, room]);

  const submitHint = useCallback(async () => {
    const hint = hintInput.trim();
    if (!hint || !roomCode || !myKey || !room) return;
    setHintInput(''); // clear immediately for snappy UX
    await update(ref(db, `wordRooms/${roomCode}/players/${myKey}/hints`), {
      [String(room.round)]: hint,
    });
  }, [hintInput, roomCode, myKey, room]);

  const submitVote = useCallback(async () => {
    if (!myVote || !roomCode || !myKey) return;
    await update(ref(db, `wordRooms/${roomCode}/players/${myKey}`), { vote: myVote });
  }, [myVote, roomCode, myKey]);

  const forceResult = useCallback(async () => {
    if (!room) return;
    await calculateAndFinish(room);
  }, [room, calculateAndFinish]);

  const playAgain = useCallback(async () => {
    if (!room || !roomCode) return;
    const reset: Record<string, unknown> = {
      phase: 'lobby', round: 1,
      wordPair: { normal: '', spy: '' },
    };
    Object.keys(room.players).forEach(key => {
      reset[`players/${key}/isSpy`]    = false;
      reset[`players/${key}/cardSeen`] = false;
      reset[`players/${key}/hints`]    = {};
      reset[`players/${key}/vote`]     = '';
    });
    await update(ref(db, `wordRooms/${roomCode}`), reset);
    setHintInput('');
    setMyVote('');
  }, [room, roomCode]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ─ Entry ─────────────────────────────────────────────────────────────────

  if (screen === 'entry') return (
    <div style={wrap}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={leaveRoom} style={{ ...btnBase, background: C.panel, color: C.muted, padding: '6px 12px' }}>← Back</button>
          <h2 style={{ color: C.accent, fontSize: 22, fontWeight: 800, margin: 0 }}>🔤 Word Spy</h2>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your Name</div>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Enter your name"
            onKeyDown={e => e.key === 'Enter' && createRoom()}
            style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button onClick={createRoom} disabled={joining}
          style={{ ...btnBase, width: '100%', fontSize: 15, padding: '14px', marginBottom: 12, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', opacity: joining ? 0.6 : 1 }}>
          {joining ? 'Creating…' : '+ Create Room'}
        </button>

        <div style={{ textAlign: 'center', color: C.dimmed, fontSize: 12, marginBottom: 12 }}>— or join an existing room —</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="Room Code" maxLength={6}
            style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 15, outline: 'none', letterSpacing: 3, textTransform: 'uppercase' }} />
          <button onClick={joinRoom} disabled={joining}
            style={{ ...btnBase, background: C.panel, color: C.accent, border: `1px solid ${C.accent}55`, padding: '10px 20px', opacity: joining ? 0.6 : 1 }}>
            {joining ? '…' : 'Join'}
          </button>
        </div>

        <div style={{ marginTop: 24, background: C.panel, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>How to Play</div>
          {[
            { icon: '🏠', text: 'Host creates a room. Friends join with the 6-letter code.' },
            { icon: '🔤', text: 'Everyone gets a word. All players get the same word — except the spy who gets a different but related word.' },
            { icon: '💬', text: 'Over 3 rounds, each player types a one-word hint describing their word without giving it away.' },
            { icon: '🕵️', text: 'After all 3 rounds, everyone guesses who the spy is.' },
            { icon: '🏆', text: 'All players correctly identify the spy → each gets +1 pt. Any wrong guess → spy gets +1 pt. Scores carry over between rounds!' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─ Lobby ─────────────────────────────────────────────────────────────────

  if (screen === 'lobby' && room) {
    const players = Object.entries(room.players);
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Room Code</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 8, color: C.accent, fontFamily: 'monospace' }}>{roomCode}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Share this code with your friends</div>
          </div>

          <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Players ({players.length})
            </div>
            {players.map(([key, p]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, marginBottom: 6, background: C.bg, border: `1px solid ${key === myKey ? C.accent + '44' : C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{p.isHost ? '👑' : '👤'}</span>
                  <span style={{ color: key === myKey ? C.accent : C.text, fontSize: 14, fontWeight: key === myKey ? 700 : 400 }}>
                    {p.name}{key === myKey ? ' (you)' : ''}
                  </span>
                </div>
                <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{p.score} pts</span>
              </div>
            ))}
            {players.length < 2 && (
              <div style={{ color: C.dimmed, fontSize: 12, textAlign: 'center', marginTop: 8 }}>Waiting for at least 2 players…</div>
            )}
          </div>

          {isHost ? (
            <button onClick={startGame} disabled={players.length < 2}
              style={{ ...btnBase, width: '100%', fontSize: 16, padding: '14px', marginBottom: 10, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', opacity: players.length < 2 ? 0.5 : 1 }}>
              Start Round
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: 14, background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, marginBottom: 10 }}>
              Waiting for host to start…
            </div>
          )}

          <button onClick={leaveRoom} style={{ ...btnBase, width: '100%', padding: '11px', fontSize: 14, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // ─ Game ──────────────────────────────────────────────────────────────────

  if (screen === 'game' && room) {
    const playerEntries = Object.entries(room.players);
    const me = room.players[myKey];
    if (!me) return <div style={wrap}><div style={{ color: C.muted }}>Loading…</div></div>;

    // ── Reveal ──

    if (room.phase === 'reveal') {
      const myWord = me.isSpy ? room.wordPair.spy : room.wordPair.normal;
      if (!me.cardSeen) {
        return (
          <div style={wrap}>
            <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Your Secret Word</div>
              <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
                <span style={{ color: C.accent }}>{me.name}</span>, tap to reveal
              </h3>
              <button onClick={markCardSeen}
                style={{ ...btnBase, width: '100%', padding: '60px 20px', fontSize: 15, background: 'linear-gradient(135deg,#1e293b,#334155)', color: C.muted, border: `2px dashed ${C.border}`, borderRadius: 16 }}>
                👆 Tap to reveal your secret word
              </button>
              <div style={{ marginTop: 16, color: C.dimmed, fontSize: 12 }}>
                {playerEntries.filter(([, p]) => p.cardSeen).length} / {playerEntries.length} ready
              </div>
              <button onClick={leaveRoom} style={{ ...btnBase, marginTop: 20, width: '100%', padding: '10px', fontSize: 13, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
                Leave Room
              </button>
            </div>
          </div>
        );
      }

      // Card seen — show word while waiting for others
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              background: me.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)',
              border: `2px solid ${me.isSpy ? C.danger : C.accent}`,
              borderRadius: 16, padding: '36px 28px', marginBottom: 20,
              boxShadow: `0 0 32px ${me.isSpy ? C.danger : C.accent}33`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>{me.isSpy ? '🕵️' : '🔤'}</div>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                {me.isSpy ? "You are the Spy — Your Word" : "Your Word"}
              </div>
              <div style={{ color: me.isSpy ? C.danger : C.accent, fontSize: 36, fontWeight: 900 }}>{myWord}</div>
              <div style={{ color: me.isSpy ? '#fca5a5' : '#6ee7b7', fontSize: 12, marginTop: 14, lineHeight: 1.7 }}>
                {me.isSpy
                  ? 'Others have a different but related word. Give hints that fit your word without being too obvious!'
                  : 'The spy has a similar but different word. Give hints that are clear to others but mislead the spy!'}
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              Waiting for others… ({playerEntries.filter(([, p]) => p.cardSeen).length}/{playerEntries.length} ready)
            </div>
            <button onClick={leaveRoom} style={{ ...btnBase, width: '100%', padding: '10px', fontSize: 13, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
              Leave Room
            </button>
          </div>
        </div>
      );
    }

    // ── Hints ──

    if (room.phase === 'hints') {
      const myWord = me.isSpy ? room.wordPair.spy : room.wordPair.normal;
      const roundKey = String(room.round);
      const myHintThisRound = me.hints?.[roundKey] ?? '';
      const alreadySubmitted = !!myHintThisRound; // derived from Firebase — always in sync
      const submittedCount = playerEntries.filter(([, p]) => !!p.hints?.[roundKey]).length;

      return (
        <div style={wrap}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>

            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{
                background: me.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)',
                borderRadius: 8, padding: '8px 14px',
                border: `1px solid ${me.isSpy ? C.danger : C.accent}44`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 15 }}>{me.isSpy ? '🕵️' : '🔤'}</span>
                <span style={{ color: me.isSpy ? C.danger : C.accent, fontSize: 14, fontWeight: 700 }}>{myWord}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.accent, fontSize: 20, fontWeight: 900 }}>Round {room.round} / {MAX_ROUNDS}</div>
                <div style={{ color: C.dimmed, fontSize: 11 }}>{submittedCount} / {playerEntries.length} submitted</div>
              </div>
            </div>

            {/* Previous rounds */}
            {Array.from({ length: room.round - 1 }, (_, i) => i + 1).map(r => (
              <div key={r} style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Round {r} Hints</div>
                {playerEntries.map(([key, p]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}44` }}>
                    <span style={{ color: key === myKey ? C.accent : C.muted, fontSize: 13 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                    <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.hints?.[String(r)] || '—'}</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Current round input + live results */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.accent}33` }}>
              <div style={{ color: C.accent, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Round {room.round} — Type Your Hint
              </div>

              {!alreadySubmitted ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={hintInput}
                    onChange={e => setHintInput(e.target.value.replace(/\s/g, ''))} // no spaces — single word
                    onKeyDown={e => e.key === 'Enter' && submitHint()}
                    placeholder="One word…"
                    maxLength={24}
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 12px', fontSize: 15, outline: 'none' }}
                  />
                  <button onClick={submitHint} disabled={!hintInput.trim()}
                    style={{ ...btnBase, background: hintInput.trim() ? C.accent : C.panel, color: hintInput.trim() ? '#0f172a' : C.dimmed, padding: '10px 18px' }}>
                    Submit
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <span style={{ color: C.accent, fontSize: 22 }}>✓</span>
                  <span style={{ color: C.accent, fontSize: 15, fontWeight: 700 }}>{myHintThisRound || hintInput}</span>
                  <span style={{ color: C.muted, fontSize: 13 }}>submitted</span>
                </div>
              )}

              {/* Live hints as they come in */}
              {submittedCount > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <div style={{ color: C.dimmed, fontSize: 11, marginBottom: 8 }}>Submitted so far</div>
                  {playerEntries.filter(([, p]) => !!p.hints?.[roundKey]).map(([key, p]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                      <span style={{ color: key === myKey ? C.accent : C.muted, fontSize: 13 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.hints[roundKey]}</span>
                    </div>
                  ))}
                  {/* Pending */}
                  {playerEntries.filter(([, p]) => !p.hints?.[roundKey]).map(([key, p]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', opacity: 0.4 }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>{p.name}</span>
                      <span style={{ color: C.dimmed, fontSize: 13 }}>typing…</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scoreboard */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Scores</div>
              {[...playerEntries].sort(([, a], [, b]) => b.score - a.score).map(([key, p]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: key === myKey ? C.accent : C.muted, fontSize: 13 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                  <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{p.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={leaveRoom} style={{ ...btnBase, width: '100%', padding: '10px', fontSize: 13, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
              Leave Room
            </button>
          </div>
        </div>
      );
    }

    // ── Guessing ──

    if (room.phase === 'guessing') {
      const voteSubmitted = me.vote !== ''; // derived from Firebase
      if (!voteSubmitted) {
        return (
          <div style={wrap}>
            <div style={{ maxWidth: 420, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🕵️</div>
                <div style={{ color: C.accent, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Who is the Spy?</div>
                <p style={{ color: C.muted, fontSize: 13 }}>Based on the hints, who gave themselves away?</p>
              </div>

              {/* Full hints summary */}
              <div style={{ background: C.panel, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>All Hints</div>
                {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map(r => (
                  <div key={r} style={{ marginBottom: 12 }}>
                    <div style={{ color: C.dimmed, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Round {r}</div>
                    {playerEntries.map(([key, p]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}33` }}>
                        <span style={{ color: key === myKey ? C.accent : C.muted, fontSize: 12 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{p.hints?.[String(r)] || '—'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {playerEntries.filter(([key]) => key !== myKey).map(([key, p]) => (
                  <button key={key} onClick={() => setMyVote(p.name)}
                    style={{ ...btnBase, width: '100%', padding: '16px 18px', textAlign: 'left', fontSize: 15, background: myVote === p.name ? `${C.danger}22` : C.panel, color: myVote === p.name ? '#fca5a5' : C.text, border: `2px solid ${myVote === p.name ? C.danger : C.border}`, borderRadius: 10 }}>
                    <span style={{ marginRight: 10 }}>{myVote === p.name ? '🎯' : '👤'}</span>{p.name}
                  </button>
                ))}
              </div>

              <button onClick={submitVote} disabled={!myVote}
                style={{ ...btnBase, width: '100%', padding: '14px', fontSize: 15, background: myVote ? `linear-gradient(135deg,${C.danger},#b91c1c)` : C.panel, color: myVote ? 'white' : C.dimmed, opacity: myVote ? 1 : 0.6, marginBottom: 10 }}>
                Submit Vote
              </button>
              <button onClick={leaveRoom} style={{ ...btnBase, width: '100%', padding: '10px', fontSize: 13, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
                Leave Room
              </button>
            </div>
          </div>
        );
      }

      // Waiting for others
      const votedCount = playerEntries.filter(([, p]) => p.vote !== '').length;
      const pendingCount = playerEntries.length - votedCount;
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: C.accent, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Vote submitted!</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{votedCount} / {playerEntries.length} voted</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {playerEntries.map(([key, p]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderRadius: 8, background: C.panel, border: `1px solid ${C.border}` }}>
                  <span style={{ color: key === myKey ? C.accent : C.text, fontSize: 13 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                  <span style={{ fontSize: 14 }}>{p.vote !== '' ? '✅' : '⏳'}</span>
                </div>
              ))}
            </div>
            {isHost && pendingCount > 0 && (
              <button onClick={forceResult}
                style={{ ...btnBase, width: '100%', padding: '11px', fontSize: 13, background: '#7f1d1d', color: '#fca5a5', border: `1px solid ${C.danger}`, marginBottom: 10 }}>
                Force Results ({pendingCount} hasn't voted)
              </button>
            )}
            <button onClick={leaveRoom} style={{ ...btnBase, width: '100%', padding: '10px', fontSize: 13, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
              Leave Room
            </button>
          </div>
        </div>
      );
    }

    // ── Result ──

    if (room.phase === 'result') {
      const spyEntry = playerEntries.find(([, p]) => p.isSpy);
      const spyName  = spyEntry?.[1].name ?? '';
      const nonSpies = playerEntries.filter(([, p]) => !p.isSpy);
      const allCorrect = nonSpies.length > 0 && nonSpies.every(([, p]) => p.vote === spyName);
      const sorted = [...playerEntries].sort(([, a], [, b]) => b.score - a.score);

      return (
        <div style={wrap}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>

            {/* Banner */}
            <div style={{
              background: allCorrect ? 'linear-gradient(135deg,#042f2e,#0d4a3d)' : 'linear-gradient(135deg,#450a0a,#7f1d1d)',
              border: `2px solid ${allCorrect ? C.accent : C.danger}`,
              borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20,
              boxShadow: `0 0 40px ${allCorrect ? C.accent : C.danger}33`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{allCorrect ? '🎉' : '🕵️'}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: allCorrect ? C.accent : C.danger, marginBottom: 8 }}>
                {allCorrect ? 'Players Win!' : 'Spy Wins!'}
              </div>
              <div style={{ color: allCorrect ? '#6ee7b7' : '#fca5a5', fontSize: 14 }}>
                {allCorrect ? 'Everyone correctly identified the spy!' : 'Someone guessed wrong — spy escapes!'}
              </div>
            </div>

            {/* Word reveal */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>The Words</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'linear-gradient(135deg,#042f2e,#0d4a3d)', borderRadius: 10, padding: 14, textAlign: 'center', border: `1px solid ${C.accent}44` }}>
                  <div style={{ color: C.dimmed, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Players' Word</div>
                  <div style={{ color: C.accent, fontSize: 22, fontWeight: 900 }}>{room.wordPair.normal}</div>
                </div>
                <div style={{ flex: 1, background: 'linear-gradient(135deg,#450a0a,#7f1d1d)', borderRadius: 10, padding: 14, textAlign: 'center', border: `1px solid ${C.danger}44` }}>
                  <div style={{ color: C.dimmed, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Spy's Word</div>
                  <div style={{ color: C.danger, fontSize: 22, fontWeight: 900 }}>{room.wordPair.spy}</div>
                </div>
              </div>
            </div>

            {/* Votes */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Votes</div>
              {playerEntries.map(([key, p]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{p.isSpy ? '🕵️' : '👤'}</span>
                    <span style={{ color: p.isSpy ? C.danger : (key === myKey ? C.accent : C.text), fontSize: 13, fontWeight: p.isSpy ? 700 : 400 }}>
                      {p.name}{p.isSpy ? ' (SPY)' : ''}{key === myKey ? ' (you)' : ''}
                    </span>
                  </div>
                  {!p.isSpy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: C.muted, fontSize: 12 }}>→ {p.vote || '—'}</span>
                      <span style={{ fontSize: 14 }}>{p.vote === spyName ? '✅' : '❌'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Leaderboard</div>
              {sorted.map(([key, p], rank) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 6, background: C.bg, border: `1px solid ${key === myKey ? C.accent + '44' : C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: rank === 0 ? C.gold : C.dimmed, fontSize: 14, fontWeight: 700, width: 24 }}>
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                    </span>
                    <span style={{ color: key === myKey ? C.accent : C.text, fontSize: 14 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                  </div>
                  <span style={{ color: C.gold, fontSize: 15, fontWeight: 800 }}>{p.score} pts</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button onClick={playAgain}
                style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', marginBottom: 10 }}>
                Next Round →
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 14, background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 10 }}>
                Waiting for host to start next round…
              </div>
            )}
            <button onClick={leaveRoom}
              style={{ ...btnBase, width: '100%', padding: '11px', fontSize: 14, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
              Leave Room
            </button>
          </div>
        </div>
      );
    }
  }

  return <div style={wrap}><div style={{ color: C.muted }}>Loading…</div></div>;
}
