import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Nav({ variant = 'recruiter' }) {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => nav('/')}>
        <span className="nav-logo-dot" />
        InterviewAI
      </div>
      <div className="nav-actions">
        {variant === 'recruiter' ? (
          <>
            <span className="nav-pill" style={{ cursor: 'default', pointerEvents: 'none' }}>
              Recruiter Portal
            </span>
            {loc.pathname !== '/dashboard' && (
              <button className="btn btn-outline btn-sm" onClick={() => nav('/dashboard')}>
                Dashboard
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => nav('/dashboard/create')}>
              + New Interview
            </button>
          </>
        ) : (
          <>
            <span className="nav-pill" style={{ cursor: 'default', pointerEvents: 'none' }}>
              Candidate Portal
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => nav('/')}>
              ← Home
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
