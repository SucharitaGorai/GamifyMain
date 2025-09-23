import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function TeacherQuizBuilder() {
  const { user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;
  const teacherName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState(() => Array.from({ length: 10 }, (_, i) => ({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const textColor = '#fff';

  const canSave = useMemo(() => {
    if (!title.trim() || !start || !end || !school) return false;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!isFinite(s) || !isFinite(e) || s >= e) return false;
    if (questions.length < 1) return false;
    for (const q of questions) {
      if (!q.text.trim()) return false;
      if (q.options.some(o => !o.trim())) return false;
      if (![0,1,2,3].includes(Number(q.correctIndex))) return false;
    }
    return true;
  }, [title, start, end, school, questions]);

  const setQuestionCount = (n) => {
    const num = Math.max(1, Math.min(20, Number(n)||10));
    setCount(num);
    setQuestions(prev => {
      const next = [...prev];
      if (num > next.length) {
        while (next.length < num) next.push({ text: '', options: ['', '', '', ''], correctIndex: 0 });
      } else if (num < next.length) {
        next.length = num;
      }
      return next;
    });
  };

  const handleChangeQ = (i, field, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };
  const handleChangeOpt = (qi, oi, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j===oi? value : o) } : q));
  };

  const saveLocal = (quizId, quizRow, qRows) => {
    try {
      const qKey = school ? `quizzes_${school}` : 'quizzes_demo';
      const list = JSON.parse(localStorage.getItem(qKey) || '[]');
      localStorage.setItem(qKey, JSON.stringify([{...quizRow, id: quizId}, ...list]));
      localStorage.setItem(`quiz_questions_${quizId}`, JSON.stringify(qRows));
    } catch {}
  };

  const handleSave = async () => {
    setMsg('');
    if (!canSave) { setMsg('Please complete all fields and ensure time window is valid.'); return; }
    if (!school) { setMsg('Your profile has no school set.'); return; }
    setSaving(true);
    try {
      const quizRow = {
        title, description: desc || null, school, start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(), created_by: user?.id || 'demo', teacher_name: teacherName,
      };
      const qRows = questions.map((q, i) => ({
        index: i+1,
        prompt: q.text,
        option_a: q.options[0],
        option_b: q.options[1],
        option_c: q.options[2],
        option_d: q.options[3],
        choices: q.options, // for schemas that use JSONB choices NOT NULL
        correct_index: Number(q.correctIndex)
      }));

      if (isSupabaseConfigured && supabase && user) {
        const { data: qIns, error: qErr } = await supabase.from('quizzes').insert(quizRow).select('id').single();
        if (qErr) throw qErr;
        const quizId = qIns.id;
        const questionRows = qRows.map(r => ({ quiz_id: quizId, ...r }));
        const { error: qqErr } = await supabase.from('quiz_questions').insert(questionRows);
        if (qqErr) throw qqErr;
        // Fire-and-forget: notify students in the same school via Edge Function
        try {
          await supabase.functions.invoke('notify-quiz', {
            body: {
              quizId,
              title,
              description: desc || null,
              school,
              start_time: new Date(start).toISOString(),
              end_time: new Date(end).toISOString(),
              teacher_name: teacherName,
            }
          });
        } catch (e) {
          console.warn('notify-quiz invoke failed:', e?.message || e);
        }
        setMsg('Quiz created successfully.');
        navigate(`/teacher/quiz-evaluation?quiz=${quizId}`);
      } else {
        const quizId = `demo-${Date.now()}`;
        saveLocal(quizId, { ...quizRow, created_at: new Date().toISOString() }, qRows);
        setMsg('Quiz created locally (demo mode).');
        navigate('/teacher/quiz-evaluation');
      }
    } catch (e) {
      setMsg(e.message || 'Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'relative', minHeight:'100vh' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:
        'radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.24), transparent),\
         radial-gradient(1000px 600px at 110% 0%, rgba(244,114,182,0.22), transparent),\
         radial-gradient(900px 700px at 50% 120%, rgba(124,58,237,0.16), transparent),\
         #0b1220' }} />
      <div className="container" style={{ padding: 16, position:'relative', zIndex:1, color: textColor }}>
      <h2 style={{ color:textColor, textShadow:'0 1px 12px rgba(124,58,237,0.35)', marginTop: 2, letterSpacing: 0.2 }}>Create Quiz</h2>
      {!school && <div style={{ color:'#fca5a5', marginBottom: 8 }}>Set your school in Profile first.</div>}
      <div className="glass-card" style={{ padding: 16, color:textColor, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', borderRadius: 14 }}>
        <div style={{ display:'grid', gap: 12 }}>
          <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} className="student-input" placeholder="Quiz title" style={{ color: textColor }} /></label>
          <label>Description<textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="student-input" placeholder="Short description (optional)" style={{ color: textColor }} /></label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <label>Start Time<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} className="student-input" style={{ color: textColor }} /></label>
            <label>End Time<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} className="student-input" style={{ color: textColor }} /></label>
          </div>
          <label>Number of Questions (1-20)
            <input type="number" min={1} max={20} value={count} onChange={e=>setQuestionCount(e.target.value)} className="student-input" style={{ color: textColor }} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 16, display:'grid', gap: 12 }}>
        {questions.map((q, i) => (
          <div key={i} className="glass-card" style={{ padding: 12, color:textColor, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Question {i+1}</div>
            <input value={q.text} onChange={e=>handleChangeQ(i, 'text', e.target.value)} className="student-input" placeholder="Enter question text" style={{ color: textColor }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginTop:8 }}>
              {q.options.map((opt, j) => (
                <input key={j} value={opt} onChange={e=>handleChangeOpt(i, j, e.target.value)} className="student-input" placeholder={`Option ${String.fromCharCode(65+j)}`} style={{ color: textColor }} />
              ))}
            </div>
            <div style={{ marginTop:8 }}>
              <label>Correct Option: </label>
              <select value={q.correctIndex} onChange={e=>handleChangeQ(i, 'correctIndex', Number(e.target.value))} className="student-input" style={{ maxWidth: 160, color: textColor }}>
                <option value={0}>A</option>
                <option value={1}>B</option>
                <option value={2}>C</option>
                <option value={3}>D</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{ color:'#fca5a5', marginTop: 10 }}>{msg}</div>}

      <div style={{ marginTop: 16, display:'flex', gap: 10 }}>
        <button className="btn" disabled={!canSave || saving} onClick={handleSave} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>
          {saving ? 'Saving...' : 'Create Quiz'}
        </button>
        <button className="btn" onClick={()=>navigate(-1)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.25)', color:'#fff' }}>Cancel</button>
      </div>
      </div>
    </div>
  );
}
