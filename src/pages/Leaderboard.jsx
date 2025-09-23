import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import './Leaderboard.css';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

function calcXP(progress) {
  if (!progress) return 0;
  const subjects = ['science', 'technology', 'mathematics'];
  let games = 0, quizzes = 0;
  subjects.forEach(s => {
    games += progress[s]?.games || 0;
    quizzes += progress[s]?.quizzes || 0;
  });
  const streak = progress.streak || 0;
  // Simple XP model: games 15, quizzes 25, streak 20 each
  return games * 15 + quizzes * 25 + streak * 20;
}

export default function Leaderboard() {
  const { user, isSupabaseConfigured } = useAuth();
  const [selectedClass, setSelectedClass] = useState('All');
  const [allPlayers, setAllPlayers] = useState([]);

  // Load leaderboard from Supabase if configured; otherwise from localStorage
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // Try to read optional 'school' column if present; gracefully fallback if not
          let data = null; let error = null;
          try {
            const resp = await supabase
              .from('leaderboard')
              .select('user_id, display_name, class, xp, school')
              .order('xp', { ascending: false })
              .limit(50);
            data = resp.data; error = resp.error;
            if (error && /column .*school/i.test(String(error.message))) {
              // Fallback without school if column missing
              const resp2 = await supabase
                .from('leaderboard')
                .select('user_id, display_name, class, xp')
                .order('xp', { ascending: false })
                .limit(50);
              data = resp2.data; error = resp2.error;
            }
          } catch (e) {
            error = e;
          }
          if (error) throw error;
          if (!cancelled) {
            setAllPlayers(
              (data || []).map(r => ({
                user_id: r.user_id,
                name: r.display_name || 'Player',
                xp: Number(r.xp) || 0,
                klass: r.class ? String(r.class) : 'Unknown',
                school: (r.school || null)
              }))
            );
          }
        } else {
          const data = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('student_progress_') || key.startsWith('student_progress:'))) {
              const userKey = key
                .replace('student_progress_', '')
                .replace('student_progress:', '');
              const p = readJSON(key, {});
              const xp = calcXP(p);
              const userInfo = readJSON(`user_${userKey}`, null);
              const name = userInfo?.displayName || userInfo?.name || userKey.split('@')[0];
              const klass = userInfo?.class || userInfo?.grade || p?.class || 'Unknown';
              const school = userInfo?.school || userInfo?.user_metadata?.school || null;
              data.push({ name, xp, klass, key: userKey, school });
            }
          }
          if (data.length === 0) {
            data.push(
              { name: 'Alice Quantum', xp: 960, klass: '8', key: 'demo_alice@example.com', school: 'ABC' },
              { name: 'Bob Vector', xp: 840, klass: '8', key: 'demo_bob@example.com', school: 'XYZ' },
              { name: 'Carol Matrix', xp: 780, klass: '7', key: 'demo_carol@example.com', school: 'ABC' }
            );
          }
          if (!cancelled) setAllPlayers(data.sort((a, b) => b.xp - a.xp));
        }
      } catch (e) {
        console.warn('Leaderboard load error:', e.message);
      }
    };

    load();

    // realtime updates from Supabase
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('leaderboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => load())
        .subscribe();
    }
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured]);

  const classes = useMemo(() => {
    const set = new Set(['All']);
    allPlayers.forEach(p => set.add(String(p.klass)));
    return Array.from(set);
  }, [allPlayers]);

  const players = useMemo(() => {
    const filtered = selectedClass === 'All' ? allPlayers : allPlayers.filter(p => String(p.klass) === String(selectedClass));
    // Ensure sorted desc by xp
    return filtered.slice().sort((a, b) => b.xp - a.xp).slice(0, 50);
  }, [allPlayers, selectedClass]);

  return (
    <div className="lb-page">
      <div className="lb-container">
        <motion.h1 className="lb-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Leaderboard</motion.h1>
        <div className="lb-controls">
          <label className="lb-filter-label">Class</label>
          <select className="lb-filter" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <motion.div className="lb-board glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="lb-header">
            <span>#</span>
            <span>Player</span>
            <span>School</span>
            <span>XP</span>
          </div>
          <div className="lb-rows">
            {players.length === 0 ? (
              <div className="lb-empty">No players yet. Start learning to climb the ranks!</div>
            ) : players.map((p, i) => (
              <div className={`lb-row ${i < 3 ? 'top' : ''} ${(user && p.user_id && user.id === p.user_id) ? 'me' : ''}`} key={p.user_id || `${p.name}-${i}`}>
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">
                  {/* Top 3 badges: 1st -> 24.png, 2nd -> 25.png, 3rd -> 26.png */}
                  {i === 0 && <img className="lb-badge" src="/badge/24.png" alt="1st place badge" />}
                  {i === 1 && <img className="lb-badge" src="/badge/25.png" alt="2nd place badge" />}
                  {i === 2 && <img className="lb-badge" src="/badge/26.png" alt="3rd place badge" />}
                  {p.name} {p.klass && p.klass !== 'Unknown' ? <span className="lb-class">(Class {p.klass})</span> : null}
                </span>
                <span className="lb-school">{p.school ? String(p.school).toUpperCase() : '—'}</span>
                <span className="lb-xp">{p.xp}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}