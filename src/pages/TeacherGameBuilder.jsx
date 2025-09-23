import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function TeacherGameBuilder() {
  const { user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const teacherName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;

  const [title, setTitle] = useState('Pixel Shooter Quiz — NCERT Class 8 Science: Force');
  const [desc, setDesc] = useState('A shooter-style quiz game that reinforces Force chapter concepts.');
  const [subject, setSubject] = useState('science');
  const [visibility, setVisibility] = useState('public'); // public | school
  const [count, setCount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [questions, setQuestions] = useState(() => Array.from({ length: 10 }, () => ({
    text: '', options: ['', '', '', ''], correctIndex: 0,
  })));

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (questions.length < 1) return false;
    for (const q of questions) {
      if (!q.text.trim()) return false;
      if (q.options.some(o => !o.trim())) return false;
    }
    return true;
  }, [title, questions]);

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

  const saveLocal = (gameId, gameRow, gRows) => {
    try {
      const list = JSON.parse(localStorage.getItem('games_public') || '[]');
      localStorage.setItem('games_public', JSON.stringify([{...gameRow, id: gameId}, ...list]));
      localStorage.setItem(`game_questions_${gameId}`, JSON.stringify(gRows));
    } catch {}
  };

  const handleSave = async () => {
    setMsg('');
    if (!canSave) { setMsg('Please complete the title and all questions.'); return; }
    setSaving(true);
    try {
      const gameRow = {
        title,
        description: desc || null,
        subject,
        visibility, // 'public' means visible to all schools
        school: visibility === 'school' ? (school || null) : null,
        created_by: user?.id || 'demo',
        teacher_name: teacherName,
        created_at: new Date().toISOString(),
      };
      const qRows = questions.map((q, i) => ({
        index: i+1,
        prompt: q.text,
        option_a: q.options[0],
        option_b: q.options[1],
        option_c: q.options[2],
        option_d: q.options[3],
        correct_index: Number(q.correctIndex),
      }));

      if (isSupabaseConfigured && supabase && user) {
        // Expect tables: games, game_questions
        const { data: ins, error: gErr } = await supabase.from('games').insert(gameRow).select('id').single();
        if (gErr) throw gErr;
        const gameId = ins.id;
        const questionRows = qRows.map(r => ({ game_id: gameId, ...r }));
        const { error: qsErr } = await supabase.from('game_questions').insert(questionRows);
        if (qsErr) throw qsErr;
        setMsg('Game created successfully.');
        navigate(`/play/${gameId}`);
      } else {
        const gameId = `demo-${Date.now()}`;
        saveLocal(gameId, { ...gameRow }, qRows);
        setMsg('Game created locally (demo mode).');
        navigate(`/play/${gameId}`);
      }
    } catch (e) {
      setMsg(e.message || 'Failed to create game. Tip: Ensure tables public.games and public.game_questions exist.');
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
    <div className="container" style={{ padding: 16, position:'relative', zIndex:1, color:'#fff' }}>
      <h2 style={{ color:'#fff', textShadow:'0 1px 12px rgba(124,58,237,0.35)', marginTop: 2 }}>Create Game</h2>
      <div className="glass-card" style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', borderRadius: 14 }}>
        <div style={{ display:'grid', gap: 12 }}>
          <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} className="student-input" placeholder="Game title" style={{ color:'#fff' }} /></label>
          <label>Description<textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="student-input" placeholder="Short description (optional)" style={{ color:'#fff' }} /></label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)} className="student-input" style={{ color:'#fff' }}>
              <option value="science">Science</option>
              <option value="mathematics">Mathematics</option>
            </select></label>
            <label>Visibility<select value={visibility} onChange={e=>setVisibility(e.target.value)} className="student-input" style={{ color:'#fff' }}>
              <option value="public">All Schools (Public)</option>
              <option value="school">My School Only</option>
            </select></label>
          </div>
          <label>Number of Questions (1-20)
            <input type="number" min={1} max={20} value={count} onChange={e=>setQuestionCount(e.target.value)} className="student-input" style={{ color:'#fff' }} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 16, display:'grid', gap: 12 }}>
        {questions.map((q, i) => (
          <div key={i} className="glass-card" style={{ padding: 12, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', borderRadius: 12, color:'#fff' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Question {i+1}</div>
            <input value={q.text} onChange={e=>handleChangeQ(i, 'text', e.target.value)} className="student-input" placeholder="Enter question text" style={{ color:'#fff' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginTop:8 }}>
              {q.options.map((opt, j) => (
                <input key={j} value={opt} onChange={e=>handleChangeOpt(i, j, e.target.value)} className="student-input" placeholder={`Option ${String.fromCharCode(65+j)}`} style={{ color:'#fff' }} />
              ))}
            </div>
            <div style={{ marginTop:8 }}>
              <label>Correct Option: </label>
              <select value={q.correctIndex} onChange={e=>handleChangeQ(i, 'correctIndex', Number(e.target.value))} className="student-input" style={{ maxWidth: 180, color:'#fff' }}>
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
        <button className="btn" disabled={!canSave || saving} onClick={handleSave} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>{saving ? 'Saving...' : 'Create Game'}</button>
        <button className="btn" onClick={()=>navigate(-1)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.25)', color:'#fff' }}>Cancel</button>
      </div>
    </div>
    </div>
  );
}
