import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function TeacherProgress() {
  const { user, isSupabaseConfigured } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const school = user?.user_metadata?.school || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; }
  })() || null;

  const role = user?.user_metadata?.role || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.role; } catch { return null; }
  })() || 'student';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!school) { setRows([]); setLoading(false); return; }
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('leaderboard')
            .select('user_id, display_name, class, xp, school, updated_at')
            .eq('school', school)
            .order('xp', { ascending: false })
            .limit(200);
          if (error) throw error;
          if (!cancelled) setRows(data || []);
        } else {
          // Local fallback: gather all local students and filter by school from stored user_* info
          const list = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('student_progress_') || key.startsWith('student_progress:'))) {
              const userKey = key.replace('student_progress_', '').replace('student_progress:', '');
              try {
                const info = JSON.parse(localStorage.getItem(`user_${userKey}`) || 'null');
                const schoolLS = info?.school || info?.user_metadata?.school || null;
                if (schoolLS && String(schoolLS).toLowerCase() === String(school).toLowerCase()) {
                  const prog = JSON.parse(localStorage.getItem(key) || '{}');
                  const xp = calcXP(prog);
                  const display_name = info?.displayName || info?.name || userKey.split('@')[0];
                  const klass = info?.class || prog?.class || 'Unknown';
                  list.push({ user_id: userKey, display_name, class: klass, xp, school: schoolLS, updated_at: null });
                }
              } catch {}
            }
          }
          list.sort((a,b)=>b.xp-a.xp);
          if (!cancelled) setRows(list);
        }
      } catch (e) {
        console.warn('TeacherProgress load error:', e.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    // Live updates when Supabase enabled
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('teacher-progress')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => load())
        .subscribe();
    }
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [isSupabaseConfigured, school]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter(r =>
      String(r.display_name || '').toLowerCase().includes(q) ||
      String(r.class || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (role !== 'teacher') {
    return (
      <div className="lb-page" style={{ padding: 24 }}>
        <div className="lb-container">
          <h2>Student Progress</h2>
          <div className="lb-empty">Only teachers can view student progress.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lb-page" style={{ padding: 24 }}>
      <div className="lb-container">
        <motion.h1 className="lb-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          Student Progress {school ? `- ${String(school).toUpperCase()}` : ''}
        </motion.h1>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom: 12 }}>
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search by name or class..."
            style={{ minWidth: 240, padding:'10px 12px', borderRadius: 12, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(2,6,23,0.35)', color:'#fff' }}
          />
        </div>

        <motion.div className="lb-board glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="lb-header">
            <span>#</span>
            <span>Student</span>
            <span>Class</span>
            <span>XP</span>
          </div>
          <div className="lb-rows">
            {loading ? (
              <div className="lb-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="lb-empty">No students found for this school.</div>
            ) : filtered.map((r, i) => (
              <div className="lb-row" key={r.user_id || `${r.display_name}-${i}`}>
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">{r.display_name}</span>
                <span className="lb-class">{r.class || '—'}</span>
                <span className="lb-xp">{r.xp}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
