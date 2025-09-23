// src/pages/Chapter8Lesson.jsx
import React, { useState, useEffect } from "react";
import { loadLocalProgress, saveLocalProgress, enqueueSync } from "../stores/localProgress";
import BalancedUnbalanced from "../components/BalancedUnbalanced";
import CaromCoinGame from "../components/CaromCoinGame";
import PushBallChallenge from "../components/PushBallChallenge";
import TwoBallsNewton from "../components/TwoBallsNewton";
//import CatchGame from "../components/CatchGame";
import LawsOfMotionGame from "../components/LawsOfMotionGame";
import MomentumSimulator from "../components/MomentumSimulator";
import SpaceshipGame from "../components/SpaceshipGame";
import SnakeLadderQuiz from "../components/SnakeLadderQuiz";
import Shooter from "../components/Shooter";
import MotionSimulatorGame from "../components/MotionSimulatorGame";
import SpaceshipQuizGame from "../components/SpaceshipQuizGame";
import "./ForceLawsOfMotionNotes.css";

// Inline quiz used inside each concept section
function ConceptQuiz({ questions, conceptKey, onComplete }) {
  const [responses, setResponses] = useState(Array(questions.length).fill(null));
  const [showScore, setShowScore] = useState(false);
  const [quizAttempted, setQuizAttempted] = useState(false);
  const profile = JSON.parse(localStorage.getItem("gamify_profile") || "{}");
  const studentId = profile.id || "local_demo";

  useEffect(() => {
    const local = loadLocalProgress();
    const existing = local[studentId] || { results: [] };
    const hasAttempted = existing.results.some((r) => r.topic === `ch8_quiz_${conceptKey}`);
    setQuizAttempted(hasAttempted);
  }, [conceptKey, studentId]);

  const score = responses.filter((r, i) => r === questions[i].answer).length;

  const handleSubmit = () => {
    if (quizAttempted) return;
    setShowScore(true);

    const finalScore = score;
    const totalQuestions = questions.length;
    const pointsEarned = finalScore * 5;

    const local = loadLocalProgress();
    const existing = local[studentId] || { name: profile.name || "Demo", results: [], points: 0 };

    if (!existing.results.some((r) => r.topic === `ch8_quiz_${conceptKey}`)) {
      existing.results.push({
        topic: `ch8_quiz_${conceptKey}`,
        score: finalScore,
        total: totalQuestions,
        timestamp: new Date().toISOString(),
      });
      existing.points = (existing.points || 0) + pointsEarned;
      saveLocalProgress(studentId, existing);
      enqueueSync({
        student_id: studentId,
        topic: `ch8_quiz_${conceptKey}`,
        score: finalScore,
        timestamp: new Date().toISOString(),
        total: totalQuestions,
      });
      onComplete(conceptKey, pointsEarned);
      setQuizAttempted(true);
    }
  };

  return (
    <div className="quiz" style={{ 
      position: "relative", 
      overflow: "hidden", 
      background: "rgba(52, 152, 219, 0.1)",
      border: "2px solid rgba(52, 152, 219, 0.4)",
      borderRadius: "8px",
      padding: "15px",
      marginTop: "20px",
      boxShadow: "0 0 15px rgba(52, 152, 219, 0.3)",
      animation: "pixelGlow 3s ease-in-out infinite" 
    }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent)",
          animation: "shimmer 3s infinite"
        }}
      />
      <h3 className="quiz__title pixel-text pixel-glow" style={{
        fontSize: "1.1rem",
        color: "#3498db",
        textShadow: "0 0 8px rgba(52, 152, 219, 0.8), 1px 1px 0px #1e3a8a",
        textAlign: "center",
        marginBottom: "15px",
        letterSpacing: "1px"
      }}>⚗️ QUIZ CHALLENGE</h3>

      {questions.map((q, i) => (
        <div key={i} className="gl-section" style={{ padding: 12, marginBottom: 12 }}>
          <div className="quiz__q pixel-text" style={{
            fontSize: "0.8rem",
            color: "#ffffff",
            textShadow: "0 0 6px rgba(255,255,255,0.6), 1px 1px 0px #333333",
            marginBottom: "18px",
            letterSpacing: "0.5px",
            lineHeight: "1.3",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            fontWeight: "bold",
            display: "block",
            width: "100%",
            paddingBottom: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.2)"
          }}>{q.q}</div>
          <div className="quiz__grid" style={{ 
            marginTop: "15px", 
            paddingTop: "8px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px"
          }}>
            {q.options.map((opt, j) => (
              <label key={j} className={`quiz__option pixel-text ${quizAttempted ? "quiz__option--disabled" : ""}`} style={{
                fontSize: "0.7rem",
                color: "#cccccc",
                textShadow: "0 0 4px rgba(204,204,204,0.5), 1px 1px 0px #222222",
                letterSpacing: "0.5px",
                cursor: quizAttempted ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                padding: "6px 8px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.1)",
                marginBottom: "2px"
              }}>
                <input
                  type="radio"
                  name={`quiz${conceptKey}${i}`}
                  checked={responses[i] === j}
                  onChange={() => {
                    if (quizAttempted) return;
                    const tmp = responses.slice();
                    tmp[i] = j;
                    setResponses(tmp);
                  }}
                  disabled={quizAttempted}
                  style={{ 
                    accentColor: "#ffde59", 
                    transform: "scale(1.1)",
                    marginRight: "8px",
                    flexShrink: 0
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          onClick={handleSubmit}
          disabled={quizAttempted}
          className={`gl-btn ${quizAttempted ? "gl-btn--disabled" : "gl-btn--primary"}`}
        >
          {quizAttempted ? "✅ QUIZ COMPLETED" : "🚀 SUBMIT QUIZ"}
        </button>
      </div>

      {showScore && (
        <div className="quiz__score">
          <div
            className="pixel-text"
            style={{
              fontSize: "1.2rem",
              color: score === questions.length ? "#27ae60" : "#e67e22",
              textShadow: "1px 1px 0px #2c3e50",
              letterSpacing: "1px",
              textTransform: "uppercase",
              textAlign: "center",
              marginTop: "15px"
            }}
          >
            🎉 SCORE: {score} / {questions.length}{score === questions.length ? " 🏆 PERFECT!" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

const concepts = [
  {
    key: "intro",
    title: "Introduction to Force and Motion",
    icon: "🎯",
    notes: [
      "Force is an interaction (push or pull) that causes change in the state of rest or motion or shape of an object.",
      "Motion requires a cause—a force. Forces can change velocity and can also deform objects.",
      "The effect of force is only observed through its action."
    ],
    quiz: {
      questions: [
        { q: "Which action is NOT caused by a force?", options: ["Changing direction", "Changing shape", "Changing color", "Changing speed"], answer: 2 },
        { q: "What is a force?", options: ["An object", "A push or pull", "A source of energy", "A shape"], answer: 1 }
      ]
    }
  },
  {
    key: "balanced",
    title: "Balanced and Unbalanced Forces",
    icon: "⚖️",
    notes: [
      "Balanced forces are equal and opposite, resulting in no change in motion.",
      "Unbalanced forces are unequal and cause an object to move.",
      "If all forces are balanced, motion remains unchanged."
    ],
    quiz: {
      questions: [
        { q: "What does a balanced force do?", options: ["Starts motion", "Stops motion", "Changes direction", "Does not change motion"], answer: 3 },
        { q: "What causes an object to accelerate?", options: ["Balanced forces", "Unbalanced force", "Friction only", "Gravity only"], answer: 1 }
      ]
    }
  },
  {
    key: "firstlaw",
    title: "Newton's First Law of Motion",
    icon: "🎯",
    notes: [
      "An object remains at rest or in uniform motion unless acted upon by an unbalanced force.",
      "This is called inertia—the natural tendency to resist change.",
      "Mass is a measure of inertia. Heavier objects have greater inertia."
    ],
    quiz: {
      questions: [
        { q: "What is inertia?", options: ["Ability to move fast", "Tendency to resist change in motion", "Ability to change shape", "Force experienced by object"], answer: 1 },
        { q: "Why does a passenger fall forward when a bus stops suddenly?", options: ["Gravity pulls him forward", "Inertia keeps him moving", "Bus accelerates forward", "Force acts backwards"], answer: 1 }
      ]
    }
  },
  {
    key: "secondlaw",
    title: "Newton's Second Law of Motion",
    icon: "🚀",
    notes: [
      "The rate of change of momentum is proportional to the applied force.",
      "Formula: F = ma. SI unit is Newton (N).",
      "Applications: Catching a ball, seat belts in cars."
    ],
    quiz: {
      questions: [
        { q: "Which formula expresses Newton's second law?", options: ["F = m + a", "F = ma", "F = m/a", "F = m - a"], answer: 1 },
        { q: "Why does a player pull hands back while catching a fast ball?", options: ["It increases momentum", "It reduces time of contact", "It reduces force on hands", "It increases stopping force"], answer: 2 }
      ]
    }
  },
  {
    key: "thirdlaw",
    title: "Newton's Third Law of Motion",
    icon: "🔄",
    notes: [
      "For every action, there is an equal and opposite reaction, on different objects.",
      "Examples: Walking, gun recoil, jumping from a boat."
    ],
    quiz: {
      questions: [
        { q: "Newton's Third Law means:", options: ["Forces act in same direction", "Action and reaction cancel", "Equal & opposite forces on different objects", "None"], answer: 2 },
        { q: "What happens if a person jumps from a boat?", options: ["Only person moves forward", "Boat moves backward", "Both move forward", "Nothing"], answer: 1 }
      ]
    }
  },
  {
    key: "momentum",
    title: "Momentum: Definition & Application",
    icon: "💥",
    notes: [
      "Momentum = mass × velocity. It is a vector quantity.",
      "Force acting for a time changes momentum.",
      "Examples: Bullet vs truck momentum."
    ],
    quiz: {
      questions: [
        { q: "What is the formula for momentum?", options: ["mv²", "m/v", "mv", "v/m"], answer: 2 },
        { q: "Which has greater momentum: 0.1 kg ball at 10 m/s or 10 kg stone at rest?", options: ["Ball", "Stone", "Both same", "Can't say"], answer: 0 }
      ]
    }
  }
];

function Particle({ delay, duration }) {
  const isSquare = Math.random() > 0.5;
  const size = Math.random() * 8 + 4;
  const colors = ['#9b59b6', '#8e44ad', '#e74c3c', '#f39c12', '#3498db', '#2ecc71'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <div
      style={{
        position: "fixed",
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: isSquare ? "0" : "50%",
        animation: `pixelFloat ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        zIndex: -1,
        left: `${Math.random() * 100}%`,
        boxShadow: `0 0 ${size}px ${color}`,
        imageRendering: "pixelated"
      }}
    />
  );
}

function PixelGrid() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundImage: `
          linear-gradient(90deg, rgba(155, 89, 182, 0.1) 1px, transparent 1px),
          linear-gradient(rgba(155, 89, 182, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        zIndex: -2,
        animation: "gridPulse 4s ease-in-out infinite"
      }}
    />
  );
}

export default function ForceLawsOfMotionNotes() {
  const [snakeCompleted, setSnakeCompleted] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedConcepts, setCompletedConcepts] = useState({});
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const profile = JSON.parse(localStorage.getItem("gamify_profile") || "{}");
  const studentId = profile.id || "local_demo";
  const [chapterLogged, setChapterLogged] = useState(false);

  useEffect(() => {
    const local = loadLocalProgress();
    const existing = local[studentId] || { points: 0, results: [] };
    setTotalPoints(existing.points || 0);

    const completed = {};
    existing.results.forEach((r) => {
      if (r.topic.startsWith("ch8_quiz_")) {
        const conceptKey = r.topic.replace("ch8_quiz_", "");
        completed[conceptKey] = true;
      }
    });
    setCompletedConcepts(completed);
    setLoading(false);
  }, [studentId]);

  const handleQuizCompletion = (conceptKey, points) => {
    setTotalPoints((prev) => prev + points);
    setCompletedConcepts((prev) => ({ ...prev, [conceptKey]: true }));
  };

  const totalPossiblePoints = concepts.reduce((acc, c) => acc + c.quiz.questions.length * 5, 0);
  const completedConceptsCount = Object.values(completedConcepts).filter(Boolean).length;
  const progressPercent = concepts.length > 0 ? (completedConceptsCount / concepts.length) * 100 : 0;

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      
      @keyframes pixelFloat { 
        0% { transform: translateY(100vh) rotate(0deg) scale(0); opacity: 0;} 
        10% { opacity: 1; transform: translateY(90vh) rotate(36deg) scale(1);} 
        90% { opacity: 1; transform: translateY(10vh) rotate(324deg) scale(1);} 
        100% { transform: translateY(-10vh) rotate(360deg) scale(0); opacity: 0;} 
      }
      @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
      @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
      @keyframes gridPulse { 
        0%, 100% { opacity: 0.1; } 
        50% { opacity: 0.3; } 
      }
      @keyframes pixelGlow {
        0%, 100% { box-shadow: 0 0 10px rgba(155, 89, 182, 0.5); }
        50% { box-shadow: 0 0 30px rgba(155, 89, 182, 0.8), 0 0 50px rgba(142, 68, 173, 0.6); }
      }
      @keyframes retroglow {
        0%, 100% { text-shadow: 0 0 5px #9b59b6, 0 0 10px #8e44ad, 0 0 15px #663399; }
        50% { text-shadow: 0 0 10px #9b59b6, 0 0 20px #8e44ad, 0 0 30px #663399, 0 0 40px #552288; }
      }
      @keyframes textGlow {
        0%, 100% { text-shadow: 0 0 8px currentColor, 0 0 16px currentColor; }
        50% { text-shadow: 0 0 12px currentColor, 0 0 24px currentColor, 0 0 32px currentColor; }
      }
      .pixelated {
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-crisp-edges;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
      .pixel-text {
        font-family: 'Press Start 2P', 'Courier New', monospace !important;
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-crisp-edges;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: none;
        -moz-osx-font-smoothing: grayscale;
        font-smooth: never;
      }
      .pixel-glow {
        animation: textGlow 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh",
        color: "#ffde59", fontSize: "1.5rem", background: "linear-gradient(135deg, #2c1810, #4a148c, #6a1b9a, #8e44ad, #9b59b6)",
        fontFamily: "'Orbitron', 'Comic Sans MS', Arial, sans-serif"
      }}>
        <div style={{
          width: "50px", height: "50px", border: "4px solid rgba(255,222,89,.3)", borderTop: "4px solid #ffde59",
          borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: "20px"
        }} />
        <span className="pixel-text">LOADING PROGRESS...</span>
      </div>
    );
  }

  if (pageIndex === concepts.length) {
    return (
      <div style={{
        fontFamily: "'Orbitron', 'Comic Sans MS', Arial, sans-serif",
        background: "linear-gradient(135deg, #2c1810, #4a148c, #6a1b9a, #8e44ad, #9b59b6)",
        padding: "40px 0", minHeight: "100vh", color: "white", textAlign: "center", position: "relative", overflow: "hidden"
      }}>
        <PixelGrid />
        {[...Array(30)].map((_, i) => (
          <Particle key={i} delay={i * 0.4} duration={15 + Math.random() * 10} />
        ))}
        <div className="gl-card" style={{
        background: "rgba(20, 20, 40, 0.9)",
        backdropFilter: "blur(10px)",
        border: "2px solid rgba(155, 89, 182, 0.3)",
        borderRadius: "15px",
        boxShadow: "0 0 30px rgba(155, 89, 182, 0.4), inset 0 0 20px rgba(155, 89, 182, 0.1)",
        animation: "pixelGlow 3s ease-in-out infinite"
      }}>
          <h1 className="gl-title pixel-text pixel-glow" style={{ 
            fontSize: "2rem", 
            color: "#9b59b6",
            textShadow: "0 0 15px rgba(155, 89, 182, 0.8), 2px 2px 0px #4a148c",
            letterSpacing: "3px",
            textTransform: "uppercase"
          }}>🎲 SNAKE & LADDER<br/>QUIZ CHALLENGE</h1>
          <SnakeLadderQuiz onComplete={() => setSnakeCompleted(true)} />
          <button onClick={() => {
            // Log chapter completion once (so it shows under Remote progress)
            if (!chapterLogged) {
              try {
                const local = loadLocalProgress();
                const existing = local[studentId] || { name: profile.name || 'Demo', results: [], points: 0 };
                const already = existing.results.some(r => r.topic === 'chapter8_completed');
                if (!already) {
                  existing.results.push({ topic: 'chapter8_completed', score: totalPoints, total: concepts.length, timestamp: new Date().toISOString() });
                  saveLocalProgress(studentId, existing);
                  enqueueSync({ student_id: studentId, topic: 'chapter8_completed', score: totalPoints, timestamp: new Date().toISOString(), total: concepts.length });
                }
              } catch {}
              setChapterLogged(true);
            }
            setPageIndex(pageIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} className="gl-btn gl-btn--primary" style={{ marginTop: 30 }}>
            🚀 FINISH CHAPTER
          </button>
        </div>
      </div>
    );
  }

  if (pageIndex > concepts.length) {
    return (
      <div style={{
        fontFamily: "'Orbitron', 'Comic Sans MS', Arial, sans-serif",
        background: "linear-gradient(135deg, #2c1810, #4a148c, #6a1b9a, #8e44ad, #9b59b6)",
        padding: "40px 0", minHeight: "100vh", color: "white", textAlign: "center", position: "relative", overflow: "hidden"
      }}>
        <PixelGrid />
        {[...Array(35)].map((_, i) => (
          <Particle key={i} delay={i * 0.2} duration={12 + Math.random() * 8} />
        ))}
        <div className="gl-card" style={{
        background: "rgba(20, 20, 40, 0.9)",
        backdropFilter: "blur(10px)",
        border: "2px solid rgba(155, 89, 182, 0.3)",
        borderRadius: "15px",
        boxShadow: "0 0 30px rgba(155, 89, 182, 0.4), inset 0 0 20px rgba(155, 89, 182, 0.1)",
        animation: "pixelGlow 3s ease-in-out infinite"
      }}>
          <h1 className="pixel-text pixel-glow" style={{ 
            color: "#27ae60", 
            fontSize: "2.5rem", 
            marginBottom: 30, 
            textShadow: "0 0 30px rgba(39,174,96,.8), 3px 3px 0px #1e7e34", 
            letterSpacing: "3px",
            textTransform: "uppercase"
          }}>
            🎉 CONGRATULATIONS!
          </h1>
          <p className="pixel-text" style={{ 
            fontSize: "1rem", 
            marginBottom: 20,
            color: "#ffffff",
            textShadow: "0 0 8px rgba(255,255,255,0.6), 1px 1px 0px #333333",
            letterSpacing: "1px",
            lineHeight: "1.5"
          }}>
            YOU HAVE SUCCESSFULLY COMPLETED<br/><strong>CHAPTER 8: FORCE & LAWS OF MOTION</strong>
          </p>
          {snakeCompleted ? (
            <div style={{ margin: "30px 0" }}>
              <p className="pixel-text pixel-glow" style={{ 
                fontSize: "1.1rem", 
                marginBottom: 15,
                color: "#ffffff",
                textShadow: "0 0 8px rgba(255,255,255,0.6), 1px 1px 0px #333333",
                letterSpacing: "1px"
              }}>
                YOU EARNED THE <span style={{ color: "#ffd700", textShadow: "0 0 20px rgba(255,215,0,.8), 2px 2px 0px #b8860b" }}>GOLD BADGE 🏆</span>!
              </p>
            </div>
          ) : (
            <div style={{ margin: "30px 0" }}>
              <p className="pixel-text pixel-glow" style={{ 
                fontSize: "1.1rem", 
                marginBottom: 15,
                color: "#ffffff",
                textShadow: "0 0 8px rgba(255,255,255,0.6), 1px 1px 0px #333333",
                letterSpacing: "1px"
              }}>
                YOU EARNED A <span style={{ color: "#2980b9", textShadow: "0 0 20px rgba(41,128,185,.8), 2px 2px 0px #1f5582" }}>SCIENCE BADGE 🏅</span>!
              </p>
            </div>
          )}
          <p className="pixel-text" style={{ 
            fontSize: "0.9rem", 
            marginBottom: 30,
            color: "#cccccc",
            textShadow: "0 0 5px rgba(204,204,204,0.5), 1px 1px 0px #222222",
            letterSpacing: "1px",
            lineHeight: "1.4"
          }}>
            COMPLETE ALL 12 CHAPTERS TO UNLOCK MORE <span style={{ color: "#ffd700", textShadow: "0 0 15px rgba(255,215,0,.8), 1px 1px 0px #b8860b" }}>REWARDS</span>
          </p>
          <a href="/" className="gl-btn gl-btn--secondary pixel-text" style={{
            fontSize: "0.9rem",
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}>⬅️ RETURN TO HOME</a>
        </div>
      </div>
    );
  }

  const c = concepts[pageIndex];

  return (
    <div className="gl-page full-bleed" style={{
      background: "#1a0b2e",
      position: "relative",
      minHeight: "100vh",
      fontFamily: "monospace",
      width: "100%",
      margin: 0,
      overflowX: "hidden"
    }}>
      <PixelGrid />
      {[...Array(25)].map((_, i) => (
        <Particle key={i} delay={i * 0.3} duration={12 + Math.random() * 8} />
      ))}

      <div className="gl-card" style={{
        background: "rgba(20, 20, 40, 0.9)",
        backdropFilter: "blur(10px)",
        border: "2px solid rgba(155, 89, 182, 0.3)",
        borderRadius: "15px",
        boxShadow: "0 0 30px rgba(155, 89, 182, 0.4), inset 0 0 20px rgba(155, 89, 182, 0.1)",
        animation: "pixelGlow 3s ease-in-out infinite"
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 className="gl-title pixel-text" style={{
            fontSize: "2.2rem",
            color: "#d946ef",
            textShadow: "2px 2px 0px #7c3aed",
            textTransform: "uppercase",
            letterSpacing: "4px",
            lineHeight: "1.2",
            marginBottom: "10px"
          }}>CHAPTER 8: FORCE & LAWS OF MOTION</h1>
        </div>

        <div className="gl-panel" style={{
          background: "rgba(155, 89, 182, 0.1)",
          border: "1px solid rgba(155, 89, 182, 0.3)",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "30px",
          boxShadow: "inset 0 0 20px rgba(155, 89, 182, 0.2)"
        }}>
          <h3 className="pixel-text pixel-glow" style={{
            color: "#9b59b6",
            fontSize: "1.2rem",
            textShadow: "0 0 10px rgba(155, 89, 182, 0.8), 2px 2px 0px #4a148c",
            marginBottom: "20px",
            letterSpacing: "2px"
          }}>🌟 MY PROGRESS</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 20 }}>
            <div className="pixel-text pixel-glow" style={{ fontSize: "1rem", color: "#00ffe7", textShadow: "0 0 15px rgba(0,255,231,.8), 2px 2px 0px #006666", letterSpacing: "1px" }}>
              CONCEPTS COMPLETED: <strong>{completedConceptsCount} / {concepts.length}</strong>
            </div>
            <div className="pixel-text pixel-glow" style={{ fontSize: "0.9rem", color: "#ffde59", textShadow: "0 0 15px rgba(255,222,89,.8), 2px 2px 0px #b8860b", letterSpacing: "1px" }}>
              POINTS EARNED: <strong>{totalPoints} / {totalPossiblePoints}</strong>
            </div>
          </div>
          <div className="gl-progress">
            <div className="gl-progress__bar" style={{ width: `${progressPercent}%` }} />
            <div className="gl-progress__label pixel-text" style={{
              fontSize: "0.9rem",
              color: "#ffffff",
              textShadow: "0 0 8px rgba(255,255,255,0.8), 1px 1px 0px #333333",
              letterSpacing: "1px"
            }}>{Math.round(progressPercent)}%</div>
          </div>
        </div>

        <div className="gl-section" style={{
          background: "rgba(142, 68, 173, 0.1)",
          border: "2px solid rgba(142, 68, 173, 0.3)",
          borderRadius: "15px",
          padding: "25px",
          marginTop: "20px",
          boxShadow: "0 0 20px rgba(142, 68, 173, 0.3)"
        }}>
          <h2 className="gl-section__title pixel-text" style={{
            fontSize: "1.4rem",
            color: "#e74c3c",
            textShadow: "2px 2px 0px #8b0000",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
            letterSpacing: "2px",
            textTransform: "uppercase"
          }}>
            <span className="icon" style={{ fontSize: "2.5rem" }}>{c.icon}</span>
            <span style={{ flex: 1 }}>{c.title}</span>
            <span className="status" style={{ fontSize: "1.8rem" }}>{completedConcepts[c.key] ? "" : "⏳"}</span>
          </h2>

          <ul className="gl-notes">
            {c.notes.map((note, i) => (
              <li key={i} className="gl-note pixel-text" style={{
                fontSize: "0.8rem",
                color: "#ffffff",
                textShadow: "0 0 5px rgba(255,255,255,0.5), 1px 1px 0px #333333",
                letterSpacing: "1px",
                lineHeight: "1.6",
                marginBottom: "10px"
              }}>{note}</li>
            ))}
          </ul>

          {c.key === "intro" && (
            <>
              {/* Demo Video Section - Only in Introduction */}
              <div className="gl-panel" style={{
                background: "rgba(155, 89, 182, 0.1)",
                border: "2px solid rgba(155, 89, 182, 0.3)",
                borderRadius: "15px",
                padding: "25px",
                marginBottom: "30px",
                boxShadow: "0 0 20px rgba(155, 89, 182, 0.3)",
                animation: "pixelGlow 3s ease-in-out infinite"
              }}>
                <h3 className="pixel-text pixel-glow" style={{
                  color: "#9b59b6",
                  fontSize: "1.2rem",
                  textShadow: "0 0 10px rgba(155, 89, 182, 0.8), 2px 2px 0px #4a148c",
                  marginBottom: "20px",
                  letterSpacing: "2px",
                  textAlign: "center"
                }}>🎬 CHAPTER DEMO VIDEO</h3>
                
                <div style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "800px",
                  margin: "0 auto",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 0 30px rgba(155, 89, 182, 0.4)",
                  border: "3px solid rgba(155, 89, 182, 0.5)"
                }}>
                  <video
                    controls
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      borderRadius: "7px"
                    }}
                    poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23663399'/%3E%3Ctext x='400' y='225' text-anchor='middle' fill='white' font-family='monospace' font-size='24'%3E🎬 Science Demo%3C/text%3E%3C/svg%3E"
                  >
                    <source src="/science.mp4" type="video/mp4" />
                    <p className="pixel-text" style={{
                      color: "#ffffff",
                      textAlign: "center",
                      padding: "20px",
                      fontSize: "0.9rem"
                    }}>
                      Your browser does not support the video tag. Please update your browser to view the demo video.
                    </p>
                  </video>
                </div>
                
                <p className="pixel-text" style={{
                  fontSize: "0.8rem",
                  color: "#cccccc",
                  textAlign: "center",
                  marginTop: "15px",
                  letterSpacing: "1px",
                  lineHeight: "1.4"
                }}>
                  📚 Watch this demo to understand the concepts before starting the interactive lessons!
                </p>
              </div>
              <div style={{ marginBottom: "40px" }}>
                <LawsOfMotionGame />
              </div>
              {/* Insert moved Bonus Game (mid-page) */}
              <div style={{ marginBottom: "24px", background: "#28104a", border: "1px solid #7c3aed", borderRadius: 6, padding: 10 }}>
                <h3 className="pixel-text" style={{ color: "#9b59b6", textAlign: "center", marginBottom: 8 }}>🎮 Bonus Game</h3>
                <div style={{ color: "#c4b5fd", marginBottom: 8, textAlign: "center" }}>
                  Quick reflex challenge: apply force ideas to win! Try for a perfect run.
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <iframe
                    title="Wordwall Bonus Game"
                    src="https://wordwall.net/embed/42724b148fc54195800c8452732e8041?themeId=22&templateId=71&fontStackId=0"
                    style={{ width: "100%", maxWidth: 800, height: 380, border: 0, borderRadius: 6 }}
                    allowFullScreen
                  />
                </div>
              </div>
            </>
          )}
          {c.key === "firstlaw" && (
            <>
              <div style={{ marginBottom: "40px" }}>
                <CaromCoinGame />
              </div>
              <div style={{ marginBottom: "40px" }}>
                <PushBallChallenge />
              </div>
            </>
          )}
          {c.key === "balanced" && (
            <>
              <div style={{ marginBottom: "40px" }}>
                <BalancedUnbalanced />
              </div>
              <div style={{ marginBottom: "40px" }}>
                <SpaceshipQuizGame />
              </div>
            </>
          )}
          {c.key === "secondlaw" && (
            <>
              <div style={{ marginBottom: "40px" }}>
                <TwoBallsNewton />
              </div>
              <div style={{ marginBottom: "40px" }}>
                <MotionSimulatorGame />
              </div>
              {/* Insert moved Bonus Game 2 (mid-page) */}
              <div style={{ marginBottom: "24px", background: "#28104a", border: "1px solid #7c3aed", borderRadius: 6, padding: 10 }}>
                <h3 className="pixel-text" style={{ color: "#9b59b6", textAlign: "center", marginBottom: 8 }}>🎯 Challenge Game</h3>
                <div style={{ color: "#c4b5fd", marginBottom: 8, textAlign: "center" }}>
                  Momentum master! Balance mass and acceleration to score high.
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <iframe
                    title="Wordwall Bonus Game 2"
                    src="https://wordwall.net/embed/ef950fa4eb95459abe38508faac654bc?themeId=1&templateId=3&fontStackId=0"
                    style={{ width: "100%", maxWidth: 800, height: 380, border: 0, borderRadius: 6 }}
                    allowFullScreen
                  />
                </div>
              </div>
            </>
          )}
          {c.key === "momentum" && (
            <div style={{ marginBottom: "40px" }}>
              <MomentumSimulator />
            </div>
          )}
          {c.key === "thirdlaw" && (
            <>
              <div style={{ marginBottom: "40px" }}>
                <SpaceshipGame />
              </div>
              <div style={{ marginBottom: "40px" }}>
                <Shooter />
              </div>
            </>
          )}

          <ConceptQuiz {...c.quiz} conceptKey={c.key} onComplete={handleQuizCompletion} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, gap: 20 }}>
            <button
              onClick={() => {
                setPageIndex(pageIndex - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={pageIndex === 0}
              className={`gl-btn pixel-text ${pageIndex === 0 ? "gl-btn--disabled" : "gl-btn--primary"}`}
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                fontSize: "0.8rem",
                letterSpacing: "1px",
                imageRendering: "pixelated",
                padding: "12px 20px",
                border: "3px solid #2c3e50",
                borderRadius: "8px",
                background: pageIndex === 0 ? "#7f8c8d" : "linear-gradient(135deg, #3498db, #2980b9)",
                color: "#ffffff",
                textShadow: "1px 1px 0px #2c3e50",
                boxShadow: pageIndex === 0 ? "none" : "0 4px 0 #2c3e50, 0 0 15px rgba(52, 152, 219, 0.3)",
                cursor: pageIndex === 0 ? "not-allowed" : "pointer",
                transform: "translateY(0)",
                transition: "all 0.1s ease",
                opacity: pageIndex === 0 ? 0.6 : 1
              }}
              onMouseDown={(e) => {
                if (pageIndex !== 0) e.target.style.transform = "translateY(2px)";
              }}
              onMouseUp={(e) => {
                if (pageIndex !== 0) e.target.style.transform = "translateY(0)";
              }}
              onMouseLeave={(e) => {
                if (pageIndex !== 0) e.target.style.transform = "translateY(0)";
              }}
            >
              ⬅️ BACK
            </button>

            <button
              onClick={() => {
                setPageIndex(pageIndex + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={!completedConcepts[c.key]}
              className={`gl-btn pixel-text ${completedConcepts[c.key] ? "gl-btn--secondary" : "gl-btn--disabled"}`}
              style={{
                fontFamily: "'Press Start 2P', 'Courier New', monospace",
                fontSize: "0.8rem",
                letterSpacing: "1px",
                imageRendering: "pixelated",
                padding: "12px 20px",
                border: "3px solid #2c3e50",
                borderRadius: "8px",
                background: !completedConcepts[c.key] ? "#7f8c8d" : "linear-gradient(135deg, #27ae60, #229954)",
                color: "#ffffff",
                textShadow: "1px 1px 0px #2c3e50",
                boxShadow: !completedConcepts[c.key] ? "none" : "0 4px 0 #2c3e50, 0 0 15px rgba(39, 174, 96, 0.3)",
                cursor: !completedConcepts[c.key] ? "not-allowed" : "pointer",
                transform: "translateY(0)",
                transition: "all 0.1s ease",
                opacity: !completedConcepts[c.key] ? 0.6 : 1
              }}
              onMouseDown={(e) => {
                if (completedConcepts[c.key]) e.target.style.transform = "translateY(2px)";
              }}
              onMouseUp={(e) => {
                if (completedConcepts[c.key]) e.target.style.transform = "translateY(0)";
              }}
              onMouseLeave={(e) => {
                if (completedConcepts[c.key]) e.target.style.transform = "translateY(0)";
              }}
            >
              {pageIndex === concepts.length - 1 ? "🏁 FINISH CHAPTER" : "NEXT ➡️"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}