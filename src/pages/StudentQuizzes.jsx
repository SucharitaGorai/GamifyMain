import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function StudentQuizzes() {
  const { user, isSupabaseConfigured } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;
  const textColor = '#fff';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          // Select same-school only is enforced by RLS, but we filter by time here for UI
          const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .order('start_time', { ascending: true })
            .limit(200);
          if (error) throw error;
          if (!cancelled) setQuizzes(data || []);
        } else {
          const key = school ? `quizzes_${school}` : 'quizzes_demo';
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cancelled) setQuizzes(data || []);
          } catch {
            if (!cancelled) setQuizzes([]);
          }
        }
      } catch (e) {
        console.warn('StudentQuizzes load error:', e.message);
        if (!cancelled) setQuizzes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isSupabaseConfigured, school]);

  const now = Date.now();
  const partitioned = useMemo(() => {
    const live = [];
    const upcoming = [];
    const ended = [];
    for (const q of quizzes) {
      const s = new Date(q.start_time).getTime();
      const e = new Date(q.end_time).getTime();
      if (now >= s && now <= e) live.push(q);
      else if (now < s) upcoming.push(q);
      else ended.push(q);
    }
    return { live, upcoming, ended };
  }, [quizzes, now]);

  return (
    <div style={{ position:'relative', minHeight:'100vh' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:
        'radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.24), transparent),\
         radial-gradient(1000px 600px at 110% 0%, rgba(244,114,182,0.22), transparent),\
         radial-gradient(900px 700px at 50% 120%, rgba(124,58,237,0.16), transparent),\
         #0b1220' }} />
      <div className="container" style={{ padding: 16, position:'relative', zIndex:1, color: textColor }}>
      <h2 style={{ color:textColor, textShadow:'0 1px 10px rgba(124,58,237,0.35)' }}>Quizzes</h2>

      <section className="glass-card" style={{ padding: 12, color:textColor, marginBottom: 12, border:'1px solid rgba(124,58,237,0.24)', background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Live</div>
        {loading ? (<div>Loading...</div>) : partitioned.live.length === 0 ? (<div>No live quizzes right now.</div>) : (
          <div style={{ display:'grid', gap:10 }}>
            {partitioned.live.map(q => (
              <div key={q.id} className="glass" style={{ padding:10, border:'1px solid rgba(167,139,250,0.28)', borderRadius:12, background:'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(244,114,182,0.08))', color:textColor }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{q.title}</div>
                    <div style={{ opacity:0.9, fontSize:13 }}>{q.description}</div>
                    <div style={{ opacity:0.9, fontSize:12 }}>Ends: {new Date(q.end_time).toLocaleString()}</div>
                  </div>
                  <Link to={`/take-quiz/${q.id}`} className="btn" style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none', height:36, alignSelf:'center' }}>Take Quiz</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card" style={{ padding: 12, color:textColor, marginBottom: 12, border:'1px solid rgba(124,58,237,0.24)', background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Upcoming</div>
        {loading ? (<div>Loading...</div>) : partitioned.upcoming.length === 0 ? (<div>No upcoming quizzes.</div>) : (
          <div style={{ display:'grid', gap:10 }}>
            {partitioned.upcoming.map(q => (
              <div key={q.id} className="glass" style={{ padding:10, border:'1px solid rgba(167,139,250,0.28)', borderRadius:12, background:'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(244,114,182,0.08))', color:textColor }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{q.title}</div>
                    <div style={{ opacity:0.9, fontSize:13 }}>{q.description}</div>
                    <div style={{ opacity:0.9, fontSize:12 }}>Starts: {new Date(q.start_time).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card" style={{ padding: 12, color:textColor, border:'1px solid rgba(124,58,237,0.24)', background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Ended</div>
        {loading ? (<div>Loading...</div>) : partitioned.ended.length === 0 ? (<div>No ended quizzes.</div>) : (
          <div style={{ display:'grid', gap:10 }}>
            {partitioned.ended.map(q => (
              <div key={q.id} className="glass" style={{ padding:10, border:'1px solid rgba(167,139,250,0.28)', borderRadius:12, background:'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(244,114,182,0.08))', color:textColor }}>
                <div>
                  <div style={{ fontWeight:700 }}>{q.title}</div>
                  <div style={{ opacity:0.9, fontSize:13 }}>{q.description}</div>
                  <div style={{ opacity:0.9, fontSize:12 }}>Ended: {new Date(q.end_time).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
