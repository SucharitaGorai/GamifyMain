import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Shooter from '../components/Shooter';

export default function PlayGame(){
  const { id } = useParams();
  const { isSupabaseConfigured } = useAuth();
  const [game, setGame] = useState(null);
  const [qset, setQset] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: g } = await supabase.from('games').select('*').eq('id', id).single();
          setGame(g || null);
          const { data: qs } = await supabase.from('game_questions').select('*').eq('game_id', id).order('index', { ascending: true });
          const mapped = (qs||[]).map(r => ({
            question: r.prompt,
            options: [r.option_a, r.option_b, r.option_c, r.option_d],
            answer: [r.option_a, r.option_b, r.option_c, r.option_d][Math.max(0, Math.min(3, Number(r.correct_index)||0))]
          }));
          setQset(mapped);
        } else {
          const local = JSON.parse(localStorage.getItem('games_public')||'[]');
          setGame(local.find(x=>String(x.id)===String(id))||null);
          const qs = JSON.parse(localStorage.getItem(`game_questions_${id}`)||'[]');
          const mapped = (qs||[]).map(r => ({
            question: r.prompt,
            options: [r.option_a, r.option_b, r.option_c, r.option_d],
            answer: [r.option_a, r.option_b, r.option_c, r.option_d][Math.max(0, Math.min(3, Number(r.correct_index)||0))]
          }));
          setQset(mapped);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isSupabaseConfigured]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color:'#fff', margin:0, textShadow:'0 1px 12px rgba(124,58,237,0.35)' }}>{game?.title || 'Game'}</h2>
      <div style={{ marginTop: 12 }}>
        <Shooter title={game?.title} questions={qset} />
      </div>
    </div>
  );
}
