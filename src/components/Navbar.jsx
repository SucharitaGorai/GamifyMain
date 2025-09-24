import React from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TranslatorWidget from "./TranslatorWidget";
import BackButton from "./BackButton";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const resolveHomePath = () => {
    const role = user?.user_metadata?.role || (function(){
      try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.role } catch { return null; }
    })() || 'student';
    return role === 'teacher' ? '/teacher-home' : '/home';
  };
  // Determine role to conditionally show Teacher link
  const role = user?.user_metadata?.role || (function(){
    try { return JSON.parse(localStorage.getItem('demo_user')||'null')?.user_metadata?.role } catch { return null; }
  })() || 'student';
  const isTeacher = role === 'teacher';
  const homePath = resolveHomePath();
  const isTeacherHomePath = location.pathname === '/teacher-home';
  const isDashboardPath = location.pathname === '/dashboard';
  const isTeacherProgressPath = location.pathname === '/teacher/progress';
  const isTeacherQuizBuilderPath = location.pathname === '/teacher/quiz-builder';
  const isTeacherQuizEvaluationPath = location.pathname === '/teacher/quiz-evaluation';
  const isTeacherGameBuilderPath = location.pathname === '/teacher/game-builder';
  const isQnaPath = location.pathname === '/qna';
  const isMinimal = (
    isDashboardPath ||
    isTeacherProgressPath ||
    isTeacherQuizBuilderPath ||
    isTeacherQuizEvaluationPath ||
    isTeacherGameBuilderPath ||
    isQnaPath
  );
  return (
    <header className="app-navbar">
      <div className="nav-inner">
        <Link to={homePath} className="brand" aria-label="Home" onClick={(e)=>{ e.preventDefault(); navigate(resolveHomePath()); }}>
          <span className="brand-text">Gamify</span>
        </Link>

        {!isMinimal && (
        <nav className="nav-links" aria-label="Primary">
          <NavLink
            to={homePath}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            end
            onClick={(e) => {
              e.preventDefault();
              navigate(resolveHomePath());
            }}
          >
            Home
          </NavLink>
          {!isTeacherHomePath && (
            <>
              <NavLink
                to="/qna"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Q&A
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Profile
              </NavLink>
              <NavLink
                to="/quizzes"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Quizzes
              </NavLink>
              {!isTeacher && (
                <a
                  href="https://career-guide-app-p2yw.onrender.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  title="Open Career Guide in a new tab"
                >
                  Career Guide
                </a>
              )}
              <NavLink
                to="/materials"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Uploaded Files
              </NavLink>
              <NavLink
                to="/games"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Uploaded games
              </NavLink>
            </>
          )}
          {isTeacher && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Teacher
            </NavLink>
          )}
          {isTeacher && !isTeacherHomePath && (
            <NavLink
              to="/teacher/quiz-builder"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Quiz Builder
            </NavLink>
          )}
          {isTeacher && !isTeacherHomePath && (
            <NavLink
              to="/teacher/quiz-evaluation"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Quiz Evaluation
            </NavLink>
          )}
          {isTeacher && (
            <NavLink
              to="/teacher/progress"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Student Progress
            </NavLink>
          )}
        </nav>
        )}

        {isMinimal && (
          <nav className="nav-links" aria-label="Primary">
            <NavLink
              to={homePath}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end
              onClick={(e) => {
                e.preventDefault();
                navigate(resolveHomePath());
              }}
            >
              Home
            </NavLink>
          </nav>
        )}

        {!isMinimal && (
          <div className="nav-actions">
            <BackButton />
            <TranslatorWidget />
            <button
              className="logout-btn"
              title="Logout"
              onClick={async () => {
                try {
                  await signOut();
                } finally {
                  navigate('/login');
                }
              }}
            >
              Logout
            </button>
          </div>
        )}

        {isMinimal && (
          <div className="nav-actions">
            {/* Home already present on the left. Keep Back, language & logout here on the right. */}
            <BackButton />
            <TranslatorWidget />
            <button
              className="logout-btn"
              title="Logout"
              onClick={async () => {
                try {
                  await signOut();
                } finally {
                  navigate('/login');
                }
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
