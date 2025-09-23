import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProgress } from '../contexts/ProgressContext';

// Pixelated CSS styles
const pixelStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  
  .pixel-font {
    font-family: 'Press Start 2P', monospace;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  
  .pixel-element {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  
  .glow-animation {
    animation: glow 2s ease-in-out infinite alternate;
  }
  
  @keyframes glow {
    from { box-shadow: 0 0 5px currentColor; }
    to { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
  }
  
  .pulse-animation {
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .float-animation {
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  .spin-animation {
    animation: spin 4s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .shake-animation {
    animation: shake 0.5s ease-in-out;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .zoom-in {
    animation: zoomIn 0.3s ease-out;
  }
  
  @keyframes zoomIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .pixel-button {
    background: linear-gradient(45deg, #4a90e2, #2c5aa0);
    border: 3px solid #fff;
    box-shadow: 0 0 0 3px #000, inset 0 0 0 3px #fff;
    image-rendering: pixelated;
    transition: all 0.1s ease;
  }
  
  .pixel-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 0 3px #000, inset 0 0 0 3px #fff, 0 0 20px rgba(74, 144, 226, 0.8);
  }
  
  .pixel-button:active {
    transform: scale(0.95);
  }
  
  .starfield {
    animation: twinkle 2s ease-in-out infinite alternate;
  }
  
  @keyframes twinkle {
    0% { opacity: 0.3; }
    100% { opacity: 1; }
  }

  @keyframes fadeOut {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.5); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pixelStyles;
  document.head.appendChild(styleSheet);
}

const SpaceshipQuizGame = () => {
  const { studentProgress, updateProgress } = useProgress();
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [xp, setXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [spaceshipPosition, setSpaceshipPosition] = useState({ x: 400, y: 300 });
  const [asteroids, setAsteroids] = useState([]);
  const [keys, setKeys] = useState({});
  const [spaceshipAnimation, setSpaceshipAnimation] = useState('');
  const [explosions, setExplosions] = useState([]);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const rewardedRef = useRef(false);
  
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  const lastAsteroidSpawn = useRef(0);
  const lastXpGain = useRef(0);

  // Physics questions related to force and laws of motion
  const questions = [
    {
      question: "What is Newton's First Law of Motion?",
      options: [
        "F = ma",
        "An object at rest stays at rest, an object in motion stays in motion",
        "For every action, there is an equal and opposite reaction",
        "Energy cannot be created or destroyed"
      ],
      correct: 1
    },
    {
      question: "What is the formula for force?",
      options: [
        "F = mv",
        "F = ma",
        "F = mgh",
        "F = 1/2mv²"
      ],
      correct: 1
    },
    {
      question: "What is Newton's Second Law of Motion?",
      options: [
        "F = ma",
        "An object at rest stays at rest",
        "For every action, there is an equal and opposite reaction",
        "Energy is conserved"
      ],
      correct: 0
    },
    {
      question: "What is Newton's Third Law of Motion?",
      options: [
        "F = ma",
        "An object at rest stays at rest",
        "For every action, there is an equal and opposite reaction",
        "Energy cannot be created or destroyed"
      ],
      correct: 2
    },
    {
      question: "What is the unit of force?",
      options: [
        "Joule",
        "Newton",
        "Watt",
        "Pascal"
      ],
      correct: 1
    },
    {
      question: "What happens to acceleration when force increases?",
      options: [
        "Acceleration decreases",
        "Acceleration increases",
        "Acceleration stays the same",
        "Acceleration becomes zero"
      ],
      correct: 1
    },
    {
      question: "What is inertia?",
      options: [
        "The tendency of objects to resist changes in motion",
        "The force of gravity",
        "The speed of light",
        "The energy of motion"
      ],
      correct: 0
    },
    {
      question: "What is momentum?",
      options: [
        "p = mv",
        "p = ma",
        "p = mgh",
        "p = 1/2mv²"
      ],
      correct: 0
    }
  ];

  // Award quiz XP (science) on win, persist through ProgressContext (writes to Supabase/localStorage)
  useEffect(() => {
    if (gameWon && !rewardedRef.current) {
      try {
        const curr = studentProgress?.science?.quizzes || 0;
        const next = Math.min(100, curr + 1);
        updateProgress('science', { quizzes: next });
      } catch {}
      rewardedRef.current = true;
    }
  }, [gameWon, studentProgress, updateProgress]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e) => {
    // Block page scrolling when using game controls
    const blockKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Spacebar','w','a','s','d','W','A','S','D'];
    if (blockKeys.includes(e.key)) {
      try { e.preventDefault(); } catch {}
    }
    setKeys(prev => ({ ...prev, [e.key]: true }));
  }, []);

  const handleKeyUp = useCallback((e) => {
    const blockKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Spacebar','w','a','s','d','W','A','S','D'];
    if (blockKeys.includes(e.key)) {
      try { e.preventDefault(); } catch {}
    }
    setKeys(prev => ({ ...prev, [e.key]: false }));
  }, []);

  // Generate random asteroid
  const generateAsteroid = () => {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: // Top
        x = Math.random() * 800;
        y = -50;
        break;
      case 1: // Right
        x = 850;
        y = Math.random() * 600;
        break;
      case 2: // Bottom
        x = Math.random() * 800;
        y = 650;
        break;
      case 3: // Left
        x = -50;
        y = Math.random() * 600;
        break;
    }
    
    return {
      id: Date.now() + Math.random(),
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      size: Math.random() * 40 + 25,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      animationDelay: Math.random() * 2
    };
  };

  // Check collision between spaceship and asteroid
  const checkCollision = (spaceship, asteroid) => {
    const distance = Math.sqrt(
      Math.pow(spaceship.x - asteroid.x, 2) + 
      Math.pow(spaceship.y - asteroid.y, 2)
    );
    return distance < (25 + asteroid.size / 2);
  };

  // Create explosion effect
  const createExplosion = (x, y) => {
    const explosion = {
      id: Date.now() + Math.random(),
      x,
      y,
      particles: Array.from({ length: 8 }, (_, i) => ({
        angle: (i * Math.PI * 2) / 8,
        speed: Math.random() * 3 + 2,
        life: 1
      }))
    };
    setExplosions(prev => [...prev, explosion]);
    
    // Remove explosion after animation
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== explosion.id));
    }, 1000);
  };

  // Start quiz when collision occurs
  const startQuiz = () => {
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setShowQuiz(true);
    setIsPaused(true);
    setSelectedAnswer('');
    setQuizResult(null);
    setSpaceshipAnimation('shake-animation');
    setTimeout(() => setSpaceshipAnimation(''), 500);
  };

  // Handle quiz answer
  const handleQuizAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === currentQuestion.correct;
    setQuizResult(isCorrect);
    
    if (isCorrect) {
      setXp(prev => Math.max(0, prev + 40));
    } else {
      setXp(prev => Math.max(0, prev - 10));
    }
  };

  // Close quiz and resume game
  const closeQuiz = () => {
    setShowQuiz(false);
    setIsPaused(false);
    setCurrentQuestion(null);
    setSelectedAnswer('');
    setQuizResult(null);
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameStarted || isPaused || gameWon || gameLost) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const now = Date.now();
    
    // Update spaceship position based on keys
    setSpaceshipPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) newX -= 5;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) newX += 5;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) newY -= 5;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) newY += 5;
      
      // Keep spaceship within bounds
      newX = Math.max(20, Math.min(780, newX));
      newY = Math.max(20, Math.min(580, newY));
      
      return { x: newX, y: newY };
    });

    // Spawn asteroids more frequently
    if (now - lastAsteroidSpawn.current > 800) {
      setAsteroids(prev => [...prev, generateAsteroid()]);
      lastAsteroidSpawn.current = now;
    }

    // Update asteroids
    setAsteroids(prev => 
      prev.map(asteroid => ({
        ...asteroid,
        x: asteroid.x + asteroid.vx,
        y: asteroid.y + asteroid.vy,
        rotation: asteroid.rotation + asteroid.rotationSpeed
      })).filter(asteroid => 
        asteroid.x > -100 && asteroid.x < 900 && 
        asteroid.y > -100 && asteroid.y < 700
      )
    );

    // Check collisions
    setAsteroids(prev => {
      const newAsteroids = [...prev];
      const spaceship = spaceshipPosition;
      
      for (let i = newAsteroids.length - 1; i >= 0; i--) {
        if (checkCollision(spaceship, newAsteroids[i])) {
          const asteroid = newAsteroids[i];
          createExplosion(asteroid.x, asteroid.y);
          newAsteroids.splice(i, 1);
          setXp(prevXp => Math.max(0, prevXp - 5));
          startQuiz();
          break;
        }
      }
      
      return newAsteroids;
    });

    // Gain XP every second
    if (now - lastXpGain.current > 1000) {
      setXp(prev => prev + 2);
      lastXpGain.current = now;
    }

    // Update timer
    setTimeLeft(prev => {
      const newTime = prev - 0.016; // ~60fps
      if (newTime <= 0) {
        setGameLost(true);
        return 0;
      }
      return newTime;
    });

    // Check win condition
    if (xp >= 100) {
      setGameWon(true);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, isPaused, gameWon, gameLost, keys, spaceshipPosition, xp]);

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameWon(false);
    setGameLost(false);
    setXp(0);
    setTimeLeft(60);
    setSpaceshipPosition({ x: 400, y: 300 });
    setAsteroids([]);
    setIsPaused(false);
    lastAsteroidSpawn.current = Date.now();
    lastXpGain.current = Date.now();
  };

  // Effects
  useEffect(() => {
    // Use non-passive listeners so preventDefault takes effect
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('keyup', handleKeyUp, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { passive: false });
      document.removeEventListener('keyup', handleKeyUp, { passive: false });
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameLoop]);

  return (
    <div className="spaceship-quiz-game pixel-element" style={{ 
      width: '800px', 
      height: '600px', 
      margin: '0 auto',
      position: 'relative',
      backgroundColor: '#000011',
      border: '4px solid #333',
      boxShadow: '0 0 0 2px #fff, 0 0 0 6px #000, 0 0 30px rgba(0, 170, 255, 0.3)',
      overflow: 'hidden',
      imageRendering: 'pixelated'
    }}>
      {/* Game UI */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* XP Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="pixel-font glow-animation" style={{ color: '#00ff00', fontSize: '12px' }}>XP:</span>
          <div className="pixel-element" style={{
            width: '200px',
            height: '20px',
            backgroundColor: '#333',
            border: '3px solid #00ff00',
            borderRadius: '0px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 10px rgba(0, 255, 0, 0.3)'
          }}>
            <div className="pixel-element" style={{
              width: `${Math.min(100, (xp / 100) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00ff00, #00cc00)',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
            }} />
          </div>
          <span className="pixel-font" style={{ color: '#00ff00', fontSize: '10px' }}>{xp}/100</span>
        </div>

        {/* Time Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="pixel-font glow-animation" style={{ color: '#ff6600', fontSize: '12px' }}>Time:</span>
          <div className="pixel-element" style={{
            width: '200px',
            height: '20px',
            backgroundColor: '#333',
            border: '3px solid #ff6600',
            borderRadius: '0px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 10px rgba(255, 102, 0, 0.3)'
          }}>
            <div className="pixel-element" style={{
              width: `${(timeLeft / 60) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ff6600, #ff4400)',
              transition: 'width 0.1s ease',
              boxShadow: '0 0 10px rgba(255, 102, 0, 0.5)'
            }} />
          </div>
          <span className="pixel-font" style={{ color: '#ff6600', fontSize: '10px' }}>{Math.ceil(timeLeft)}s</span>
        </div>
      </div>

      {/* Explosions */}
      {explosions.map(explosion => (
        <div key={explosion.id} style={{
          position: 'absolute',
          left: explosion.x,
          top: explosion.y,
          zIndex: 10
        }}>
          {explosion.particles.map((particle, i) => (
            <div key={i} className="pixel-element" style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              backgroundColor: '#ff6600',
              transform: `translate(${Math.cos(particle.angle) * particle.speed * 10}px, ${Math.sin(particle.angle) * particle.speed * 10}px)`,
              animation: 'fadeOut 1s ease-out forwards',
              boxShadow: '0 0 8px #ff6600'
            }} />
          ))}
        </div>
      ))}

      {/* Spaceship */}
      {gameStarted && (
        <div className={`pixel-element pulse-animation ${spaceshipAnimation}`} style={{
          position: 'absolute',
          left: spaceshipPosition.x - 25,
          top: spaceshipPosition.y - 25,
          width: '50px',
          height: '50px',
          zIndex: 5,
          transform: 'rotate(0deg)',
          filter: 'drop-shadow(0 0 15px rgba(74, 144, 226, 0.9))'
        }}>
          {/* Main hull */}
          <div className="pixel-element" style={{
            position: 'absolute',
            width: '50px',
            height: '50px',
            background: 'linear-gradient(180deg, #5a9fd4, #2c5aa0, #1a3d6b)',
            clipPath: 'polygon(50% 0%, 20% 75%, 35% 85%, 65% 85%, 80% 75%)',
            boxShadow: '0 0 25px rgba(74, 144, 226, 0.9), inset 0 0 20px rgba(255, 255, 255, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            imageRendering: 'pixelated'
          }} />
          
          {/* Wing details */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '8px',
            top: '20px',
            width: '8px',
            height: '15px',
            background: 'linear-gradient(45deg, #3d6db0, #2c5aa0)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            imageRendering: 'pixelated'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            right: '8px',
            top: '20px',
            width: '8px',
            height: '15px',
            background: 'linear-gradient(45deg, #3d6db0, #2c5aa0)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            imageRendering: 'pixelated'
          }} />
          
          {/* Cockpit window */}
          <div className="pixel-element glow-animation" style={{
            position: 'absolute',
            left: '18px',
            top: '12px',
            width: '14px',
            height: '12px',
            background: 'linear-gradient(135deg, #87ceeb, #4682b4, #2c5aa0)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '0px',
            boxShadow: '0 0 15px rgba(135, 206, 235, 1), inset 0 0 8px rgba(255, 255, 255, 0.5)',
            imageRendering: 'pixelated'
          }} />
          
          {/* Hull details */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '22px',
            top: '28px',
            width: '6px',
            height: '8px',
            background: 'linear-gradient(90deg, #4a90e2, #2c5aa0)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            imageRendering: 'pixelated'
          }} />
          
          {/* Engine thrusters */}
          <div className="pixel-element glow-animation" style={{
            position: 'absolute',
            left: '16px',
            top: '38px',
            width: '6px',
            height: '8px',
            background: 'radial-gradient(circle, #ff6b35, #ff4500)',
            borderRadius: '0px',
            boxShadow: '0 0 20px #ff4500',
            imageRendering: 'pixelated'
          }} />
          <div className="pixel-element glow-animation" style={{
            position: 'absolute',
            right: '16px',
            top: '38px',
            width: '6px',
            height: '8px',
            background: 'radial-gradient(circle, #ff6b35, #ff4500)',
            borderRadius: '0px',
            boxShadow: '0 0 20px #ff4500',
            imageRendering: 'pixelated'
          }} />
          
          {/* Engine flame trails */}
          <div className="pixel-element glow-animation" style={{
            position: 'absolute',
            left: '17px',
            top: '46px',
            width: '4px',
            height: '12px',
            background: 'linear-gradient(180deg, #ff6b35, #ff4500, transparent)',
            borderRadius: '0px',
            opacity: 0.9,
            boxShadow: '0 0 12px #ff4500',
            imageRendering: 'pixelated'
          }} />
          <div className="pixel-element glow-animation" style={{
            position: 'absolute',
            right: '17px',
            top: '46px',
            width: '4px',
            height: '12px',
            background: 'linear-gradient(180deg, #ff6b35, #ff4500, transparent)',
            borderRadius: '0px',
            opacity: 0.9,
            boxShadow: '0 0 12px #ff4500',
            imageRendering: 'pixelated'
          }} />
        </div>
      )}

      {/* Asteroids */}
      {asteroids.map(asteroid => (
        <div
          key={asteroid.id}
          className="pixel-element spin-animation"
          style={{
            position: 'absolute',
            left: asteroid.x - asteroid.size / 2,
            top: asteroid.y - asteroid.size / 2,
            width: asteroid.size,
            height: asteroid.size,
            zIndex: 3,
            transform: `rotate(${asteroid.rotation}rad)`,
            animationDelay: `${asteroid.animationDelay}s`,
            filter: 'drop-shadow(0 0 5px rgba(139, 115, 85, 0.8))'
          }}
        >
          {/* Main asteroid body */}
          <div className="pixel-element" style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 25% 25%, #a68b5b, #8b7355, #5d4e37, #3d2f1f, #2a1f15)',
            borderRadius: '0px',
            boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.8), inset 10px 10px 20px rgba(255,255,255,0.15)',
            border: '2px solid rgba(139, 115, 85, 0.9)',
            imageRendering: 'pixelated'
          }} />
          
          {/* Large crater */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '15%',
            top: '20%',
            width: '25%',
            height: '25%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.8), rgba(42,31,21,0.6), transparent)',
            borderRadius: '0px',
            boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.9)'
          }} />
          
          {/* Medium craters */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '65%',
            top: '55%',
            width: '18%',
            height: '18%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.7), rgba(42,31,21,0.5), transparent)',
            borderRadius: '0px',
            boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.8)'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '70%',
            top: '15%',
            width: '15%',
            height: '15%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.6), rgba(42,31,21,0.4), transparent)',
            borderRadius: '0px',
            boxShadow: 'inset -2px -2px 5px rgba(0,0,0,0.7)'
          }} />
          
          {/* Small craters */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '45%',
            top: '35%',
            width: '8%',
            height: '8%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.5), transparent)',
            borderRadius: '0px'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '30%',
            top: '70%',
            width: '6%',
            height: '6%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.4), transparent)',
            borderRadius: '0px'
          }} />
          
          {/* Rock formations */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '50%',
            top: '10%',
            width: '12%',
            height: '8%',
            background: 'linear-gradient(45deg, #6b5a47, #4a3d2f)',
            border: '1px solid rgba(139, 115, 85, 0.6)',
            borderRadius: '0px'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '10%',
            top: '60%',
            width: '10%',
            height: '6%',
            background: 'linear-gradient(45deg, #6b5a47, #4a3d2f)',
            border: '1px solid rgba(139, 115, 85, 0.6)',
            borderRadius: '0px'
          }} />
          
          {/* Surface texture details */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '35%',
            top: '50%',
            width: '4px',
            height: '4px',
            background: '#4a3d2f',
            borderRadius: '0px'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '55%',
            top: '75%',
            width: '3px',
            height: '3px',
            background: '#4a3d2f',
            borderRadius: '0px'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '75%',
            top: '40%',
            width: '3px',
            height: '3px',
            background: '#4a3d2f',
            borderRadius: '0px'
          }} />
          
          {/* Highlight areas */}
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '20%',
            top: '15%',
            width: '25%',
            height: '25%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent)',
            borderRadius: '0px'
          }} />
          <div className="pixel-element" style={{
            position: 'absolute',
            left: '60%',
            top: '30%',
            width: '15%',
            height: '15%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)',
            borderRadius: '0px'
          }} />
        </div>
      ))}

      {/* Stars background */}
      {[...Array(100)].map((_, i) => (
        <div
          key={i}
          className="pixel-element starfield"
          style={{
            position: 'absolute',
            left: Math.random() * 800,
            top: Math.random() * 600,
            width: i % 5 === 0 ? '3px' : '2px',
            height: i % 5 === 0 ? '3px' : '2px',
            backgroundColor: i % 10 === 0 ? '#00aaff' : i % 7 === 0 ? '#ffaa00' : '#fff',
            borderRadius: '0px',
            zIndex: 1,
            animationDelay: `${Math.random() * 2}s`,
            boxShadow: i % 5 === 0 ? '0 0 8px currentColor' : '0 0 4px currentColor'
          }}
        />
      ))}

      {/* Start Screen */}
      {!gameStarted && !gameWon && !gameLost && (
        <div className="zoom-in" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20,
          color: '#fff',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 170, 255, 0.1), transparent)'
        }}>
          <h1 className="pixel-font glow-animation float-animation" style={{ fontSize: '24px', marginBottom: '20px', color: '#00aaff', textShadow: '0 0 20px #00aaff' }}>SPACESHIP QUIZ GAME</h1>
          <p className="pixel-font" style={{ fontSize: '12px', marginBottom: '30px', textAlign: 'center', lineHeight: '20px', color: '#ccc' }}>
            FLY YOUR SPACESHIP AND COLLECT 100 XP IN 60 SECONDS!<br/>
            GAIN 2 XP PER SECOND, AVOID ASTEROIDS OR ANSWER PHYSICS QUESTIONS TO CONTINUE.
          </p>
          <p className="pixel-font" style={{ fontSize: '10px', marginBottom: '20px', color: '#888' }}>
            CONTROLS: ARROW KEYS OR WASD
          </p>
          <button
            onClick={startGame}
            className="pixel-button pixel-font pulse-animation"
            style={{
              padding: '15px 30px',
              fontSize: '14px',
              backgroundColor: '#00aaff',
              color: '#fff',
              border: '3px solid #fff',
              borderRadius: '0px',
              cursor: 'pointer',
              boxShadow: '0 0 0 3px #000, inset 0 0 0 3px #fff'
            }}
          >
            START GAME
          </button>
        </div>
      )}

      {/* Win Screen */}
      {gameWon && (
        <div className="zoom-in" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20,
          color: '#00ff00',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 0, 0.1), transparent)'
        }}>
          <h1 className="pixel-font glow-animation float-animation" style={{ fontSize: '28px', marginBottom: '20px', textShadow: '0 0 20px #00ff00' }}>CONGRATULATIONS!</h1>
          <p className="pixel-font pulse-animation" style={{ fontSize: '16px', marginBottom: '30px' }}>YOU DISCOVERED A NEW PLANET!</p>
          <p className="pixel-font" style={{ fontSize: '12px', marginBottom: '30px', color: '#ccc' }}>
            YOU SUCCESSFULLY GAINED 100 XP IN {Math.ceil(60 - timeLeft)} SECONDS!
          </p>
          <button
            onClick={startGame}
            className="pixel-button pixel-font pulse-animation"
            style={{
              padding: '15px 30px',
              fontSize: '14px',
              backgroundColor: '#00ff00',
              color: '#000',
              border: '3px solid #fff',
              borderRadius: '0px',
              cursor: 'pointer',
              boxShadow: '0 0 0 3px #000, inset 0 0 0 3px #fff'
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* Lose Screen */}
      {gameLost && (
        <div className="zoom-in shake-animation" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20,
          color: '#ff4444',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 68, 68, 0.1), transparent)'
        }}>
          <h1 className="pixel-font glow-animation float-animation" style={{ fontSize: '28px', marginBottom: '20px', textShadow: '0 0 20px #ff4444' }}>GAME OVER!</h1>
          <p className="pixel-font pulse-animation" style={{ fontSize: '16px', marginBottom: '30px' }}>YOU LOST THE GAME!</p>
          <p className="pixel-font" style={{ fontSize: '12px', marginBottom: '30px', color: '#ccc' }}>
            YOU ONLY GAINED {xp} XP. YOU NEED 100 XP TO WIN!
          </p>
          <button
            onClick={startGame}
            className="pixel-button pixel-font pulse-animation"
            style={{
              padding: '15px 30px',
              fontSize: '14px',
              backgroundColor: '#ff4444',
              color: '#fff',
              border: '3px solid #fff',
              borderRadius: '0px',
              cursor: 'pointer',
              boxShadow: '0 0 0 3px #000, inset 0 0 0 3px #fff'
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuiz && (
        <div className="zoom-in" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 30
        }}>
          <div className="pixel-element" style={{
            backgroundColor: '#222',
            padding: '40px',
            margin: '40px',
            borderRadius: '0px',
            maxWidth: '480px',
            width: '85%',
            color: '#fff',
            border: '4px solid #00aaff',
            boxShadow: '0 0 0 2px #fff, 0 0 0 6px #000, 0 0 30px rgba(0, 170, 255, 0.5)'
          }}>
            <h2 className="pixel-font glow-animation" style={{ marginBottom: '20px', color: '#00aaff', fontSize: '16px' }}>
              PHYSICS QUESTION - FORCE & MOTION
            </h2>
            <p className="pixel-font" style={{ fontSize: '14px', marginBottom: '20px', lineHeight: '20px' }}>
              {currentQuestion?.question}
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              {currentQuestion?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleQuizAnswer(index)}
                  disabled={selectedAnswer !== ''}
                  className="pixel-button pixel-font"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: selectedAnswer === index 
                      ? (quizResult ? '#00ff00' : '#ff4444')
                      : '#444',
                    color: '#fff',
                    border: '3px solid #fff',
                    borderRadius: '0px',
                    cursor: selectedAnswer === '' ? 'pointer' : 'default',
                    fontSize: '12px',
                    boxShadow: '0 0 0 3px #000, inset 0 0 0 3px #fff'
                  }}
                >
                  {String.fromCharCode(65 + index)}. {option.toUpperCase()}
                </button>
              ))}
            </div>

            {quizResult !== null && (
              <div className="zoom-in" style={{ marginBottom: '20px' }}>
                <p className="pixel-font glow-animation" style={{ 
                  color: quizResult ? '#00ff00' : '#ff4444',
                  fontSize: '14px',
                  textShadow: quizResult ? '0 0 10px #00ff00' : '0 0 10px #ff4444'
                }}>
                  {quizResult ? 'CORRECT! +40 XP' : 'WRONG! -10 XP'}
                </p>
              </div>
            )}

            <button
              onClick={closeQuiz}
              className="pixel-button pixel-font pulse-animation"
              style={{
                padding: '10px 20px',
                fontSize: '12px',
                backgroundColor: '#00aaff',
                color: '#fff',
                border: '3px solid #fff',
                borderRadius: '0px',
                cursor: 'pointer',
                boxShadow: '0 0 0 3px #000, inset 0 0 0 3px #fff'
              }}
            >
              CONTINUE GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceshipQuizGame;