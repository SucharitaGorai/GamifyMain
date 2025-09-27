import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const { signIn, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authError, setAuthError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Real-time validation
    const newErrors = { ...errors };
    if (name === 'email') {
      if (!value) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(value)) {
        newErrors.email = 'Please enter a valid email';
      } else {
        delete newErrors.email;
      }
    }
    if (name === 'password') {
      if (!value) {
        newErrors.password = 'Password is required';
      } else if (value.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else {
        delete newErrors.password;
      }
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    // Validate all fields
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        setShowSuccess(true);
        console.log('Login successful:', result);
        
        // Hide success animation and redirect after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
          const role = result?.user?.user_metadata?.role || 'student';
          navigate(role === 'teacher' ? '/teacher-home' : '/home');
        }, 2000);
      } else {
        setAuthError(result.error || 'Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    try {
      console.log('[Login/src] mounted');
      const v = videoRef.current;
      const c = containerRef.current;
      const content = contentRef.current;
      if (v) {
        const cs = window.getComputedStyle(v);
        console.log('[Login/src] video el ok', {
          readyState: v.readyState,
          paused: v.paused,
          muted: v.muted,
          width: v.videoWidth,
          height: v.videoHeight,
          styleZ: cs.zIndex,
          stylePos: cs.position,
        });
      }
      if (c) {
        const cs = window.getComputedStyle(c);
        console.log('[Login/src] container styles', { bg: cs.background, z: cs.zIndex, pos: cs.position });
      }
      if (content) {
        const cs = window.getComputedStyle(content);
        console.log('[Login/src] content styles', { z: cs.zIndex, pos: cs.position });
      }
    } catch (e) { console.warn('[Login/src] debug error', e); }
  }, []);

  const handleVideoLoaded = () => {
    const v = videoRef.current;
    if (v) {
      console.log('[Login/src] video loaded', { w: v.videoWidth, h: v.videoHeight, readyState: v.readyState });
      try { const p = v.play(); if (p && typeof p.catch === 'function') p.catch(()=>{}); } catch(_) {}
    }
  };

  const handleVideoError = (e) => {
    console.error('[Login/src] video error', e?.target?.error || e);
  };

  return (
    <div className="student-container" ref={containerRef}>
      {/* Background Video */}
      <div className="video-background">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="background-video"
          ref={videoRef}
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          poster={'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231a0b2e"/><stop offset="50%" stop-color="%230f3460"/><stop offset="100%" stop-color="%237209b7"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/></svg>'}
        >
          <source src="/login.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay"></div>
      </div>
      {/* Animated Background */}
      <div className="student-bg">
        <div className="floating-books">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="floating-book" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}>
              <div className="book-icon">📚</div>
            </div>
          ))}
        </div>
        <div className="floating-pencils">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="floating-pencil" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${6 + Math.random() * 3}s`
            }}>
              <div className="pencil-icon">✏️</div>
            </div>
          ))}
        </div>
        <div className="floating-graduation-caps">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="floating-cap" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${10 + Math.random() * 5}s`
            }}>
              <div className="cap-icon">🎓</div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className="success-animation">
          <div className="success-checkmark">
            <div className="checkmark">✓</div>
            <div className="graduation-cap">🎓</div>
          </div>
          <div className="confetti">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#6b46c1', '#7c3aed', '#9f7aea', '#a78bfa', '#c084fc'][Math.floor(Math.random() * 5)]
              }}></div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="student-content" ref={contentRef}>
        {/* Educational Logo */}
        <div className="education-logo">
          <div className="book-stack">
            <div className="book book-1">📖</div>
            <div className="book book-2">📕</div>
            <div className="book book-3">📗</div>
          </div>
          <div className="glow-effect"></div>
        </div>
        {/* Login Form */}
        <div className="student-form-container">
          <div className="form-card">
            <form className="student-form" onSubmit={handleSubmit}>
              <h1 className="student-title">
                <span className="title-text">Student/Teacher Login</span>
                <div className="title-glow"></div>
              </h1>
              {!isSupabaseConfigured && (
                <div className="demo-notice">
                  <p>🔧 Demo Mode: Supabase not configured. Using simulation.</p>
                </div>
              )}
              {authError && (
                <div className="auth-error">
                  <p>❌ {authError}</p>
                </div>
              )}
              <div className="input-group">
                <label className="student-label">Email Address</label>
                <div className="input-container">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`student-input ${errors.email ? 'error' : ''}`}
                    placeholder="Enter your email address"
                    required
                  />
                  <div className="input-icon">📧</div>
                  {!errors.email && formData.email && validateEmail(formData.email) && (
                    <div className="validation-icon success">✅</div>
                  )}
                </div>
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              <div className="input-group">
                <label className="student-label">Password</label>
                <div className="input-container">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`student-input ${errors.password ? 'error' : ''}`}
                    placeholder="Enter your password"
                    required
                  />
                  <div className="input-icon">🔒</div>
                  {!errors.password && formData.password && formData.password.length >= 6 && (
                    <div className="validation-icon success">✅</div>
                  )}
                </div>
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>
              <button 
                type="submit" 
                className={`student-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                <span className="button-text">
                  {isLoading ? 'Signing In...' : 'Login'}
                </span>
              </button>
              <div className="form-footer">
                <Link to="/signup" className="student-link">
                  <span className="link-text">New here? Create Account</span>
                  <div className="link-underline"></div>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
