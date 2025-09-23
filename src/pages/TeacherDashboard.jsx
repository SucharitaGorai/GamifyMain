import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { loadLocalProgress } from "../stores/localProgress";
import "./TeacherDashboard.css";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [remoteProgress, setRemoteProgress] = useState([]);
  const [local, setLocal] = useState({});
  const [lastSync, setLastSync] = useState("");
  const school = user?.user_metadata?.school || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; }
  })() || null;

  useEffect(() => {
    setLocal(loadLocalProgress());

    // Fetch remote quiz attempts for this teacher's school (via quizzes table)
    const loadRemote = async () => {
      if (!supabase) return;
      try {
        // 1) Get quizzes for the teacher's school (or all if no school)
        let quizQuery = supabase.from('quizzes').select('id, title, school').order('created_at', { ascending: false }).limit(1000);
        const { data: quizzes, error: qErr } = await quizQuery;
        if (qErr) throw qErr;
        const filteredQuizzes = Array.isArray(quizzes)
          ? (school ? quizzes.filter(q => String(q.school||'').trim().toLowerCase() === String(school||'').trim().toLowerCase()) : quizzes)
          : [];
        const quizMap = new Map(filteredQuizzes.map(q => [q.id, q]));
        const quizIds = filteredQuizzes.map(q => q.id);

        // 2) Fetch attempts only for those quizzes
        let attempts = [];
        if (quizIds.length) {
          const { data: atts, error: aErr } = await supabase
            .from('quiz_attempts')
            .select('*')
            .in('quiz_id', quizIds)
            .order('created_at', { ascending: false })
            .limit(500);
          if (aErr) throw aErr;
          attempts = atts || [];
        }

        // 3) Map quiz attempts for table rendering
        const rowsFromAttempts = attempts.map(a => ({
          student_id: a.student_name || a.user_id,
          topic: quizMap.get(a.quiz_id)?.title || '(quiz)',
          score: a.score,
          created_at: a.created_at,
        }));

        // 4) Also load generic progress rows (e.g., chapter completions)
        let rowsFromProgress = [];
        try {
          const { data: prog, error: pErr } = await supabase
            .from('progress')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (pErr) throw pErr;
          rowsFromProgress = (prog || []).map(p => ({
            student_id: p.student_id,
            topic: p.topic || '(chapter)',
            score: p.score ?? 0,
            created_at: p.created_at,
          }));
        } catch (e) {
          // table may not exist in some deployments; ignore gracefully
        }

        const rows = [...rowsFromAttempts, ...rowsFromProgress]
          .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 500);
        setRemoteProgress(rows);
        setLastSync(new Date().toLocaleString());
      } catch (e) {
        console.warn('Supabase fetch error', e?.message || e);
      }
    };

    loadRemote();

    // Realtime updates on quiz_attempts
    let channel;
    if (supabase) {
      channel = supabase
        .channel('dashboard-quiz-attempts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, () => loadRemote())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'progress' }, () => loadRemote())
        .subscribe();
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [school]);

  const localEntries = Object.keys(local || {}).length;
  const remoteEntries = (remoteProgress || []).length;
  const supaConfigured = !!supabase;

  // Try to normalize different saved shapes into a list of entries
  // Normalized entry: { topic, score, timestamp }
  function normalizeProgress(progress) {
    if (!progress) return [];
    // Case 1: already an array of entries
    if (Array.isArray(progress)) {
      return progress.map((e) => ({
        topic: e.topic ?? e.chapter ?? e.title ?? "(unknown)",
        score: e.score ?? e.points ?? e.xp ?? 0,
        timestamp: e.timestamp ?? e.created_at ?? e.date ?? null,
      }));
    }
    // Case 2: object with entries array
    if (Array.isArray(progress.entries)) {
      return progress.entries.map((e) => ({
        topic: e.topic ?? e.chapter ?? e.title ?? "(unknown)",
        score: e.score ?? e.points ?? e.xp ?? 0,
        timestamp: e.timestamp ?? e.created_at ?? e.date ?? null,
      }));
    }
    // Case 3: topics keyed object, e.g. { "Math: Squares": { score, timestamp } }
    if (typeof progress === 'object') {
      return Object.entries(progress).map(([k, v]) => ({
        topic: k,
        score: v ? (v.score ?? v.points ?? v.xp ?? 0) : 0,
        timestamp: v ? (v.timestamp ?? v.created_at ?? v.date ?? null) : null,
      }));
    }
    return [];
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-title">
          <h1><span className="gradient-text">Teacher Dashboard</span></h1>
          <p className="dash-subtitle">Track student progress, jump into lessons, and manage your class — all in one place.</p>
          {school && (
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 999,
                background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(167,139,250,0.35)', color: '#fff'
              }}>
                🏫 School: {String(school).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="dash-actions">
          <Link to="/lesson/math" className="dash-btn primary">📐 Math</Link>
          <Link to="/lesson/science" className="dash-btn">🔬 Science</Link>
          <Link to="/profile" className="dash-btn ghost">👤 Profile</Link>
          <Link to="/teacher/progress" className="dash-btn">📊 Student Progress</Link>
        </div>
      </header>

      {/* Stats */}
      <section className="dash-grid">
        <div className="stat-card">
          <div className="stat-label">Local entries</div>
          <div className="stat-value">{localEntries}</div>
          <div className="stat-foot">Device cache</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remote entries</div>
          <div className="stat-value">{remoteEntries}</div>
          <div className="stat-foot">Supabase {supaConfigured ? (lastSync ? `• synced ${lastSync}` : "• connected") : "• not configured"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Theme</div>
          <div className="stat-value">Neon</div>
          <div className="stat-foot">Optimized UI</div>
        </div>
      </section>

      {/* Quick links */}
      <section className="quick-grid">
        <Link to="/lesson/math" className="quick-card">
          <div className="qc-emoji">🧮</div>
          <div>
            <div className="qc-title">Math Lessons</div>
            <div className="qc-sub">Numbers, Algebra, Geometry</div>
          </div>
        </Link>
        <Link to="/lesson/science" className="quick-card">
          <div className="qc-emoji">🧪</div>
          <div>
            <div className="qc-title">Science Lessons</div>
            <div className="qc-sub">Physics, Chemistry, Biology</div>
          </div>
        </Link>
        <Link to="/profile" className="quick-card">
          <div className="qc-emoji">👨‍🏫</div>
          <div>
            <div className="qc-title">Your Profile</div>
            <div className="qc-sub">Manage account & progress</div>
          </div>
        </Link>
      </section>

      {/* Remote progress */}
      <section className="card-glass">
        <h3 className="section-title">Remote progress (Supabase)</h3>
        {supaConfigured ? (
          remoteProgress.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {remoteProgress.map((r, i) => (
                    <tr key={i}>
                      <td>{r.student_id}</td>
                      <td>{r.topic}</td>
                      <td>{r.score}</td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No remote progress found</p>
          )
        ) : (
          <p className="muted">Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env</p>
        )}
      </section>
    </div>
  );
}
