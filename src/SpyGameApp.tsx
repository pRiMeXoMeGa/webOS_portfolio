import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, set, get, onValue, update, push } from 'firebase/database';
import { db } from './firebase';

// ── Data ─────────────────────────────────────────────────────────────────────

interface LocationData {
  name: string;
  emoji: string;
  roles: string[];
}

const LOCATIONS: LocationData[] = [
  { name: 'Hospital',       emoji: '🏥', roles: ['Doctor', 'Nurse', 'Patient', 'Surgeon', 'Receptionist', 'Janitor'] },
  { name: 'Beach',          emoji: '🏖️', roles: ['Lifeguard', 'Swimmer', 'Tourist', 'Ice Cream Vendor', 'Surfer', 'Volleyball Player'] },
  { name: 'Casino',         emoji: '🎰', roles: ['Dealer', 'Pit Boss', 'Security Guard', 'High Roller', 'Bartender', 'Gambler'] },
  { name: 'Space Station',  emoji: '🚀', roles: ['Commander', 'Pilot', 'Scientist', 'Engineer', 'Medic', 'Tourist'] },
  { name: 'Restaurant',     emoji: '🍽️', roles: ['Chef', 'Waiter', 'Manager', 'Customer', 'Sous Chef', 'Host'] },
  { name: 'Airport',        emoji: '✈️', roles: ['Pilot', 'Flight Attendant', 'Security Officer', 'Passenger', 'Baggage Handler', 'Customs Agent'] },
  { name: 'School',         emoji: '🏫', roles: ['Teacher', 'Student', 'Principal', 'Janitor', 'Librarian', 'Counselor'] },
  { name: 'Bank',           emoji: '🏦', roles: ['Bank Teller', 'Manager', 'Security Guard', 'Customer', 'Loan Officer', 'Accountant'] },
  { name: 'Movie Studio',   emoji: '🎬', roles: ['Director', 'Actor', 'Camera Operator', 'Screenwriter', 'Make-up Artist', 'Producer'] },
  { name: 'Circus',         emoji: '🎪', roles: ['Clown', 'Acrobat', 'Lion Tamer', 'Ringmaster', 'Ticket Seller', 'Audience Member'] },
  { name: 'Police Station', emoji: '👮', roles: ['Police Chief', 'Detective', 'Officer', 'Suspect', 'Informant', 'Dispatcher'] },
  { name: 'Submarine',      emoji: '🌊', roles: ['Captain', 'Navigator', 'Engineer', 'Cook', 'Sonar Operator', 'Medic'] },
  { name: 'Cruise Ship',    emoji: '🚢', roles: ['Captain', 'Chef', 'Bartender', 'Passenger', 'Entertainer', 'Crew Member'] },
  { name: 'Art Museum',     emoji: '🎨', roles: ['Curator', 'Tour Guide', 'Security Guard', 'Artist', 'Visitor', 'Restorer'] },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type GameMode = 'menu' | 'local' | 'remote';
type LocalPhase = 'setup' | 'dealing' | 'playing' | 'voting' | 'result';
type RemotePhase = 'lobby' | 'playing' | 'voting' | 'result';

interface RemotePlayer {
  name: string;
  role: string;
  isSpy: boolean;
  cardSeen: boolean;
  vote: string;
  isHost: boolean;
}

interface RoomData {
  phase: RemotePhase;
  timerMinutes: number;
  timerEndsAt: number;
  location: LocationData;
  players: Record<string, RemotePlayer>;
}

interface LocalPlayer {
  name: string;
  role: string;
  isSpy: boolean;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatTime(s: number) {
  const safe = Math.max(0, s);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SpyGameApp() {
  const [mode, setMode] = useState<GameMode>('menu');

  if (mode === 'menu')   return <ModeMenu onSelect={setMode} />;
  if (mode === 'local')  return <LocalGame onBack={() => setMode('menu')} />;
  if (mode === 'remote') return <RemoteGame onBack={() => setMode('menu')} />;
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE SELECTION MENU
// ══════════════════════════════════════════════════════════════════════════════

function ModeMenu({ onSelect }: { onSelect: (m: GameMode) => void }) {
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <h2 style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginBottom: 4 }}>🕵️ Guess the Spy</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
          One player is secretly the spy. Find them before they blend in!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => onSelect('local')}
            style={{
              ...btnBase, padding: '20px 24px', textAlign: 'left', fontSize: 15,
              background: C.panel, color: C.text, border: `1px solid ${C.border}`,
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Pass & Play</div>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 400 }}>
              Everyone shares one device. Pass the screen to view your card.
            </div>
          </button>

          <button
            onClick={() => onSelect('remote')}
            style={{
              ...btnBase, padding: '20px 24px', textAlign: 'left', fontSize: 15,
              background: `linear-gradient(135deg, #042f2e, #0d4a3d)`,
              color: C.text, border: `1px solid ${C.accent}55`, borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
            <div style={{ fontWeight: 700, marginBottom: 4, color: C.accent }}>Play Online</div>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 400 }}>
              Play remotely! Each player joins with a room code on their own device.
            </div>
          </button>
        </div>

        {/* How to Play */}
        <div style={{ marginTop: 28, background: C.panel, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>How to Play</div>
          {[
            { icon: '🃏', text: 'Each player secretly views their card showing a location and role.' },
            { icon: '🕵️', text: 'One player is the SPY — they see no location and must stay hidden.' },
            { icon: '💬', text: 'Take turns asking each other questions about the location. Be suspicious!' },
            { icon: '🗳️', text: 'After discussion, everyone votes for who they think is the spy.' },
            { icon: '🏆', text: 'Players win if they catch the spy. The spy wins by avoiding detection or correctly guessing the location.' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{step.icon}</span>
              <span style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL (PASS & PLAY) GAME — original logic
// ══════════════════════════════════════════════════════════════════════════════

function LocalGame({ onBack }: { onBack: () => void }) {
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3']);
  const [timerMinutes, setTimerMinutes] = useState(8);
  const [phase, setPhase]           = useState<LocalPhase>('setup');
  const [players, setPlayers]       = useState<LocalPlayer[]>([]);
  const [location, setLocation]     = useState<LocationData | null>(null);
  const [spyIndex, setSpyIndex]     = useState(0);
  const [dealingIdx, setDealingIdx] = useState(0);
  const [cardVisible, setCardVisible] = useState(false);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [votingIdx, setVotingIdx]   = useState(0);
  const [currentVote, setCurrentVote] = useState('');
  const [votes, setVotes]           = useState<string[]>([]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('voting'); setVotingIdx(0); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  function startGame() {
    const valid = playerNames.map(n => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    const loc  = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const spy  = Math.floor(Math.random() * valid.length);
    const shuffledRoles = [...loc.roles].sort(() => Math.random() - 0.5);
    let roleIdx = 0;
    const newPlayers: LocalPlayer[] = valid.map((name, i) =>
      i === spy
        ? { name, role: 'SPY', isSpy: true }
        : { name, role: shuffledRoles[roleIdx++ % shuffledRoles.length], isSpy: false }
    );
    setPlayers(newPlayers); setLocation(loc); setSpyIndex(spy);
    setDealingIdx(0); setCardVisible(false);
    setTimeLeft(timerMinutes * 60);
    setVotes(new Array(valid.length).fill(''));
    setVotingIdx(0); setCurrentVote('');
    setPhase('dealing');
  }

  function handleNextDeal() {
    if (dealingIdx >= players.length - 1) { setPhase('playing'); }
    else { setDealingIdx(i => i + 1); setCardVisible(false); }
  }

  function submitVote() {
    if (!currentVote) return;
    const newVotes = [...votes];
    newVotes[votingIdx] = currentVote;
    setVotes(newVotes); setCurrentVote('');
    if (votingIdx >= players.length - 1) setPhase('result');
    else setVotingIdx(i => i + 1);
  }

  // ─ Setup ─
  if (phase === 'setup') return (
    <div style={wrap}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={onBack} style={{ ...btnBase, background: C.panel, color: C.muted, padding: '6px 12px' }}>← Back</button>
          <h2 style={{ color: C.accent, fontSize: 22, fontWeight: 800, margin: 0 }}>📱 Pass & Play</h2>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Players ({playerNames.length}/8)
          </div>
          {playerNames.map((name, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={name}
                onChange={e => setPlayerNames(ns => ns.map((n, j) => j === i ? e.target.value : n))}
                placeholder={`Player ${i + 1}`}
                style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 12px', fontSize: 14, outline: 'none' }}
              />
              {playerNames.length > 2 && (
                <button onClick={() => setPlayerNames(ns => ns.filter((_, j) => j !== i))}
                  style={{ ...btnBase, background: C.panel, color: C.danger, padding: '8px 14px' }}>✕</button>
              )}
            </div>
          ))}
          {playerNames.length < 8 && (
            <button onClick={() => setPlayerNames(ns => [...ns, `Player ${ns.length + 1}`])}
              style={{ ...btnBase, background: C.panel, color: C.accent, border: `1px dashed ${C.accent}55`, width: '100%', marginTop: 4 }}>
              + Add Player
            </button>
          )}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Discussion Timer</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[5, 8, 10, 15].map(m => (
              <button key={m} onClick={() => setTimerMinutes(m)} style={{
                ...btnBase, flex: 1,
                background: timerMinutes === m ? C.accent : C.panel,
                color:      timerMinutes === m ? '#0f172a' : C.muted,
                border:     `1px solid ${timerMinutes === m ? C.accent : C.border}`,
              }}>{m}m</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1}
              max={60}
              value={timerMinutes}
              onChange={e => {
                const v = Math.max(1, Math.min(60, Number(e.target.value)));
                if (!isNaN(v)) setTimerMinutes(v);
              }}
              style={{ width: 70, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontSize: 14, outline: 'none', textAlign: 'center' }}
            />
            <span style={{ color: C.muted, fontSize: 13 }}>minutes (custom)</span>
          </div>
        </div>

        <button onClick={startGame} disabled={playerNames.filter(n => n.trim()).length < 2}
          style={{ ...btnBase, width: '100%', fontSize: 16, padding: '14px 20px', background: 'linear-gradient(135deg, #00d4aa, #0066ff)', color: 'white', opacity: playerNames.filter(n => n.trim()).length < 2 ? 0.5 : 1 }}>
          Start Game
        </button>

        <div style={{ marginTop: 24, background: C.panel, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>How to Play</div>
          {['1. Each player secretly views their card — location + role.','2. One player is the SPY and sees no location.','3. Ask each other questions about the location.','4. Vote for who you think is the spy.','5. Spy wins by avoiding detection or guessing the location.']
            .map((s, i) => <div key={i} style={{ color: C.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>{s}</div>)}
        </div>
      </div>
    </div>
  );

  // ─ Dealing ─
  if (phase === 'dealing') {
    const player = players[dealingIdx];
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Card {dealingIdx + 1} of {players.length}
          </div>
          <h3 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
            Pass the screen to <span style={{ color: C.accent }}>{player.name}</span>
          </h3>
          {!cardVisible ? (
            <button onClick={() => setCardVisible(true)}
              style={{ ...btnBase, width: '100%', padding: '60px 20px', fontSize: 15, background: 'linear-gradient(135deg, #1e293b, #334155)', color: C.muted, border: `2px dashed ${C.border}`, borderRadius: 16 }}>
              👆 Tap to reveal your secret card
            </button>
          ) : (
            <>
              <div style={{ background: player.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)', border: `2px solid ${player.isSpy ? C.danger : C.accent}`, borderRadius: 16, padding: '32px 24px', marginBottom: 20, boxShadow: `0 0 32px ${player.isSpy ? C.danger : C.accent}33` }}>
                {player.isSpy ? (
                  <>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>🕵️</div>
                    <div style={{ color: C.danger, fontSize: 22, fontWeight: 800, marginBottom: 10 }}>YOU ARE THE SPY</div>
                    <div style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.7 }}>You don't know the location. Listen carefully and try to deduce it!</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{location?.emoji}</div>
                    <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
                    <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginBottom: 18 }}>{location?.name}</div>
                    <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Your Role</div>
                    <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{player.role}</div>
                  </>
                )}
              </div>
              <button onClick={handleNextDeal}
                style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white' }}>
                {dealingIdx >= players.length - 1 ? "All cards dealt — Start Discussion" : "I've memorised my card →"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─ Playing ─
  if (phase === 'playing') {
    const pct = timeLeft / (timerMinutes * 60);
    const isUrgent = timeLeft < 60;
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Discussion Time</div>
            <div style={{ fontSize: 64, fontWeight: 900, fontFamily: 'monospace', color: isUrgent ? C.danger : C.accent, textShadow: `0 0 24px ${isUrgent ? C.danger : C.accent}88` }}>{formatTime(timeLeft)}</div>
            <div style={{ background: C.panel, borderRadius: 6, height: 6, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6, width: `${pct * 100}%`, background: isUrgent ? C.danger : C.accent, transition: 'width 1s linear, background 0.3s' }} />
            </div>
          </div>
          <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Players</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {players.map((p, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              ))}
            </div>
          </div>
          <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 24, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Possible Locations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LOCATIONS.map(l => <span key={l.name} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: C.muted }}>{l.emoji} {l.name}</span>)}
            </div>
          </div>
          <button onClick={() => { setPhase('voting'); setVotingIdx(0); }}
            style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: '#7f1d1d', color: '#fca5a5', border: `1px solid ${C.danger}` }}>
            End Discussion &amp; Vote
          </button>
        </div>
      </div>
    );
  }

  // ─ Voting ─
  if (phase === 'voting') {
    const voter = players[votingIdx];
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Vote {votingIdx + 1} of {players.length}</div>
          <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}><span style={{ color: C.accent }}>{voter.name}</span>, who is the spy?</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Your vote is secret until all votes are cast.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {players.filter((_, i) => i !== votingIdx).map((p, i) => (
              <button key={i} onClick={() => setCurrentVote(p.name)}
                style={{ ...btnBase, width: '100%', padding: '14px 16px', textAlign: 'left', fontSize: 15, background: currentVote === p.name ? `${C.danger}22` : C.panel, color: currentVote === p.name ? '#fca5a5' : C.text, border: `2px solid ${currentVote === p.name ? C.danger : C.border}` }}>
                {currentVote === p.name ? '🎯 ' : '    '}{p.name}
              </button>
            ))}
          </div>
          <button onClick={submitVote} disabled={!currentVote}
            style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: currentVote ? `linear-gradient(135deg,${C.danger},#b91c1c)` : C.panel, color: currentVote ? 'white' : C.dimmed, opacity: currentVote ? 1 : 0.6 }}>
            {votingIdx >= players.length - 1 ? 'Reveal the Spy!' : 'Submit Vote →'}
          </button>
        </div>
      </div>
    );
  }

  // ─ Result ─
  if (phase === 'result') {
    const tally: Record<string, number> = {};
    votes.forEach(v => { if (v) tally[v] = (tally[v] ?? 0) + 1; });
    const maxCount = Math.max(0, ...Object.values(tally));
    const topVoted = Object.entries(tally).filter(([, c]) => c === maxCount).map(([n]) => n);
    const spyName  = players[spyIndex]?.name ?? '';
    const spyCaught = topVoted.length === 1 && topVoted[0] === spyName;
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: spyCaught ? 'linear-gradient(135deg,#042f2e,#0d4a3d)' : 'linear-gradient(135deg,#450a0a,#7f1d1d)', border: `2px solid ${spyCaught ? C.accent : C.danger}`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20, boxShadow: `0 0 40px ${spyCaught ? C.accent : C.danger}33` }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{spyCaught ? '🎉' : '🕵️'}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: spyCaught ? C.accent : C.danger, marginBottom: 8 }}>{spyCaught ? 'Players Win!' : 'Spy Wins!'}</div>
            <div style={{ color: spyCaught ? '#6ee7b7' : '#fca5a5', fontSize: 14 }}>{spyCaught ? 'The spy was correctly identified!' : topVoted.length > 1 ? 'The vote was tied — the spy escaped!' : 'The wrong person was accused — the spy escapes!'}</div>
          </div>
          <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>The Spy Was…</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 36 }}>🕵️</div>
              <div>
                <div style={{ color: C.danger, fontSize: 20, fontWeight: 800 }}>{spyName}</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>The location was <span style={{ color: C.accent }}>{location?.emoji} {location?.name}</span></div>
              </div>
            </div>
          </div>
          <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Vote Tally</div>
            {players.map((p, i) => {
              const count = tally[p.name] ?? 0;
              const isTop = topVoted.includes(p.name);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 6, background: C.bg, border: `1px solid ${isTop ? (p.isSpy ? C.accent : C.danger) : C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{p.isSpy ? '🕵️' : '👤'}</span>
                    <span style={{ color: p.isSpy ? C.danger : C.text, fontSize: 14, fontWeight: p.isSpy ? 700 : 400 }}>
                      {p.name}<span style={{ color: C.dimmed, fontWeight: 400, fontSize: 12 }}>{p.isSpy ? ' (SPY)' : ` — ${p.role}`}</span>
                    </span>
                  </div>
                  <span style={{ background: '#0f172a', borderRadius: 6, padding: '2px 10px', color: isTop ? '#fbbf24' : C.dimmed, fontSize: 13, fontWeight: 700 }}>{count} vote{count !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBack} style={{ ...btnBase, flex: 1, background: C.panel, color: C.text, border: `1px solid ${C.border}`, padding: '12px' }}>Back to Menu</button>
            <button onClick={startGame} style={{ ...btnBase, flex: 1, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', padding: '12px' }}>Play Again →</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// REMOTE GAME — Firebase Realtime Database
// ══════════════════════════════════════════════════════════════════════════════

function RemoteGame({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<'entry' | 'lobby' | 'game'>('entry');

  // Entry state
  const [nameInput, setNameInput]   = useState('');
  const [codeInput, setCodeInput]   = useState('');
  const [joining, setJoining]       = useState(false);
  const [error, setError]           = useState('');

  // Session state — also persisted to sessionStorage to survive remounts
  const [roomCode, setRoomCode]     = useState('');
  const [myKey, setMyKey]           = useState('');

  // Live room data
  const [room, setRoom]             = useState<RoomData | null>(null);

  // Derive isHost from Firebase so it survives page refresh
  const isHost = !!(room && myKey && room.players[myKey]?.isHost);

  // Local timer (derived from timerEndsAt)
  const [timeLeft, setTimeLeft]     = useState(0);

  // Vote state (local until submitted)
  const [myVote, setMyVote]         = useState('');
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  // Guard against repeated Firebase writes when timer hits 0
  const votingTransitioned = useRef(false);

  // ── Restore session on remount (survives page refresh / component remount) ──

  useEffect(() => {
    const savedRoom = sessionStorage.getItem('spy_roomCode');
    if (!savedRoom) return;
    const savedKey  = sessionStorage.getItem(`spy_myKey_${savedRoom}`);
    if (!savedKey) return;
    // Verify the player record still exists in Firebase
    get(ref(db, `rooms/${savedRoom}/players/${savedKey}`)).then(snap => {
      if (snap.exists()) {
        setRoomCode(savedRoom);
        setMyKey(savedKey);
      } else {
        sessionStorage.removeItem('spy_roomCode');
        sessionStorage.removeItem(`spy_myKey_${savedRoom}`);
      }
    });
  }, []);

  // ── Subscribe to room ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsub = onValue(roomRef, snap => {
      if (!snap.exists()) { setRoom(null); return; }
      setRoom(snap.val() as RoomData);
    });
    return () => unsub();
  }, [roomCode]);

  // Navigate based on phase
  useEffect(() => {
    if (!room) return;
    if (room.phase === 'lobby') setScreen('lobby');
    if (room.phase === 'playing' || room.phase === 'voting' || room.phase === 'result') setScreen('game');
  }, [room?.phase]);

  // Sync timer from Firebase timerEndsAt
  useEffect(() => {
    if (!room || room.phase !== 'playing') return;
    const tick = setInterval(() => {
      const left = Math.round((room.timerEndsAt - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) clearInterval(tick);
    }, 500);
    return () => clearInterval(tick);
  }, [room?.phase, room?.timerEndsAt]);

  // Host transitions to voting when timer expires — guarded to fire only once
  useEffect(() => {
    if (room?.phase !== 'playing') { votingTransitioned.current = false; return; }
    if (!isHost || !roomCode) return;
    if (timeLeft <= 0 && !votingTransitioned.current) {
      votingTransitioned.current = true;
      update(ref(db, `rooms/${roomCode}`), { phase: 'voting' });
    }
  }, [isHost, roomCode, room?.phase, timeLeft]);

  // Auto-transition voting → result when all players have voted
  // Any client can trigger this (idempotent write) — handles race conditions
  // and disconnected players: host sees "Force Results" button as fallback
  useEffect(() => {
    if (!room || !roomCode || room.phase !== 'voting') return;
    const entries = Object.entries(room.players);
    if (entries.length === 0) return;
    if (entries.every(([, p]) => p.vote !== '')) {
      update(ref(db, `rooms/${roomCode}`), { phase: 'result' });
    }
  }, [room, roomCode]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) { setError('Enter your name'); return; }
    setJoining(true); setError('');
    try {
      const code = genRoomCode();
      const playerRef = ref(db, `rooms/${code}/players`);
      const newRef = push(playerRef);
      const key = newRef.key!;

      await set(ref(db, `rooms/${code}`), {
        phase: 'lobby',
        timerMinutes: 8,
        timerEndsAt: 0,
        location: LOCATIONS[0],
        players: {
          [key]: { name, role: '', isSpy: false, cardSeen: false, vote: '', isHost: true },
        },
      });

      sessionStorage.setItem('spy_roomCode', code);
      sessionStorage.setItem(`spy_myKey_${code}`, key);
      setRoomCode(code);
      setMyKey(key);
      setScreen('lobby');
    } catch {
      setError('Failed to create room. Check your connection.');
    } finally {
      setJoining(false);
    }
  }, [nameInput]);

  const joinRoom = useCallback(async () => {
    const name = nameInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!name) { setError('Enter your name'); return; }
    if (code.length < 4) { setError('Enter a valid room code'); return; }
    setJoining(true); setError('');
    try {
      const snap = await get(ref(db, `rooms/${code}`));
      if (!snap.exists()) { setError('Room not found'); setJoining(false); return; }
      const data = snap.val() as RoomData;
      if (data.phase !== 'lobby') { setError('Game already in progress'); setJoining(false); return; }

      const playerRef = ref(db, `rooms/${code}/players`);
      const newRef = push(playerRef);
      const key = newRef.key!;
      await set(newRef, { name, role: '', isSpy: false, cardSeen: false, vote: '', isHost: false });

      sessionStorage.setItem('spy_roomCode', code);
      sessionStorage.setItem(`spy_myKey_${code}`, key);
      setRoomCode(code);
      setMyKey(key);
      setScreen('lobby');
    } catch {
      setError('Failed to join room. Check your connection.');
    } finally {
      setJoining(false);
    }
  }, [nameInput, codeInput]);

  const startGame = useCallback(async () => {
    if (!room || !roomCode) return;
    const playerEntries = Object.entries(room.players);
    if (playerEntries.length < 2) return;

    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const spyIdx = Math.floor(Math.random() * playerEntries.length);
    const shuffledRoles = [...loc.roles].sort(() => Math.random() - 0.5);
    let roleIdx = 0;

    const updatedPlayers: Record<string, RemotePlayer> = {};
    playerEntries.forEach(([key, p], i) => {
      updatedPlayers[key] = {
        ...p,
        isSpy: i === spyIdx,
        role: i === spyIdx ? 'SPY' : (shuffledRoles[roleIdx++ % shuffledRoles.length]),
        cardSeen: false,
        vote: '',
      };
    });

    const timerEndsAt = Date.now() + room.timerMinutes * 60 * 1000;
    await update(ref(db, `rooms/${roomCode}`), {
      phase: 'playing',
      location: loc,
      timerEndsAt,
      players: updatedPlayers,
    });
    setMyVote('');
    setVoteSubmitted(false);
  }, [room, roomCode]);

  const markCardSeen = useCallback(async () => {
    if (!roomCode || !myKey) return;
    await update(ref(db, `rooms/${roomCode}/players/${myKey}`), { cardSeen: true });
  }, [roomCode, myKey]);

  const submitVote = useCallback(async () => {
    if (!myVote || !roomCode || !myKey) return;
    await update(ref(db, `rooms/${roomCode}/players/${myKey}`), { vote: myVote });
    setVoteSubmitted(true);
    // The auto-transition useEffect watches all votes and triggers result phase
  }, [myVote, roomCode, myKey]);

  const endDiscussion = useCallback(async () => {
    if (!roomCode || !isHost) return;
    await update(ref(db, `rooms/${roomCode}`), { phase: 'voting' });
  }, [roomCode, isHost]);

  const updateTimer = useCallback(async (mins: number) => {
    if (!roomCode || !isHost) return;
    await update(ref(db, `rooms/${roomCode}`), { timerMinutes: mins });
  }, [roomCode, isHost]);

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('spy_roomCode');
    if (roomCode) sessionStorage.removeItem(`spy_myKey_${roomCode}`);
    onBack();
  }, [roomCode, onBack]);

  const resetToLobby = useCallback(async () => {
    if (!roomCode || !room) return;
    const playerReset: Record<string, unknown> = { phase: 'lobby', timerEndsAt: 0 };
    Object.keys(room.players).forEach(key => {
      playerReset[`players/${key}/cardSeen`] = false;
      playerReset[`players/${key}/vote`]     = '';
      playerReset[`players/${key}/role`]     = '';
      playerReset[`players/${key}/isSpy`]    = false;
    });
    await update(ref(db, `rooms/${roomCode}`), playerReset);
    setMyVote('');
    setVoteSubmitted(false);
  }, [roomCode, room]);

  // ── Entry screen ───────────────────────────────────────────────────────────

  if (screen === 'entry') return (
    <div style={wrap}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={leaveRoom} style={{ ...btnBase, background: C.panel, color: C.muted, padding: '6px 12px' }}>← Back</button>
          <h2 style={{ color: C.accent, fontSize: 22, fontWeight: 800, margin: 0 }}>🌐 Play Online</h2>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your Name</div>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Enter your name"
            style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button onClick={createRoom} disabled={joining}
          style={{ ...btnBase, width: '100%', fontSize: 15, padding: '14px', marginBottom: 12, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', opacity: joining ? 0.6 : 1 }}>
          {joining ? 'Creating…' : '+ Create Room'}
        </button>

        <div style={{ textAlign: 'center', color: C.dimmed, fontSize: 12, marginBottom: 12 }}>— or join an existing room —</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Room Code"
            maxLength={6}
            style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 15, outline: 'none', letterSpacing: 3, textTransform: 'uppercase' }}
          />
          <button onClick={joinRoom} disabled={joining}
            style={{ ...btnBase, background: C.panel, color: C.accent, border: `1px solid ${C.accent}55`, padding: '10px 20px', opacity: joining ? 0.6 : 1 }}>
            {joining ? '…' : 'Join'}
          </button>
        </div>

        {/* How to Play */}
        <div style={{ marginTop: 24, background: C.panel, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>How to Play (Online)</div>
          {[
            { icon: '🏠', text: 'Host creates a room and shares the 6-letter code with friends.' },
            { icon: '📲', text: 'Each player joins on their own device using the room code.' },
            { icon: '🃏', text: 'Host starts the game — everyone taps to secretly reveal their card.' },
            { icon: '🕵️', text: 'One player is the SPY and must blend in without knowing the location.' },
            { icon: '💬', text: 'Discuss over a call (Discord, etc.) and ask each other questions.' },
            { icon: '🗳️', text: 'Everyone votes privately on their own device. Results reveal when all votes are in.' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{step.icon}</span>
              <span style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Lobby ──────────────────────────────────────────────────────────────────

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
                  <span style={{ fontSize: 18 }}>{p.isHost ? '👑' : '👤'}</span>
                  <span style={{ color: key === myKey ? C.accent : C.text, fontSize: 14, fontWeight: key === myKey ? 700 : 400 }}>
                    {p.name} {key === myKey ? '(you)' : ''}
                  </span>
                </div>
                {p.isHost && <span style={{ fontSize: 10, color: C.dimmed, textTransform: 'uppercase', letterSpacing: 1 }}>Host</span>}
              </div>
            ))}
            {players.length < 2 && (
              <div style={{ color: C.dimmed, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Waiting for at least 2 players…</div>
            )}
          </div>

          {isHost && (
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Discussion Timer</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[5, 8, 10, 15].map(m => (
                  <button key={m} onClick={() => updateTimer(m)} style={{
                    ...btnBase, flex: 1,
                    background: room.timerMinutes === m ? C.accent : C.bg,
                    color:      room.timerMinutes === m ? '#0f172a' : C.muted,
                    border:     `1px solid ${room.timerMinutes === m ? C.accent : C.border}`,
                  }}>{m}m</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={room.timerMinutes}
                  onChange={e => {
                    const v = Math.max(1, Math.min(60, Number(e.target.value)));
                    if (!isNaN(v)) updateTimer(v);
                  }}
                  style={{ width: 70, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontSize: 14, outline: 'none', textAlign: 'center' }}
                />
                <span style={{ color: C.muted, fontSize: 13 }}>minutes (custom)</span>
              </div>
            </div>
          )}

          {isHost ? (
            <button onClick={startGame} disabled={players.length < 2}
              style={{ ...btnBase, width: '100%', fontSize: 16, padding: '14px', background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', opacity: players.length < 2 ? 0.5 : 1 }}>
              Start Game ({players.length} players)
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: 16, background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>
              Waiting for the host to start the game…
            </div>
          )}

          <button onClick={leaveRoom}
            style={{ ...btnBase, width: '100%', marginTop: 10, padding: '11px', fontSize: 14, background: C.panel, color: C.muted, border: `1px solid ${C.border}` }}>
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // ── Game (playing → voting → result) ─────────────────────────────────────

  if (screen === 'game' && room) {
    const playerEntries = Object.entries(room.players);
    const me = room.players[myKey];
    if (!me) return <div style={wrap}><div style={{ color: C.muted }}>Loading…</div></div>;

    // ─ Card reveal ─
    if (room.phase === 'playing' && !me.cardSeen) {
      const seenCount = playerEntries.filter(([, p]) => p.cardSeen).length;
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Your Secret Card</div>
            <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              <span style={{ color: C.accent }}>{me.name}</span>, tap to reveal
            </h3>
            <button onClick={markCardSeen}
              style={{ ...btnBase, width: '100%', padding: '60px 20px', fontSize: 15, background: 'linear-gradient(135deg,#1e293b,#334155)', color: C.muted, border: `2px dashed ${C.border}`, borderRadius: 16 }}>
              👆 Tap to reveal your secret card
            </button>
            <div style={{ marginTop: 16, color: C.dimmed, fontSize: 12 }}>
              {seenCount} / {playerEntries.length} players ready
            </div>
          </div>
        </div>
      );
    }

    // ─ Show card briefly after tapping, while waiting for others ─
    if (room.phase === 'playing' && me.cardSeen && !playerEntries.every(([, p]) => p.cardSeen)) {
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: me.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)', border: `2px solid ${me.isSpy ? C.danger : C.accent}`, borderRadius: 16, padding: '32px 24px', marginBottom: 20, boxShadow: `0 0 32px ${me.isSpy ? C.danger : C.accent}33` }}>
              {me.isSpy ? (
                <>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🕵️</div>
                  <div style={{ color: C.danger, fontSize: 22, fontWeight: 800, marginBottom: 10 }}>YOU ARE THE SPY</div>
                  <div style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.7 }}>You don't know the location. Listen carefully and try to deduce it!</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{room.location?.emoji}</div>
                  <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
                  <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginBottom: 18 }}>{room.location?.name}</div>
                  <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Your Role</div>
                  <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{me.role}</div>
                </>
              )}
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              Waiting for others… ({playerEntries.filter(([, p]) => p.cardSeen).length}/{playerEntries.length} ready)
            </div>
          </div>
        </div>
      );
    }

    // ─ Discussion phase ─
    if (room.phase === 'playing') {
      const isUrgent = timeLeft < 60;
      const pct = Math.max(0, timeLeft) / (room.timerMinutes * 60);
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {/* Role reminder */}
            <div style={{ background: me.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, border: `1px solid ${me.isSpy ? C.danger : C.accent}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{me.isSpy ? '🕵️' : room.location?.emoji}</span>
              <div>
                <div style={{ color: me.isSpy ? C.danger : C.accent, fontSize: 13, fontWeight: 700 }}>{me.isSpy ? 'You are the SPY' : room.location?.name}</div>
                {!me.isSpy && <div style={{ color: C.muted, fontSize: 11 }}>Your role: {me.role}</div>}
              </div>
            </div>

            {/* Timer */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Discussion Time</div>
              <div style={{ fontSize: 56, fontWeight: 900, fontFamily: 'monospace', color: isUrgent ? C.danger : C.accent, textShadow: `0 0 24px ${isUrgent ? C.danger : C.accent}88` }}>{formatTime(timeLeft)}</div>
              <div style={{ background: C.panel, borderRadius: 6, height: 6, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, width: `${pct * 100}%`, background: isUrgent ? C.danger : C.accent, transition: 'width 1s linear, background 0.3s' }} />
              </div>
            </div>

            {/* Players */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Players</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {playerEntries.map(([key, p]) => (
                  <div key={key} style={{ background: C.bg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${key === myKey ? C.accent + '44' : C.border}`, color: key === myKey ? C.accent : C.text, fontSize: 13, fontWeight: key === myKey ? 600 : 400 }}>
                    {p.name}{key === myKey ? ' (you)' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Possible Locations</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LOCATIONS.map(l => (
                  <span key={l.name} style={{ background: C.bg, border: `1px solid ${l.name === room.location?.name && !me.isSpy ? C.accent : C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: l.name === room.location?.name && !me.isSpy ? C.accent : C.muted }}>
                    {l.emoji} {l.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Host: end discussion early */}
            {isHost && (
              <button onClick={endDiscussion}
                style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: '#7f1d1d', color: '#fca5a5', border: `1px solid ${C.danger}` }}>
                End Discussion &amp; Vote
              </button>
            )}
            {!isHost && (
              <div style={{ textAlign: 'center', color: C.dimmed, fontSize: 12, padding: '12px', background: C.panel, borderRadius: 10, border: `1px solid ${C.border}` }}>
                Discuss over a call — voting starts when the host ends discussion or time runs out.
              </div>
            )}
          </div>
        </div>
      );
    }

    // ─ Voting phase ─
    if (room.phase === 'voting') {
      if (!voteSubmitted) {
        return (
          <div style={wrap}>
            <div style={{ maxWidth: 420, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🗳️</div>
                <div style={{ color: C.accent, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Time to Vote!</div>
                <p style={{ color: C.muted, fontSize: 13 }}>Who do you think is the spy? Your vote is private — results reveal when everyone has voted.</p>
              </div>

              {/* Role reminder (small) */}
              <div style={{ background: me.isSpy ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#042f2e,#0d4a3d)', borderRadius: 8, padding: '8px 14px', marginBottom: 20, border: `1px solid ${me.isSpy ? C.danger : C.accent}44`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{me.isSpy ? '🕵️' : room.location?.emoji}</span>
                <span style={{ color: me.isSpy ? C.danger : C.accent, fontSize: 12, fontWeight: 600 }}>
                  {me.isSpy ? 'You are the SPY' : `${room.location?.name} — ${me.role}`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {playerEntries.filter(([key]) => key !== myKey).map(([key, p]) => (
                  <button key={key} onClick={() => setMyVote(p.name)}
                    style={{ ...btnBase, width: '100%', padding: '16px 18px', textAlign: 'left', fontSize: 15, background: myVote === p.name ? `${C.danger}22` : C.panel, color: myVote === p.name ? '#fca5a5' : C.text, border: `2px solid ${myVote === p.name ? C.danger : C.border}`, borderRadius: 10 }}>
                    <span style={{ marginRight: 10 }}>{myVote === p.name ? '🎯' : '👤'}</span>
                    {p.name}
                  </button>
                ))}
              </div>

              <button onClick={submitVote} disabled={!myVote}
                style={{ ...btnBase, width: '100%', padding: '14px', fontSize: 15, background: myVote ? `linear-gradient(135deg,${C.danger},#b91c1c)` : C.panel, color: myVote ? 'white' : C.dimmed, opacity: myVote ? 1 : 0.6 }}>
                Submit Vote
              </button>
            </div>
          </div>
        );
      }

      // Waiting for others to vote
      const votedCount = playerEntries.filter(([, p]) => p.vote !== '').length;
      const pendingCount = playerEntries.length - votedCount;
      return (
        <div style={wrap}>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: C.accent, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Vote submitted!</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              {votedCount} / {playerEntries.length} players have voted
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {playerEntries.map(([key, p]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: 8, background: C.panel, border: `1px solid ${C.border}` }}>
                  <span style={{ color: key === myKey ? C.accent : C.text, fontSize: 13 }}>{p.name}{key === myKey ? ' (you)' : ''}</span>
                  <span style={{ fontSize: 14 }}>{p.vote !== '' ? '✅' : '⏳'}</span>
                </div>
              ))}
            </div>
            {isHost && pendingCount > 0 && (
              <button
                onClick={() => update(ref(db, `rooms/${roomCode}`), { phase: 'result' })}
                style={{ ...btnBase, width: '100%', padding: '11px', fontSize: 13, background: '#7f1d1d', color: '#fca5a5', border: `1px solid ${C.danger}` }}
              >
                Force Results ({pendingCount} player{pendingCount !== 1 ? 's' : ''} hasn't voted)
              </button>
            )}
          </div>
        </div>
      );
    }

    // ─ Result phase ─
    if (room.phase === 'result') {
      const tally: Record<string, number> = {};
      playerEntries.forEach(([, p]) => { if (p.vote) tally[p.vote] = (tally[p.vote] ?? 0) + 1; });
      const maxCount  = Math.max(0, ...Object.values(tally));
      const topVoted  = Object.entries(tally).filter(([, c]) => c === maxCount).map(([n]) => n);
      const spyEntry  = playerEntries.find(([, p]) => p.isSpy);
      const spyName   = spyEntry?.[1].name ?? '';
      const spyCaught = topVoted.length === 1 && topVoted[0] === spyName;

      return (
        <div style={wrap}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ background: spyCaught ? 'linear-gradient(135deg,#042f2e,#0d4a3d)' : 'linear-gradient(135deg,#450a0a,#7f1d1d)', border: `2px solid ${spyCaught ? C.accent : C.danger}`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20, boxShadow: `0 0 40px ${spyCaught ? C.accent : C.danger}33` }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{spyCaught ? '🎉' : '🕵️'}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: spyCaught ? C.accent : C.danger, marginBottom: 8 }}>{spyCaught ? 'Players Win!' : 'Spy Wins!'}</div>
              <div style={{ color: spyCaught ? '#6ee7b7' : '#fca5a5', fontSize: 14 }}>{spyCaught ? 'The spy was correctly identified!' : topVoted.length > 1 ? 'The vote was tied — the spy escaped!' : 'The wrong person was accused — the spy escapes!'}</div>
            </div>

            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>The Spy Was…</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 36 }}>🕵️</div>
                <div>
                  <div style={{ color: C.danger, fontSize: 20, fontWeight: 800 }}>{spyName}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>The location was <span style={{ color: C.accent }}>{room.location?.emoji} {room.location?.name}</span></div>
                </div>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.dimmed, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Vote Tally</div>
              {playerEntries.map(([key, p]) => {
                const count = tally[p.name] ?? 0;
                const isTop = topVoted.includes(p.name);
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 6, background: C.bg, border: `1px solid ${isTop ? (p.isSpy ? C.accent : C.danger) : C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{p.isSpy ? '🕵️' : '👤'}</span>
                      <span style={{ color: p.isSpy ? C.danger : C.text, fontSize: 14, fontWeight: p.isSpy ? 700 : 400 }}>
                        {p.name}{key === myKey ? ' (you)' : ''}
                        <span style={{ color: C.dimmed, fontWeight: 400, fontSize: 12 }}>{p.isSpy ? ' (SPY)' : ` — ${p.role}`}</span>
                      </span>
                    </div>
                    <span style={{ background: '#0f172a', borderRadius: 6, padding: '2px 10px', color: isTop ? '#fbbf24' : C.dimmed, fontSize: 13, fontWeight: 700 }}>{count} vote{count !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>

            {isHost ? (
              <button onClick={resetToLobby}
                style={{ ...btnBase, width: '100%', padding: '13px', fontSize: 15, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', color: 'white', marginBottom: 10 }}>
                Play Again →
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
