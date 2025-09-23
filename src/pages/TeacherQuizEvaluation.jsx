import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function TeacherQuizEvaluation() {
  const { user, isSupabaseConfigured } = useAuth();
  const [params] = useSearchParams();
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;
  const textColor = '#fff';

  useEffect(() => {
    let cancelled = false;
    const qid = params.get('quiz');
    const load = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: qz, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending:false }).limit(200);
          if (error) throw error;
          if (!cancelled) setQuizzes(qz||[]);
          const selectedQuiz = (qz||[]).find(q=>q.id===qid) || (qz||[])[0] || null;
          if (!cancelled) setSelected(selectedQuiz);
          if (selectedQuiz) {
            const { data: att, error: aerr } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', selectedQuiz.id).order('created_at', { ascending:false }).limit(500);
            if (aerr) throw aerr;
            if (!cancelled) setAttempts(att||[]);
          } else {
            if (!cancelled) setAttempts([]);
          }
        } else {
          const key = school ? `quizzes_${school}` : 'quizzes_demo';
          const qz = JSON.parse(localStorage.getItem(key) || '[]');
          if (!cancelled) setQuizzes(qz);
          const selectedQuiz = qz.find(q=>q.id===qid) || qz[0] || null;
          if (!cancelled) setSelected(selectedQuiz);
          if (selectedQuiz) {
            const att = JSON.parse(localStorage.getItem(`quiz_attempts_${selectedQuiz.id}`) || '[]');
            if (!cancelled) setAttempts(att);
          } else {
            if (!cancelled) setAttempts([]);
          }
        }
      } catch (e) {
        console.warn('Load evaluation error:', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
  }, [isSupabaseConfigured]);

  const onSelectQuiz = async (id) => {
    setSelected(quizzes.find(q=>q.id===id) || null);
    if (!id) { setAttempts([]); return; }
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', id).order('created_at', { ascending:false }).limit(500);
      setAttempts(data||[]);
    } else {
      setAttempts(JSON.parse(localStorage.getItem(`quiz_attempts_${id}`)||'[]'));
    }
  };

  return (
    <div style={{ position:'relative', minHeight:'100vh' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:
        'radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.24), transparent),\
         radial-gradient(1000px 600px at 110% 0%, rgba(244,114,182,0.22), transparent),\
         radial-gradient(900px 700px at 50% 120%, rgba(124,58,237,0.16), transparent),\
         #0b1220' }} />
      <div className="container" style={{ padding: 16, position:'relative', zIndex:1, color:textColor }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
          <h2 style={{ color:textColor, margin:0, textShadow:'0 1px 10px rgba(124,58,237,0.35)' }}>Quiz Evaluation</h2>
          <span style={{ fontSize:12, color:textColor, opacity:0.9 }}>Quizzes: <strong>{quizzes.length}</strong></span>
        </div>

        <div className="glass-card" style={{ padding: 14, color:textColor, marginBottom: 12, border:'1px solid rgba(124,58,237,0.24)', background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))' }}>
          <label style={{ fontSize:13, opacity:0.9, marginRight:8, color:textColor }}>Select quiz:</label>
          <select
            value={selected?.id || ''}
            onChange={e=>onSelectQuiz(e.target.value)}
            className="student-input"
            style={{ maxWidth: 560, background:'rgba(2,6,23,0.45)', border:'1px solid rgba(255,255,255,0.18)', color:textColor, borderRadius:12, padding:'10px 12px' }}
          >
            <option value="">-- Choose a quiz --</option>
            {quizzes.map(q=> (
              <option key={q.id} value={q.id}>{q.title} • {new Date(q.start_time).toLocaleString()} → {new Date(q.end_time).toLocaleString()}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="glass-card" style={{ padding: 14, color:textColor, border:'1px solid rgba(124,58,237,0.24)', background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:textColor }}>{selected.title}</div>
                <div style={{ opacity:0.9, fontSize:13, color:textColor }}>{selected.description || '—'}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ padding:'4px 8px', borderRadius:999, background:'rgba(124,58,237,0.22)', border:'1px solid rgba(167,139,250,0.35)', fontSize:12, color:textColor }}>
                  Starts: {new Date(selected.start_time).toLocaleString()}
                </span>
                <span style={{ padding:'4px 8px', borderRadius:999, background:'rgba(244,114,182,0.18)', border:'1px solid rgba(251,207,232,0.35)', fontSize:12, color:textColor }}>
                  Ends: {new Date(selected.end_time).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card" style={{ padding: 0, color:textColor, marginTop: 12, overflow:'hidden', borderRadius:14, border:'1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontWeight: 700, padding:'10px 12px', background:'rgba(2,6,23,0.55)', borderBottom:'1px solid rgba(255,255,255,0.12)', color:textColor }}>
            Attempts ({attempts.length})
          </div>
          {loading ? (
            <div style={{ padding:12, color:textColor }}>Loading...</div>
          ) : attempts.length === 0 ? (
            <div style={{ padding:12, color:textColor }}>No attempts yet.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ minWidth: 720, width:'100%', borderCollapse:'separate', borderSpacing:0 }}>
                <thead>
                  <tr style={{ background:'rgba(15,13,35,0.65)' }}>
                    <th style={{ textAlign:'left', padding:'10px 12px', fontWeight:600, color:textColor }}>Student</th>
                    <th style={{ textAlign:'left', padding:'10px 12px', fontWeight:600, color:textColor }}>Score</th>
                    <th style={{ textAlign:'left', padding:'10px 12px', fontWeight:600, color:textColor }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a,i)=> (
                    <tr key={i} style={{ background: i % 2 ? 'rgba(2,6,23,0.35)' : 'rgba(2,6,23,0.20)' }}>
                      <td style={{ padding:'10px 12px', color:textColor }}>{a.student_name || a.user_id}</td>
                      <td style={{ padding:'10px 12px', color:textColor }}>
                        <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(34,197,94,0.2)', border:'1px solid rgba(34,197,94,0.35)' }}>{a.score}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:textColor }}>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
