import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

const STORAGE_KEY = 'student_progress';
const storageKeyFor = (user) => `${STORAGE_KEY}:${user?.id || 'anon'}`;

export function ProgressProvider({ children }) {
  // Synchronous boot from anon cache to avoid a visible 0-reset before hydrate completes
  const bootProgress = (() => {
    try {
      const raw = localStorage.getItem(storageKeyFor(null)); // ':anon'
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();
  const [studentProgress, setStudentProgress] = useState(bootProgress);
  const [loading, setLoading] = useState(true);
  const [firstHydrate, setFirstHydrate] = useState(true);
  const { user, isSupabaseConfigured } = useAuth();

  // Compute XP similar to Leaderboard page
  const calcXP = (progress) => {
    if (!progress) return 0;
    const subjects = ['science', 'technology', 'mathematics'];
    let games = 0, quizzes = 0;
    subjects.forEach(s => {
      games += progress[s]?.games || 0;
      quizzes += progress[s]?.quizzes || 0;
    });
    const streak = progress.streak || 0;
    return games * 15 + quizzes * 25 + streak * 20;
  };

  // Initial hydrate: prefer Supabase when configured and user exists; otherwise fallback to per-user localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isSupabaseConfigured && user) {
          const { data, error } = await supabase
            .from('student_progress')
            .select('data')
            .eq('user_id', user.id)
            .single();
          if (!cancelled) {
            if (error && error.code !== 'PGRST116') {
              console.warn('Failed to load progress from DB:', error.message);
            }
            if (data?.data) {
              // Merge policy: prefer the richer of DB vs local caches to prevent resets
              const dbData = data.data || {};
              const userKey = storageKeyFor(user);
              const anonKey = storageKeyFor(null);
              let localBest = null;
              try { const rawUser = localStorage.getItem(userKey); if (rawUser) localBest = JSON.parse(rawUser); } catch {}
              if (!localBest) { try { const rawAnon = localStorage.getItem(anonKey); if (rawAnon) localBest = JSON.parse(rawAnon); } catch {} }
              const dbXP = calcXP(dbData);
              const localXP = calcXP(localBest);
              const best = (localXP > dbXP) ? (localBest || dbData) : dbData;
              setStudentProgress(best);
              // refresh local cache as backup
              try { localStorage.setItem(userKey, JSON.stringify(best)); } catch {}
              try { localStorage.setItem(anonKey, JSON.stringify(best)); } catch {}
              // If local was richer than DB, upsert back to DB to avoid future downgrades
              if (localXP > dbXP) {
                try {
                  await supabase.from('student_progress').upsert({ user_id: user.id, data: best }, { onConflict: 'user_id' });
                } catch {}
              }
            } else {
              // no row yet on DB; try local cache before starting empty
              const userKey = storageKeyFor(user);
              const anonKey = storageKeyFor(null);
              const rawUser = localStorage.getItem(userKey);
              const rawAnon = localStorage.getItem(anonKey);
              if (rawUser) {
                try { setStudentProgress(JSON.parse(rawUser)); }
                catch { setStudentProgress({}); }
              } else if (rawAnon) {
                // Migrate anonymous progress to this logged-in user
                try {
                  const anonData = JSON.parse(rawAnon);
                  setStudentProgress(anonData);
                  // Save under user key immediately and clear anon to avoid future resets
                  try { localStorage.setItem(userKey, JSON.stringify(anonData)); } catch {}
                  try { localStorage.removeItem(anonKey); } catch {}
                  // Also create the DB row now so future hydrates pull from DB
                  try { await supabase.from('student_progress').upsert({ user_id: user.id, data: anonData }, { onConflict: 'user_id' }); } catch {}
                } catch {
                  setStudentProgress({});
                }
              } else {
                setStudentProgress({});
              }
            }
          }
        } else {
          // Demo/local mode (or auth not ready yet): prefer anon cache synchronously
          const anonRaw = localStorage.getItem(storageKeyFor(null));
          if (anonRaw) {
            try { setStudentProgress(JSON.parse(anonRaw)); } catch { /* noop */ }
          } else {
            const raw = localStorage.getItem(storageKeyFor(user));
            if (raw) setStudentProgress(JSON.parse(raw));
          }
        }
      } catch (e) {
        console.warn('Progress hydrate error:', e.message);
        // fallback to local cache on any unexpected error
        try {
          const raw = localStorage.getItem(storageKeyFor(user));
          if (raw) setStudentProgress(JSON.parse(raw));
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
        setFirstHydrate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSupabaseConfigured, user]);

  // Persist changes: Supabase when available, otherwise per-user localStorage
  useEffect(() => {
    if (firstHydrate) return; // avoid writing back immediately on first load
    (async () => {
      try {
        if (isSupabaseConfigured && user) {
          const payload = { user_id: user.id, data: studentProgress };
          const { error } = await supabase
            .from('student_progress')
            .upsert(payload, { onConflict: 'user_id' });
          if (error) console.warn('Failed to persist progress to DB:', error.message);

          // Always keep a local backup so UI survives refresh even if DB fails
          try { localStorage.setItem(storageKeyFor(user), JSON.stringify(studentProgress)); } catch {}

          // Also upsert into leaderboard with computed XP
          try {
            const xp = calcXP(studentProgress);
            const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
            const klass = studentProgress?.class || studentProgress?.grade || user.user_metadata?.class || null;
            const school = user.user_metadata?.school || null;
            const lbPayload = {
              user_id: user.id,
              display_name: displayName,
              class: klass,
              xp,
              updated_at: new Date().toISOString(),
              school,
            };
            let lbErr = null;
            try {
              const resp = await supabase
                .from('leaderboard')
                .upsert(lbPayload, { onConflict: 'user_id' });
              lbErr = resp.error || null;
            } catch (e) {
              lbErr = e;
            }
            // Graceful fallback if 'school' column is missing: retry without it
            if (lbErr && /column .*school/i.test(String(lbErr.message))) {
              const { school: _omit, ...fallbackPayload } = lbPayload;
              try {
                const resp2 = await supabase
                  .from('leaderboard')
                  .upsert(fallbackPayload, { onConflict: 'user_id' });
                if (resp2.error) lbErr = resp2.error; else lbErr = null;
              } catch (e2) {
                lbErr = e2;
              }
            }
            if (lbErr) console.warn('Failed to upsert leaderboard XP:', lbErr.message);
          } catch (e) {
            console.warn('Leaderboard upsert error:', e.message);
          }
        } else {
          // Local/demo mode: persist to localStorage
          try { localStorage.setItem(storageKeyFor(user), JSON.stringify(studentProgress)); } catch {}
        }
      } catch (e) {
        console.warn('Persist progress error:', e.message);
        // On any persist error, ensure local backup so we don't lose state
        try { localStorage.setItem(storageKeyFor(user), JSON.stringify(studentProgress)); } catch {}
      }
    })();
  }, [studentProgress, isSupabaseConfigured, user, firstHydrate]);

  const updateProgress = (subjectKey, partial) => {
    setStudentProgress((prev) => {
      const curr = prev[subjectKey] || { games: 0, quizzes: 0 };
      const next = { ...prev, [subjectKey]: { ...curr, ...partial } };
      // Synchronous local backup to survive immediate refresh/navigation
      try {
        const key = storageKeyFor(user);
        localStorage.setItem(key, JSON.stringify(next));
        // Also mirror to anon cache so early-hydrate (before auth) sees latest
        const anonKey = storageKeyFor(null);
        localStorage.setItem(anonKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Update root-level meta fields like totalXP, streak, lastClaimDate, dailyGoalXP
  const setMeta = (partial) => {
    setStudentProgress((prev) => ({ ...prev, ...partial }));
  };

  // Badge helper expected by Home.jsx: returns { name, color, icon }
  const getBadge = (progress) => {
    const games = Math.max(0, Math.min(100, Number(progress?.games ?? 0)));
    const quizzes = Math.max(0, Math.min(100, Number(progress?.quizzes ?? 0)));
    const avg = (games + quizzes) / 2;
    if (avg >= 80) return { name: 'Gold', color: '#fbbf24', icon: '🏆' };
    if (avg >= 60) return { name: 'Silver', color: '#9ca3af', icon: '🥈' };
    if (avg >= 30) return { name: 'Bronze', color: '#b45309', icon: '🥉' };
    return { name: 'Starter', color: '#a78bfa', icon: '🎓' };
  };

  // Determine if the current user appears new (no subject progress yet)
  const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;
  const isNewUser = isEmpty(studentProgress) || ['science','technology','mathematics']
    .every(k => !studentProgress[k] || ((studentProgress[k].games||0)+(studentProgress[k].quizzes||0)) === 0);

  const value = useMemo(() => ({ 
    studentProgress, 
    updateProgress, 
    setMeta,
    loading, 
    getBadge, 
    isNewUser,
  }), [studentProgress, loading, isNewUser]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
