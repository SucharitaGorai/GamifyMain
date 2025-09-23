import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function StudentGames(){
  const { user, isSupabaseConfigured } = useAuth();
  const school = user?.user_metadata?.school || (function(){ try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.school; } catch { return null; } })() || null;

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          // public games or school-scoped games
          let q = supabase.from('games').select('*').order('created_at', { ascending:false }).limit(200);
          const { data, error } = await q;
          if (error) throw error;
          const list = (data||[]).filter(g => g.visibility === 'public' || (g.visibility === 'school' && g.school && school && String(g.school).trim().toLowerCase() === String(school).trim().toLowerCase()));
          setGames(list);
        } else {
          const local = JSON.parse(localStorage.getItem('games_public') || '[]');
          setGames(local);
        }
      } catch (e) {
        console.warn('Failed to load games', e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSupabaseConfigured, school]);

  return (
    <div style={{ position:'relative', minHeight:'100vh' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:
        'radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.24), transparent),\
         radial-gradient(1000px 600px at 110% 0%, rgba(244,114,182,0.22), transparent),\
         radial-gradient(900px 700px at 50% 120%, rgba(124,58,237,0.16), transparent),\
         #0b1220' }} />
      <div className="container" style={{ padding: 16, position:'relative', zIndex:1, color:'#fff' }}>
        <h2 style={{ margin:0, textShadow:'0 1px 10px rgba(124,58,237,0.35)' }}>Uploaded Games</h2>
        {loading ? (
          <div style={{ marginTop: 12 }}>Loading...</div>
        ) : games.length === 0 ? (
          <div style={{ marginTop: 12 }}>No games yet.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
            {games.map(g => (
              <div key={g.id} className="glass-card" style={{ padding: 12, background:'linear-gradient(180deg, rgba(124,58,237,0.12), rgba(244,114,182,0.10))', border:'1px solid rgba(124,58,237,0.24)', borderRadius: 12 }}>
                <div style={{ fontWeight: 700 }}>{g.title}</div>
                <div style={{ opacity:0.9, fontSize:13 }}>{g.description || '—'}</div>
                <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', fontSize:12, opacity:0.9 }}>
                  <span style={{ padding:'2px 8px', border:'1px solid rgba(167,139,250,0.35)', borderRadius:999 }}>Subject: {g.subject}</span>
                  <span style={{ padding:'2px 8px', border:'1px solid rgba(167,139,250,0.35)', borderRadius:999 }}>Visibility: {g.visibility}</span>
                </div>
                <Link to={`/play/${g.id}`} className="btn" style={{ marginTop:10, display:'inline-block', background:'linear-gradient(135deg,#7c3aed,#f472b6)', color:'#fff', border:'none' }}>Play</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
