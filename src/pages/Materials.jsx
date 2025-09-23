import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function Materials() {
  const { user, isSupabaseConfigured } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('all');
  const [q, setQ] = useState('');
  const school = user?.user_metadata?.school || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; }
  })() || null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          let query = supabase.from('materials').select('id, user_id, school, subject, description, file_name, teacher_name, url, created_at');
          const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
          if (error) throw error;
          if (!cancelled) setItems(data || []);
        } else {
          // Local/demo mode: read materials for this school
          const key = school ? `materials_${school}` : 'materials_demo';
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cancelled) setItems(Array.isArray(data) ? data.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)) : []);
          } catch {
            if (!cancelled) setItems([]);
          }
        }
      } catch (e) {
        console.warn('Materials load error:', e.message);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('materials-change')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => load())
        .subscribe();
    }
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [isSupabaseConfigured, school]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (items || []).filter(item => {
      const okSubj = subject === 'all' || String(item.subject).toLowerCase() === subject;
      const hay = `${item.description||''} ${item.file_name||''} ${item.teacher_name||''} ${item.school||''}`.toLowerCase();
      const okQ = !qq || hay.includes(qq);
      return okSubj && okQ;
    });
  }, [items, subject, q]);

  // Single-line grid layout for header and rows
  const gridCols = '48px 1.4fr 1fr 0.9fr 1fr 2fr';
  const cellStyle = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  return (
    <div className="lb-page" style={{ padding: 24 }}>
      <div className="lb-container">
        <motion.h1 className="lb-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          Uploaded Files
        </motion.h1>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom: 14 }}>
          <select value={subject} onChange={(e)=>setSubject(e.target.value)} style={{ padding:'10px 12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(2,6,23,0.35)', color:'#fff' }}>
            <option value="all">All Subjects</option>
            <option value="science">Science</option>
            <option value="mathematics">Mathematics</option>
          </select>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search description, file name, teacher..." style={{ minWidth: 260, padding:'10px 12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(2,6,23,0.35)', color:'#fff' }} />
        </div>

        <motion.div className="lb-board glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ overflowX: 'auto' }}>
          <div className="lb-header" style={{ display:'grid', gridTemplateColumns: gridCols, columnGap:12, alignItems:'center', whiteSpace:'nowrap' }}>
            <span style={cellStyle}>#</span>
            <span style={cellStyle}>File</span>
            <span style={cellStyle}>Teacher</span>
            <span style={cellStyle}>School</span>
            <span style={cellStyle}>Subject</span>
            <span style={cellStyle}>Description</span>
          </div>
          <div className="lb-rows">
            {loading ? (
              <div className="lb-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="lb-empty">No files uploaded yet.</div>
            ) : filtered.map((it, i) => (
              <div className="lb-row" key={it.id || `${it.file_name}-${i}`} style={{ display:'grid', gridTemplateColumns: gridCols, columnGap:12, alignItems:'center' }}>
                <span className="lb-rank" style={cellStyle}>{i + 1}</span>
                <span className="lb-name" style={cellStyle}>
                  {it.url ? (<a href={it.url} target="_blank" rel="noreferrer" style={{ color:'#c4b5fd', ...cellStyle }}>{it.file_name || 'file'}</a>) : (it.file_name || 'file')}
                </span>
                <span className="lb-teacher" style={cellStyle}>{it.teacher_name || 'Teacher'}</span>
                <span className="lb-school" style={cellStyle}>{(it.school ? String(it.school).toUpperCase() : '—')}</span>
                <span className="lb-subject" style={cellStyle}>{it.subject || '—'}</span>
                <span className="lb-desc" style={cellStyle}>{it.description || '—'}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
