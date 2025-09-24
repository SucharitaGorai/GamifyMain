import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function TeacherHome() {
  const { user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';
  const school = user?.user_metadata?.school || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; }
  })() || null;

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState([]);
  const [subject, setSubject] = useState('science');
  const [desc, setDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const resetUpload = () => {
    setFiles([]);
    setSubject('science');
    setDesc('');
    setMessage('');
    setUploading(false);
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const doLocalSave = (items) => {
    try {
      const key = school ? `materials_${school}` : 'materials_demo';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([...(existing||[]), ...items]));
    } catch {}
  };

  const handleUpload = async () => {
    setMessage('');
    if (!files || files.length === 0) { setMessage('Please choose at least one file.'); return; }
    if (!subject) { setMessage('Please select a subject.'); return; }
    if (!school) { setMessage('Your profile has no school set. Please set your school in Profile and try again.'); return; }
    setUploading(true);
    const created = [];
    const problems = [];
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB safeguard
    try {
      if (isSupabaseConfigured && supabase && user) {
        // Ensure a storage bucket named 'materials' exists in your Supabase project
        for (const f of files) {
          if (typeof f?.size === 'number' && f.size > MAX_SIZE) {
            problems.push(`File too large: ${f.name} (>${Math.round(MAX_SIZE/1024/1024)}MB). Please upload a smaller file.`);
            continue;
          }
          const path = `${user.id}/${Date.now()}_${f.name}`;
          const { error: upErr } = await supabase.storage.from('materials').upload(path, f, {
            cacheControl: '3600', upsert: false
          });
          if (upErr) { problems.push(`Upload failed for ${f.name}: ${upErr.message}. Tip: Make sure a Storage bucket named "materials" exists and is public (or switch to signed URLs).`); continue; }
          const { data: pub } = supabase.storage.from('materials').getPublicUrl(path);
          const fileUrl = pub?.publicUrl || null;
          const row = {
            user_id: user.id,
            school: school || null,
            subject,
            description: desc || null,
            file_name: f.name,
            teacher_name: (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Teacher'),
            url: fileUrl,
          };
          const { error: insErr } = await supabase.from('materials').insert(row);
          if (insErr) { problems.push(`Saved file but failed to record metadata for ${f.name}: ${insErr.message}. Tip: Ensure table public.materials has columns (user_id, school, subject, description, file_name, teacher_name, url).`); }
          created.push({ ...row, created_at: new Date().toISOString() });
        }
      } else {
        // Demo/local mode
        const items = files.map(f => ({
          user_id: 'demo',
          school: school || 'demo',
          subject,
          description: desc || null,
          file_name: f.name,
          teacher_name: (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher'),
          url: null,
          created_at: new Date().toISOString(),
        }));
        doLocalSave(items);
        created.push(...items);
      }
      if (created.length > 0 && problems.length === 0) {
        setMessage(`Uploaded ${created.length} item(s) successfully.`);
        resetUpload();
        setShowUpload(false);
      } else if (problems.length > 0) {
        setMessage(problems.join('\n'));
      }
    } catch (e) {
      setMessage(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position:'relative', minHeight:'100vh' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:
        'radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.24), transparent),\
         radial-gradient(1000px 600px at 110% 0%, rgba(244,114,182,0.22), transparent),\
         radial-gradient(900px 700px at 50% 120%, rgba(124,58,237,0.16), transparent),\
         #0b1220' }} />
    <div className="container" style={{ padding: 16, position:'relative', zIndex:1 }}>
      {/* Header */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ padding: 16, marginBottom: 16, background:'linear-gradient(135deg, rgba(124,58,237,0.28), rgba(244,114,182,0.22))', border:'1px solid rgba(124,58,237,0.30)', color:'#fff' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>👩‍🏫 Welcome, {name}</h2>
            <div style={{ opacity: 0.8 }}>Your teacher workspace</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link to="/qna" className="btn" style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>💬 Community Q&A</Link>
            <Link to="/dashboard" className="btn" style={{ background:'linear-gradient(135deg,#f472b6,#7c3aed)', color:'#fff', border:'none' }}>📊 Teacher Dashboard</Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', color:'#fff' }}>
          <h3 style={{ marginTop: 0 }}>Create Quiz</h3>
          <p style={{ opacity: 0.85 }}>Build engaging quizzes for your class and track performance.</p>
          <button className="btn" onClick={() => navigate('/teacher/quiz-builder')} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>Open Builder</button>
        </motion.div>

        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', color:'#fff' }}>
          <h3 style={{ marginTop: 0 }}>Create Game</h3>
          <p style={{ opacity: 0.85 }}>Build engaging shooter-style quiz games and publish for all students.</p>
          <button className="btn" onClick={() => navigate('/teacher/game-builder')} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>Open Builder</button>
        </motion.div>

        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', color:'#fff' }}>
          <h3 style={{ marginTop: 0 }}>Manage Q&A</h3>
          <p style={{ opacity: 0.85 }}>Help students in the community Q&A by answering questions.</p>
          <button className="btn" onClick={() => navigate('/qna')} style={{ background:'linear-gradient(135deg,#f472b6,#7c3aed)', color:'#fff', border:'none' }}>Go to Q&A</button>
        </motion.div>

        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', color:'#fff' }}>
          <h3 style={{ marginTop: 0 }}>Share Materials</h3>
          <p style={{ opacity: 0.85 }}>Upload notes, videos or PYQs via dashboard for your students.</p>
          <button className="btn" onClick={() => setShowUpload(true)} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>Upload</button>
        </motion.div>

        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ padding: 16, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', color:'#fff' }}>
          <h3 style={{ marginTop: 0 }}>Quiz Evaluation</h3>
          <p style={{ opacity: 0.85 }}>Review scores and submissions for your quizzes.</p>
          <button className="btn" onClick={() => navigate('/teacher/quiz-evaluation')} style={{ background:'linear-gradient(135deg,#f472b6,#7c3aed)', color:'#fff', border:'none' }}>Open Evaluation</button>
        </motion.div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'grid', placeItems:'center', zIndex:1000 }}>
          <div className="glass-card" style={{ width:'min(560px, 92vw)', padding:16, background:'rgba(15, 13, 35, 0.9)', border:'1px solid rgba(167,139,250,0.3)', color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <h3 style={{ margin:0 }}>Upload Materials</h3>
              <button className="btn" onClick={()=>{ setShowUpload(false); }} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.25)', color:'#fff' }}>Close</button>
            </div>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label>Files</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/*,image/*"
                  style={{ display:'block', marginTop:6 }}
                />
                <div style={{ opacity:0.85, fontSize:12, marginTop:6 }}>
                  Supported: PDF, DOC/DOCX, PPT/PPTX, images, videos. Max ~100MB per file. You can select multiple files from your computer or phone.
                </div>
              </div>
              <div>
                <label>Subject</label>
                <div style={{ display:'flex', gap:10, marginTop:6 }}>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input type="radio" name="subject" value="science" checked={subject==='science'} onChange={(e)=>setSubject(e.target.value)} /> Science
                  </label>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input type="radio" name="subject" value="mathematics" checked={subject==='mathematics'} onChange={(e)=>setSubject(e.target.value)} /> Mathematics
                  </label>
                </div>
              </div>
              <div>
                <label>Description</label>
                <textarea rows={3} value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Add a short description for your students (e.g., Chapter 2 PYQ pdf)" style={{ width:'100%', marginTop:6, borderRadius:12, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(2,6,23,0.35)', padding:'10px 12px', color:'#ffffff' }} />
              </div>
              {message && <div style={{ color:'#fca5a5' }}>{message}</div>}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn" onClick={()=>{ resetUpload(); setShowUpload(false); }} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.25)', color:'#fff' }}>Cancel</button>
                <button className="btn" disabled={uploading} onClick={handleUpload} style={{ background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
              {school && (
                <div style={{ opacity:0.85, fontSize:12 }}>This will be shared for your school: <strong>{String(school).toUpperCase()}</strong></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
