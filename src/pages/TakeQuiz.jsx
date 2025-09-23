import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function TakeQuiz() {
  const { id } = useParams();
  const { user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;
  const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const textColor = '#4c1d95';

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: qz, error } = await supabase.from('quizzes').select('*').eq('id', id).single();
          if (error) throw error;
          if (!cancelled) setQuiz(qz);
          const { data: qs, error: qerr } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', id)
            .order('index', { ascending: true });
          if (qerr) throw qerr;
          if (!cancelled) setQuestions(qs || []);
        } else {
          // demo
          const key = school ? `quizzes_${school}` : 'quizzes_demo';
          const all = JSON.parse(localStorage.getItem(key) || '[]');
          const qz = all.find(x => String(x.id) === String(id)) || null;
          if (!cancelled) setQuiz(qz);
          const qs = JSON.parse(localStorage.getItem(`quiz_questions_${id}`) || '[]');
          if (!cancelled) setQuestions(qs);
        }
      } catch (e) {
        setMessage(e.message || 'Failed to load quiz');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isSupabaseConfigured, school]);

  const now = Date.now();
  const status = useMemo(() => {
    if (!quiz) return 'loading';
    const s = new Date(quiz.start_time).getTime();
    const e = new Date(quiz.end_time).getTime();
    if (now < s) return 'upcoming';
    if (now > e) return 'ended';
    return 'live';
  }, [quiz, now]);

  const scorePreview = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      const a = answers[q.index];
      if (typeof a === 'number' && a === q.correct_index) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);

  const submitAttempt = async () => {
    setMessage('');
    if (!quiz) return;
    setSubmitting(true);
    try {
      let score = 0;
      const details = [];
      for (const q of questions) {
        const chosen = typeof answers[q.index] === 'number' ? answers[q.index] : null;
        const isCorrect = chosen === q.correct_index;
        if (isCorrect) score += 1;
        details.push({ index: q.index, chosen, correct: q.correct_index });
      }
      const row = {
        quiz_id: quiz.id,
        user_id: user?.id || 'demo',
        student_name: studentName,
        score,
        total: questions.length,
        detail: details,
      };

      if (isSupabaseConfigured && supabase && user) {
        const { error } = await supabase.from('quiz_attempts').insert(row);
        if (error) throw error;
      } else {
        // demo: save attempts per quiz id
        try {
          const key = `quiz_attempts_${quiz.id}`;
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(key, JSON.stringify([{ ...row, created_at: new Date().toISOString() }, ...list]));
        } catch {}
      }
      setMessage(`Submitted! Score: ${score}/${questions.length}`);
    } catch (e) {
      setMessage(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding:16, color:textColor }}>Loading quiz...</div>;
  if (!quiz) return <div style={{ padding:16, color:textColor }}>Quiz not found.</div>;

  return (
    <div style={{ padding: 16, color:textColor }}>
      <div className="glass-card" style={{ padding: 12, marginBottom: 12, border:'1px solid rgba(167,139,250,0.25)', background:'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(15,13,35,0.35))' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{quiz.title}</div>
        <div style={{ opacity: 0.95 }}>{quiz.description}</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>Window: {new Date(quiz.start_time).toLocaleString()} → {new Date(quiz.end_time).toLocaleString()}</div>
        <div style={{ marginTop: 6 }}>
          Status: <strong style={{ textTransform:'capitalize' }}>{status}</strong>
        </div>
      </div>

      {status !== 'live' ? (
        <div className="glass-card" style={{ padding: 12 }}>
          {status === 'upcoming' && <div>The quiz has not started yet.</div>}
          {status === 'ended' && <div>The quiz has ended.</div>}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 12, border:'1px solid rgba(167,139,250,0.25)', background:'linear-gradient(180deg, rgba(124,58,237,0.08), rgba(15,13,35,0.28))' }}>
          {questions.map((q) => (
            <div key={q.index} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>Q{q.index}. {q.prompt || q.question}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop:6 }}>
                {(Array.isArray(q.choices) && q.choices.length === 4 ? q.choices : [q.option_a, q.option_b, q.option_c, q.option_d]).map((opt, i) => (
                  <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', border:'1px solid rgba(167,139,250,0.25)', borderRadius:10, background:'rgba(124,58,237,0.06)' }}>
                    <input
                      type="radio"
                      name={`q_${q.index}`}
                      value={i}
                      checked={answers[q.index] === i}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.index]: i }))}
                    />
                    <span style={{ color:textColor }}>{String.fromCharCode(65+i)}. {opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {message && <div style={{ color:'#fca5a5', marginTop: 8 }}>{message}</div>}

          <div style={{ display:'flex', gap:10, alignItems:'center', marginTop: 8 }}>
            <button className="btn" disabled={submitting} onClick={submitAttempt} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
            <div style={{ opacity:0.9, fontSize:13, color:textColor }}>Current score (preview): {scorePreview.correct}/{scorePreview.total}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => navigate('/quizzes')} style={{ background:'transparent', border:'1px solid rgba(167,139,250,0.35)', color:textColor }}>Back to Quizzes</button>
      </div>
    </div>
  );
}
