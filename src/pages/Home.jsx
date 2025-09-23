import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useProgress } from "../contexts/ProgressContext";
import NetworkStatusIndicator from "../components/NetworkStatusIndicator";
import { supabase } from "../supabaseClient";
import './Home.css';

// Lightweight inline SVG icon set (no external deps)
function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  const strokeProps = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case 'home':
      return (
        <svg {...common}><path {...strokeProps} d="M3 11l9-7 9 7"/><path {...strokeProps} d="M9 22V12h6v10"/></svg>
      );
    case 'quiz':
      return (
        <svg {...common}><path {...strokeProps} d="M4 4h16v12H4z"/><path {...strokeProps} d="M8 20h8"/><path {...strokeProps} d="M9 8h6M9 11h4"/></svg>
      );
    case 'bolt':
      return (
        <svg {...common}><path {...strokeProps} d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
      );
    case 'gift':
      return (
        <svg {...common}><path {...strokeProps} d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path {...strokeProps} d="M2 7h20v5H2z"/><path {...strokeProps} d="M12 22V7"/><path {...strokeProps} d="M12 7s-2.5-5 2-5c2 0 2 2 2 2s2-2 4 0c2 2-2 3-2 3H12z"/></svg>
      );
    case 'trophy':
      return (
        <svg {...common}><path {...strokeProps} d="M8 21h8"/><path {...strokeProps} d="M12 17v4"/><path {...strokeProps} d="M18 3H6v5a6 6 0 0 0 12 0V3z"/><path {...strokeProps} d="M5 7H4a3 3 0 0 1-3-3V3h4v4zM19 7h1a3 3 0 0 0 3-3V3h-4v4z"/></svg>
      );
    case 'chart':
      return (
        <svg {...common}><path {...strokeProps} d="M3 3v18h18"/><path {...strokeProps} d="M7 13v5"/><path {...strokeProps} d="M12 9v9"/><path {...strokeProps} d="M17 5v13"/></svg>
      );
    case 'user':
      return (
        <svg {...common}><path {...strokeProps} d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z"/><path {...strokeProps} d="M4 21a8 8 0 0 1 16 0"/></svg>
      );
    case 'note':
      return (
        <svg {...common}><path {...strokeProps} d="M4 3h12l4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path {...strokeProps} d="M14 3v6h6"/></svg>
      );
    case 'controller':
      return (
        <svg {...common}><path {...strokeProps} d="M6 14l-2 2a3 3 0 0 1-4-3l2-7a4 4 0 0 1 4-3h8a4 4 0 0 1 4 3l2 7a3 3 0 0 1-4 3l-2-2H8z"/><path {...strokeProps} d="M8 12h-3M6.5 10.5v3"/><circle {...strokeProps} cx="16.5" cy="10.5" r="1"/><circle {...strokeProps} cx="19" cy="12.5" r="1"/></svg>
      );
    case 'star':
      return (
        <svg {...common}><path {...strokeProps} d="M12 2l2.9 5.9L21 9.3l-4.5 4.4L17.8 21 12 17.8 6.2 21l1.3-7.3L3 9.3l6.1-1.4L12 2z"/></svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  const [selectedClass, setSelectedClass] = useState("8");
  const [activeSection, setActiveSection] = useState("student");
  // Sidebar open/close state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isSupabaseConfigured } = useAuth();
  const { studentProgress, loading, getBadge, isNewUser, setMeta, updateProgress } = useProgress();
  const [topPlayers, setTopPlayers] = useState([]);
  const [recentMaterials, setRecentMaterials] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Resume button pulsing animation controls
  const resumeBtnRef = useRef(null);
  const resumeControls = useAnimation();
  const resumeInView = useInView(resumeBtnRef, { amount: 0.4 });

  useEffect(() => {
    if (resumeInView) {
      resumeControls.start({
        scale: [0.8, 1, 0.8],
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
      });
    } else {
      resumeControls.stop();
      resumeControls.set({ scale: 1 });
    }
  }, [resumeInView, resumeControls]);

  // Scroll to hash (e.g., /home#daily-challenge)
  useEffect(() => {
    const scrollToHash = () => {
      if (location.hash) {
        const el = document.querySelector(location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    // attempt immediately and after a short delay to ensure content is rendered
    scrollToHash();
    const id = setTimeout(scrollToHash, 150);
    return () => clearTimeout(id);
  }, [location.hash]);

  // Persist current user email for leaderboard highlighting
  useEffect(() => {
    if (user?.email) {
      try { localStorage.setItem('current_user_email', user.email); } catch {}
    }
  }, [user?.email]);

  // Load recent uploaded materials for the user's school
  useEffect(() => {
    let cancelled = false;
    const loadMaterials = async () => {
      try {
        const school = user?.user_metadata?.school || null;
        if (!school) { if (!cancelled) setRecentMaterials([]); return; }
        if (isSupabaseConfigured && supabase) {
          let query = supabase
            .from('materials')
            .select('id, file_name, url, subject, description, teacher_name, school, created_at')
            .eq('school', school)
            .order('created_at', { ascending: false })
            .limit(6);
          const { data, error } = await query;
          if (error) throw error;
          if (!cancelled) setRecentMaterials(data || []);
        } else {
          // Local/demo fallback
          const key = school ? `materials_${school}` : 'materials_demo';
          try {
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            const data = Array.isArray(arr) ? arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6) : [];
            if (!cancelled) setRecentMaterials(data);
          } catch {
            if (!cancelled) setRecentMaterials([]);
          }
        }
      } catch (e) {
        console.warn('Recent materials load error:', e.message);
        if (!cancelled) setRecentMaterials([]);
      }
    };
    loadMaterials();
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('home-materials')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => loadMaterials())
        .subscribe();
    }
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [isSupabaseConfigured, user?.user_metadata?.school]);

  // Helper to compute XP when falling back to local
  const calcXP = (progress) => {
    if (!progress) return 0;
    const subjects = ['science', 'technology', 'mathematics'];
    let games = 0, quizzes = 0;
    subjects.forEach(s => {
      games += progress[s]?.games || 0;
      quizzes += progress[s]?.quizzes || 0;
    });
    const streak = progress.streak || 0;
    return games * 15 + quizzes * 25 + streak * 20;
  };

  // Computed Total XP from canonical model (keeps UI consistent with Leaderboard)
  const computedTotalXP = useMemo(() => calcXP(studentProgress || {}), [studentProgress]);

  // Room URLs for embedded competitions (configurable via env or localStorage)
  const getEnv = (keys) => {
    try {
      for (const k of keys) {
        const viteVal = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[k]) || undefined;
        if (viteVal) return viteVal;
        const craVal = (typeof process !== 'undefined' && process.env && process.env[k]) || undefined;
        if (craVal) return craVal;
      }
    } catch {}
    return '';
  };
  const roomUrls = useMemo(() => ({
    science:
      getEnv(['VITE_SCIENCE_ROOM_URL', 'REACT_APP_SCIENCE_ROOM_URL']) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('room_url_science') : '') ||
      'https://science-final-mutiplayer.netlify.app/',
    mathematics:
      getEnv(['VITE_MATHEMATICS_ROOM_URL', 'VITE_MATHS_ROOM_URL', 'REACT_APP_MATHEMATICS_ROOM_URL', 'REACT_APP_MATHS_ROOM_URL']) ||
      (typeof localStorage !== 'undefined' ? (localStorage.getItem('room_url_mathematics') || localStorage.getItem('room_url_maths')) : '') ||
      'https://maths-final-multiplayer.netlify.app/',
  }), []);

  const openRoom = (subjectKey, e) => {
    try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch {}
    const url = roomUrls[subjectKey];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Room URL not configured yet for ' + subjectKey + '. Please set it via env or localStorage.');
    }
  };

  // Load top 3 leaderboard from Supabase (or local fallback)
  useEffect(() => {
    let cancelled = false;
    const loadTop = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('leaderboard')
            .select('user_id, display_name, class, xp')
            .order('xp', { ascending: false })
            .limit(3);
          if (error) throw error;
          if (!cancelled) {
            setTopPlayers((data || []).map(r => ({
              user_id: r.user_id,
              name: r.display_name || 'Player',
              xp: Number(r.xp) || 0,
              klass: r.class ? String(r.class) : 'Unknown',
            })));
          }
        } else {
          const data = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('student_progress_')) {
              const email = key.replace('student_progress_', '');
              try {
                const p = JSON.parse(localStorage.getItem(key) || '{}');
                const xp = calcXP(p);
                const userInfo = JSON.parse(localStorage.getItem(`user_${email}`) || 'null');
                const name = userInfo?.displayName || userInfo?.name || (email ? email.split('@')[0] : 'Player');
                const klass = userInfo?.class || userInfo?.grade || p?.class || 'Unknown';
                data.push({ name, xp, klass, key: email });
              } catch {}
            }
          }
          data.sort((a, b) => b.xp - a.xp);
          if (!cancelled) setTopPlayers(data.slice(0, 3));
        }
      } catch (e) {
        console.warn('Home leaderboard load error:', e.message);
      }
    };
    loadTop();
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('home-leaderboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => loadTop())
        .subscribe();
    }
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured]);

  // ===== LocalStorage helpers for progress/claims =====
  const progressKey = useMemo(() => {
    if (user?.email) return `student_progress_${user.email}`;
    // fallback to first found key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('student_progress_')) return k;
    }
    return null;
  }, [user?.email]);

  const readProgressLS = () => {
    if (!progressKey) return {};
    try { return JSON.parse(localStorage.getItem(progressKey)) || {}; } catch { return {}; }
  };

  // Daily challenge state
  const DAILY_CHALLENGE_XP = 50;
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyQs, setDailyQs] = useState([]);
  const [dailyAns, setDailyAns] = useState({});
  const [dailyScore, setDailyScore] = useState(null);
  useEffect(() => {
    setDailyDone(studentProgress?.dailyChallengeDate === todayStr());
  }, [studentProgress?.dailyChallengeDate]);

  // Auto-open the Daily Challenge once per day if not completed yet; ensure closed when completed
  useEffect(() => {
    const today = todayStr();
    const doneToday = studentProgress?.dailyChallengeDate === today;
    if (doneToday) {
      setDailyActive(false);
      setDailyQs([]);
      setDailyAns({});
    } else {
      // Do not auto-open; keep it closed until user clicks Start
      setDailyActive(false);
      setDailyQs([]);
      setDailyAns({});
    }
  }, [studentProgress?.dailyChallengeDate]);

  const handleDailyStart = () => {
    // Build 3 random questions (math & science)
    const pool = [
      { id: 'm1', q: 'What is 7 × 6?', choices: ['36','40','42','48'], correct: 2 },
      { id: 'm2', q: 'Simplify: 3/4 + 1/4 = ?', choices: ['1/2','1','3/4','4/4'], correct: 1 },
      { id: 'm3', q: 'Find the value of x: 2x + 4 = 10', choices: ['3','2','4','6'], correct: 0 },
      { id: 's1', q: 'Water boils at what temperature at sea level?', choices: ['50°C','100°C','150°C','212°C'], correct: 1 },
      { id: 's2', q: 'Which gas do plants absorb from the air?', choices: ['Oxygen','Carbon dioxide','Nitrogen','Hydrogen'], correct: 1 },
      { id: 's3', q: 'Force is measured in?', choices: ['Joules','Watts','Newtons','Pascals'], correct: 2 },
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0,3);
    setDailyQs(shuffled);
    setDailyAns({});
    setDailyScore(null);
    setDailyActive(true);
  };

  // Compute active XP multiplier (e.g., Double XP boosts) and prune expired boosts
  const getActiveXPMultiplier = () => {
    const boosts = Array.isArray(studentProgress?.boosts) ? studentProgress.boosts : [];
    const now = Date.now();
    const active = boosts.filter(b => !b.expiresAt || b.expiresAt > now);
    // If any boost expired, prune it
    if (active.length !== boosts.length) {
      setMeta({ boosts: active });
    }
    // Double XP boost id
    const hasDouble = active.some(b => b.id === 'double-xp-1h');
    return hasDouble ? 2 : 1;
  };

  const submitDaily = () => {
    // Require all answered
    if (dailyQs.some((q) => dailyAns[q.id] === undefined)) return;
    const score = dailyQs.reduce((acc, q) => acc + (dailyAns[q.id] === q.correct ? 1 : 0), 0);
    setDailyScore(score);
    const today = todayStr();
    const mult = getActiveXPMultiplier(); // currently not applied to leaderboard model
    if (studentProgress?.dailyChallengeDate !== today) {
      const prevDate = studentProgress?.dailyChallengeDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0,10);
      const prevStreak = studentProgress?.streak || 0;
      const newStreak = prevDate === yStr ? Math.max(1, prevStreak + 1) : 1;
      // Persist only canonical fields used by XP model
      setMeta({
        dailyChallengeDate: today,
        streak: newStreak,
      });
      // Award quiz progress for Science (counts towards XP)
      try {
        const curr = studentProgress?.science?.quizzes || 0;
        const next = Math.min(100, curr + 1);
        updateProgress('science', { quizzes: next });
      } catch {}
      // Compute gained XP consistent with leaderboard model: quizzes(+25) + streakDelta*20
      const streakDelta = Math.max(0, newStreak - prevStreak);
      const gainedXP = 25 + (streakDelta * 20);
      pushRecent('⚡', `Completed daily challenge (${score}/3) +${gainedXP} XP`);
    }
    setDailyDone(true);
    setDailyActive(false);
    // pushRecent already added above when first completion today
  };
  const writeProgressLS = (obj) => {
    if (!progressKey) return;
    localStorage.setItem(progressKey, JSON.stringify(obj));
  };

  const recentKey = useMemo(() => (
    progressKey ? `ach_recent_${progressKey.replace('student_progress_','')}` : null
  ), [progressKey]);
  const pushRecent = (icon, text) => {
    if (!recentKey) return;
    try {
      const arr = JSON.parse(localStorage.getItem(recentKey) || '[]');
      arr.unshift({ icon, text, ts: Date.now() });
      localStorage.setItem(recentKey, JSON.stringify(arr.slice(0, 20)));
    } catch {}
  };

  const todayStr = () => new Date().toISOString().slice(0,10);

  // Get all registered students' data from localStorage
  const getAllStudentsData = () => {
    const studentsData = [];
    const subjects = ['science', 'technology', 'mathematics'];
    
    // Get all localStorage keys that start with 'student_progress_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('student_progress_')) {
        try {
          const userKey = key.replace('student_progress_', '');
          const progressData = JSON.parse(localStorage.getItem(key));
          
          // Get user info from localStorage or use email as name
          const userInfo = JSON.parse(localStorage.getItem(`user_info_${userKey}`)) || {};
          const studentName = userInfo.full_name || userInfo.name || userKey.split('@')[0] || 'Student';
          const studentClass = userInfo.class || '6'; // Default class
          
          // Calculate badges based on progress
          const getBadge = (progress) => {
            const avgScore = (progress.games + progress.quizzes) / 2;
            if (avgScore >= 80) return "Gold";
            if (avgScore >= 60) return "Silver";
            return "Bronze";
          };
          
          const studentData = {
            id: userKey,
            name: studentName,
            class: studentClass,
            email: userKey,
            science: { 
              games: progressData.science?.games || 0, 
              quizzes: progressData.science?.quizzes || 0, 
              badge: getBadge(progressData.science || { games: 0, quizzes: 0 })
            },
            technology: { 
              games: progressData.technology?.games || 0, 
              quizzes: progressData.technology?.quizzes || 0, 
              badge: getBadge(progressData.technology || { games: 0, quizzes: 0 })
            },
            mathematics: { 
              games: progressData.mathematics?.games || 0, 
              quizzes: progressData.mathematics?.quizzes || 0, 
              badge: getBadge(progressData.mathematics || { games: 0, quizzes: 0 })
            }
          };
          
          studentsData.push(studentData);
        } catch (error) {
          console.error('Error parsing student data for key:', key, error);
        }
      }
    }
    
    return studentsData;
  };

  const studentsData = getAllStudentsData();

  const subjects = [
    {
      name: "Science",
      key: "science",
      icon: "🧪",
      gradient: "linear-gradient(135deg, #6b46c1 0%, #7c3aed 100%)",
      description: "Discover the secrets of the universe!",
      gameElements: ['✨','🔭','🧬'],
      funFact: "Did you know? Lightning is 5x hotter than the Sun!\nA single bolt contains 5 billion joules of energy!",
      level: "Apprentice Scientist",
      xp: 150
    },
    {
      name: "Mathematics",
      key: "mathematics",
      icon: "🎯",
      gradient: "linear-gradient(135deg, #7c3aed 0%, #9f7aea 100%)",
      description: "Solve puzzles and unlock the power of numbers!",
      gameElements: ['➗','➕','🌟'],
      funFact: "Math is everywhere - even in video games!\nEvery pixel on your screen uses coordinates!",
      level: "Number Ninja",
      xp: 200
    }
  ];

  const handleSubjectClick = (subjectKey) => {
    const subject = subjects.find(s => s.key === subjectKey);
    // Route Science and Mathematics to their chapter selection pages
    if (subjectKey === 'science') {
      navigate('/lesson/science');
      return;
    }
    if (subjectKey === 'mathematics') {
      navigate('/lesson/math');
      return;
    }
    // Fallback: go to SubjectDetail for other subjects
    navigate(`/subject/${subjectKey}`, {
      state: { class: selectedClass, subject }
    });
  };

  // Determine best resume destination based on user's progress
  const getResumePath = () => {
    try {
      const s = studentProgress || {};
      const sci = (s.science?.games || 0) + (s.science?.quizzes || 0);
      const math = (s.mathematics?.games || 0) + (s.mathematics?.quizzes || 0);
      if (sci === 0 && math === 0) return '/lesson/math';
      return sci >= math ? '/lesson/science' : '/lesson/math';
    } catch {
      return '/lesson/math';
    }
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="home-dashboard">
        <div className="loading-container">
          <motion.div
            className="loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            📚
          </motion.div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`home-dashboard ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Global Navbar is used; no local navbar here */}

      {/* Pixel Sidebar */}
      <motion.aside
        className={`pixel-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 68 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setIsSidebarOpen(v => !v)}
          >
            {isSidebarOpen ? '<<' : '>>'}
          </button>
          {isSidebarOpen && (
            <div className="sidebar-brand">
              <span className="brand-emoji"><Icon name="controller" size={18} /></span>
              <span className="brand-text">Menu</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item nav-home ${location.pathname === '/home' ? 'active' : ''}`} onClick={() => navigate('/home')}>
            <span className="nav-ico"><Icon name="home" /></span>
            <span className="nav-label">Home</span>
          </button>
          <button className={`nav-item nav-quiz ${location.pathname === '/lesson/math' || location.pathname === '/math' ? 'active' : ''}`} onClick={() => navigate('/lesson/math')}>
            <span className="nav-ico"><Icon name="quiz" /></span>
            <span className="nav-label">Quizzes</span>
          </button>
          <button className={`nav-item nav-daily ${(location.pathname === '/home' && location.hash === '#daily-challenge') ? 'active' : ''}`} onClick={() => navigate('/home#daily-challenge')}>
            <span className="nav-ico"><Icon name="bolt" /></span>
            <span className="nav-label">Daily</span>
          </button>
          <button className={`nav-item nav-rewards ${location.pathname === '/rewards' ? 'active' : ''}`} onClick={() => navigate('/rewards')}>
            <span className="nav-ico"><Icon name="gift" /></span>
            <span className="nav-label">Rewards</span>
          </button>
          <button className={`nav-item nav-achievements ${location.pathname === '/achievements' ? 'active' : ''}`} onClick={() => navigate('/achievements')}>
            <span className="nav-ico"><Icon name="trophy" /></span>
            <span className="nav-label">Achievements</span>
          </button>
          <button className={`nav-item nav-leaderboard ${location.pathname === '/leaderboard' ? 'active' : ''}`} onClick={() => navigate('/leaderboard')}>
            <span className="nav-ico"><Icon name="chart" /></span>
            <span className="nav-label">Leaderboard</span>
          </button>
          <button className={`nav-item nav-profile ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <span className="nav-ico"><Icon name="user" /></span>
            <span className="nav-label">Profile</span>
          </button>
          <button className={`nav-item nav-materials ${location.pathname === '/materials' ? 'active' : ''}`} onClick={() => navigate('/materials')}>
            <span className="nav-ico" aria-hidden>📎</span>
            <span className="nav-label">Uploaded Files</span>
          </button>
          <button className={`nav-item nav-notes ${location.pathname === '/notes' ? 'active' : ''}`} onClick={() => navigate('/notes')}>
            <span className="nav-ico"><Icon name="note" /></span>
            <span className="nav-label">Notes</span>
          </button>
          <button className={`nav-item nav-qna ${location.pathname === '/qna' ? 'active' : ''}`} onClick={() => navigate('/qna')}>
            <span className="nav-ico" aria-hidden>💬</span>
            <span className="nav-label">Q&A</span>
          </button>
          <button className={`nav-item nav-pyq ${location.pathname === '/pyq' ? 'active' : ''}`} onClick={() => navigate('/pyq')}>
            <span className="nav-ico" aria-hidden>📚</span>
            <span className="nav-label">PYQ</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="xp-chip">
            <span className="xp-ico"><Icon name="star" /></span>
            <span className="xp-val">{computedTotalXP} XP</span>
          </div>
        </div>

      </motion.aside>

      {/* VIP Hero: Greeting + XP snapshot + Continue CTA */}
      <motion.section
        className="vip-hero glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="vip-hero-inner">
          <div className="vip-hero-left">
            <h2 className="vip-hero-title">{`Welcome${user ? `, ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'}` : ''}`}</h2>
            <p className="vip-hero-sub">Ready to continue your quest?</p>
            {user?.user_metadata?.school && (
              <div className="school-chip" title="Your school">
                🏫 {String(user.user_metadata.school).toUpperCase()}
              </div>
            )}
            <div className="vip-hero-actions">
              <button className="start-btn" onClick={() => navigate(getResumePath())}>
                ▶ Continue Learning
              </button>
              <Link to="/rewards" className="start-btn alt rewards-btn">🏆 Rewards</Link>
            </div>
          </div>
          <div className="vip-hero-right">
            <div className="vip-stat">
              <div className="vip-stat-label">Total XP</div>
              <div className="vip-stat-value">{computedTotalXP}</div>
            </div>
            <div className="vip-stat">
              <div className="vip-stat-label">Streak</div>
              <div className="vip-stat-value">{studentProgress?.streak ?? 0}🔥</div>
            </div>
            <div className="vip-stat">
              <div className="vip-stat-label">Quests</div>
              <div className="vip-stat-value">{studentProgress?.questsCompleted ?? 0}</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions - removed per request */}

      {/* Continue Learning Strip */}
      <motion.section
        className="vip-continue glass-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="continue-inner">
          <div className="continue-info">
            <div className="continue-title">Continue Learning</div>
            <div className="continue-sub">Pick up where you left off</div>
          </div>
          <div className="continue-progress">
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, studentProgress?.lastLessonProgress ?? 0)}%` }} /></div>
            <motion.button
              className="start-btn"
              onClick={() => navigate(getResumePath())}
              ref={resumeBtnRef}
              initial={{ scale: 1 }}
              animate={resumeControls}
            >
              ▶ Resume
            </motion.button>
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="student-section"
      >
            {/* Class Selection */}
            <motion.div 
              className="class-selection glass-card gamified-class-selection"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h3 className="class-selection-title">
                <span className="title-icon">🎯</span>
                Select Your Class
                <span className="title-decoration"></span>
              </h3>
              <div className="dropdown-container">
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="class-dropdown gamified-dropdown"
                >
                  {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                    <option key={grade} value={grade}>Class {grade}</option>
                  ))}
                </select>
                <div className="dropdown-arrow">▼</div>
              </div>
            </motion.div>

            {/* STEM Subject Cards */}
            <motion.div 
              className="subjects-grid"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h2 className="section-title">Choose Your Subject</h2>
              <div className="subjects-container">
                {subjects.map((subject, index) => (
                  <motion.div
                    key={subject.key}
                    className="subject-card glass-card gamified-card"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.08, duration: 0.4 }}
                    whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSubjectClick(subject.key)}
                  >
                    {/* Floating Game Elements removed as requested */}

                    {/* Level and XP Display */}
                    <div className="game-stats">
                      <div className="level-badge">
                        <span className="level-text">{subject.level}</span>
                      </div>
                      <div className="xp-display">
                        <span className="xp-icon">⭐</span>
                        <span className="xp-text">{subject.xp} XP</span>
                      </div>
                    </div>

                    <div className="subject-icon-container">
                      <motion.div 
                        className="subject-icon"
                        whileHover={{ rotate: 360, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                      >
                        {subject.icon}
                      </motion.div>
                    </div>
                    <h3 className="subject-name">{subject.name}</h3>
                    <p className="subject-description">{subject.description}</p>
                    {/* XP rewards info (consistent with leaderboard model): games=+15 XP, quizzes=+25 XP */}
                    <div className="xp-rewards" style={{ display:'flex', gap:12, alignItems:'center', marginTop:6, color:'#c4b5fd', fontSize:13 }}>
                      <span title="Completing a game increases Games% which yields +15 XP in total XP calculation">🎮 Game: +15 XP</span>
                      <span title="Completing a quiz increases Quizzes% which yields +25 XP in total XP calculation">📝 Quiz: +25 XP</span>
                    </div>
                    
                    {/* Fun Fact */}
                    <motion.div 
                      className="fun-fact"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + index * 0.2 }}
                    >
                      <span className="fact-icon">💡</span>
                      <span className="fact-text">{subject.funFact}</span>
                    </motion.div>
                    
                    {/* Progress Bars */}
                    <div className="progress-section">
                      <div className="progress-item">
                        <span>Games</span>
                        <div className="progress-bar">
                          <motion.div 
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${studentProgress && studentProgress[subject.key] ? studentProgress[subject.key].games : 0}%` }}
                            transition={{ delay: 1 + index * 0.1, duration: 1 }}
                          />
                        </div>
                        <span>{studentProgress && studentProgress[subject.key] ? studentProgress[subject.key].games : 0}%</span>
                      </div>
                      <div className="progress-item">
                        <span>Quizzes</span>
                        <div className="progress-bar">
                          <motion.div 
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${studentProgress && studentProgress[subject.key] ? studentProgress[subject.key].quizzes : 0}%` }}
                            transition={{ delay: 1.2 + index * 0.1, duration: 1 }}
                          />
                        </div>
                        <span>{studentProgress && studentProgress[subject.key] ? studentProgress[subject.key].quizzes : 0}%</span>
                      </div>
                    </div>

                    <motion.button 
                      className="start-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Start button clicked for subject:', subject.key);
                        console.log('Current selectedClass:', selectedClass);
                        console.log('About to navigate to:', `/subject/${subject.key}`);
                        handleSubjectClick(subject.key);
                      }}
                      whileHover={{ y: -2, transition: { duration: 0.12, ease: 'easeOut' } }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.8 + index * 0.08, 
                        duration: 0.4,
                        type: "spring",
                        stiffness: 100
                      }}
                    >
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        Start Learning
                      </motion.span>
                      <motion.span
                        className="start-icon"
                        initial={{ rotate: 0 }}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        🚀
                      </motion.span>
                    </motion.button>

                    {/* Join Room Button (opens external Netlify room) */}
                    <motion.button
                      className="start-btn alt join-room-btn"
                      onClick={(e) => openRoom(subject.key, e)}
                      whileHover={{ y: -2, transition: { duration: 0.12, ease: 'easeOut' } }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.95 + index * 0.08,
                        duration: 0.4,
                        type: 'spring',
                        stiffness: 100,
                      }}
                      style={{
                        marginTop: 8,
                        background: 'linear-gradient(135deg, rgba(109,40,217,0.12), rgba(167,139,250,0.10))',
                        border: '1px solid rgba(167, 139, 250, 0.28)',
                        boxShadow: '0 6px 18px rgba(124, 58, 237, 0.18)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: '#ffffff'
                      }}
                    >
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        Join {subject.name} Room
                      </motion.span>
                      <motion.span
                        className="start-icon"
                        initial={{ rotate: 0 }}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        🔗
                      </motion.span>
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Streak section removed as requested */}

            {/* Daily Challenge */}
            <motion.section
              className="vip-daily-challenge glass-card"
              id="daily-challenge"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="challenge-header">
                <div className="challenge-title">Daily Challenge</div>
                <div className="challenge-reward">+45 XP</div>
              </div>
              <p className="challenge-desc">Answer 3 quick questions to keep your streak alive!</p>
              {dailyDone && dailyScore !== null && (
                <div className="challenge-result" style={{ marginBottom: 12 }}>
                  You scored {dailyScore}/3 today. Great job!
                </div>
              )}
              {(dailyActive && dailyQs.length > 0) ? (
                <>
                  <div className="daily-questions" style={{ marginTop: 12 }}>
                    {dailyQs.map((q, qi) => (
                      <div key={q.id} className="daily-question" style={{ marginBottom: 12 }}>
                        <div className="question-text" style={{ fontWeight: 600, marginBottom: 8 }}>{qi + 1}. {q.q}</div>
                        <div className="choices" style={{ display: 'grid', gap: 8 }}>
                          {q.choices.map((choice, idx) => {
                            const selected = dailyAns[q.id] === idx;
                            return (
                              <button
                                key={idx}
                                className={`daily-choice ${selected ? 'selected' : ''}`}
                                onClick={() => setDailyAns(prev => ({ ...prev, [q.id]: idx }))}
                              >
                                <span className="choice-letter">{String.fromCharCode(65 + idx)}.</span>
                                <span className="choice-text">{choice}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="challenge-actions" style={{ marginTop: 8 }}>
                    <button
                      className="start-btn"
                      onClick={submitDaily}
                      disabled={dailyQs.some(q => dailyAns[q.id] === undefined)}
                    >
                      Submit Answers
                    </button>
                    <button
                      className="start-btn alt"
                      onClick={() => { setDailyActive(false); setDailyQs([]); setDailyAns({}); }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="challenge-actions">
                  <button
                    className="start-btn"
                    onClick={() => { handleDailyStart(); pushRecent('⚡','Started daily challenge'); }}
                    disabled={dailyDone}
                  >
                    {dailyDone ? 'Completed' : 'Start'}
                  </button>
                  {/* Skip button removed per request */}
                </div>
              )}
            </motion.section>

            {/* Achievements Carousel */}
            <motion.section
              className="vip-achievements glass-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="achievements-title">Achievements</div>
              <div className="achievements-row">
                {['🎖️', '🏅', '🏆', '💎', '📚', '⚡'].map((a, i) => (
                  <div className="achievement-badge" key={i}>{a}</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Link to="/achievements" className="start-btn alt">View All</Link>
              </div>
            </motion.section>

            {/* Recommendations */}
            <motion.section
              className="vip-recommend glass-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="recommend-title">Recommended Quests</div>
              <div className="recommend-grid">
                {[
                  { title: 'Algebra Basics', to: '/lesson/math' },
                  { title: 'Forces & Motion', to: '/lesson/science' },
                  { title: 'Fractions Mastery', to: '/lesson/math' },
                  { title: 'Circuits 101', to: '/lesson/science' }
                ].map((rec) => (
                  <Link className="recommend-card" to={rec.to} key={rec.title} onClick={() => pushRecent('🧭', `Started ${rec.title}`)}>{rec.title} →</Link>
                ))}
              </div>
            </motion.section>

            {/* Leaderboard Teaser */}
            <motion.section
              className="vip-leaderboard glass-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="leaderboard-title">Leaderboard</div>
              <div className="leaderboard-top">
                {(topPlayers.length ? topPlayers : [
                  { name: 'PlayerOne', xp: 1240 },
                  { name: 'NovaKid', xp: 1180 },
                  { name: 'MathMage', xp: 1100 }
                ]).map((p, i) => (
                  <div className="leaderboard-item" key={p.name}>
                    <span className="lb-rank">
                      {i === 0 && (
                        <img
                          className="lb-badge"
                          src="/badge/24.png"
                          alt="1st place badge"
                          style={{ width: 28, height: 28, objectFit: 'contain', verticalAlign: 'middle', marginRight: 8 }}
                        />
                      )}
                      {i === 1 && (
                        <img
                          className="lb-badge"
                          src="/badge/25.png"
                          alt="2nd place badge"
                          style={{ width: 28, height: 28, objectFit: 'contain', verticalAlign: 'middle', marginRight: 8 }}
                        />
                      )}
                      {i === 2 && (
                        <img
                          className="lb-badge"
                          src="/badge/26.png"
                          alt="3rd place badge"
                          style={{ width: 28, height: 28, objectFit: 'contain', verticalAlign: 'middle', marginRight: 8 }}
                        />
                      )}
                      {i > 2 && `#${i+1}`}
                    </span>
                    <span className="lb-name">{p.name}</span>
                    <span className="lb-xp">{p.xp} XP</span>
                  </div>
                ))}
              </div>
              <Link to="/leaderboard" className="start-btn alt leaderboard-btn" style={{ marginTop: 12 }}>View Full Leaderboard</Link>
            </motion.section>

            {/* Badges System removed per request (Achievements has full page at /achievements) */}
          </motion.div>
        ) : (
          <motion.div
            key="teacher"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="teacher-section"
          >
            <motion.div 
              className="teacher-dashboard"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="teacher-header">
                <h2 className="section-title">Student Progress Reports</h2>
                <button 
                  className="refresh-button"
                  onClick={() => window.location.reload()}
                  title="Refresh student data"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {studentsData.length === 0 ? (
                <div className="no-students-message">
                  <div className="no-students-icon">👥</div>
                  <h3>No Registered Students Yet</h3>
                  <p>Student progress reports will appear here once students register and start learning.</p>
                  <div className="no-students-stats">
                    <div className="stat-item">
                      <span className="stat-number">0</span>
                      <span className="stat-label">Registered Students</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="students-grid">
                  {studentsData.map((student, index) => (
                  <motion.div
                    key={student.id}
                    className="student-card glass-card"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                    whileHover={{ 
                      scale: 1.02, 
                      boxShadow: "0 15px 30px rgba(0,0,0,0.2)" 
                    }}
                  >
                    <div className="student-header">
                      <div className="student-avatar">
                        {student.name.charAt(0)}
                      </div>
                      <div className="student-info">
                        <h3>{student.name}</h3>
                        <span>Class {student.class}</span>
                      </div>
                    </div>
                    
                    <div className="student-subjects">
                      {subjects.map(subject => {
                        const subjectData = student[subject.key];
                        const avgScore = Math.round((subjectData.games + subjectData.quizzes) / 2);
                        return (
                          <div key={subject.key} className="subject-progress">
                            <div className="subject-header">
                              <span className="subject-icon">{subject.icon}</span>
                              <span className="subject-name">{subject.name}</span>
                              <span className={`badge ${subjectData.badge.toLowerCase()}`}>
                                {subjectData.badge}
                              </span>
                            </div>
                            <div className="scores">
                              <div className="score-item">
                                <span>Games: {subjectData.games}%</span>
                              </div>
                              <div className="score-item">
                                <span>Quizzes: {subjectData.quizzes}%</span>
                              </div>
                              <div className="score-item average">
                                <span>Average: {avgScore}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
                </div>
              )}
            </motion.div>
          </motion.div>
          <NetworkStatusIndicator />
        </div>
      );
    }
