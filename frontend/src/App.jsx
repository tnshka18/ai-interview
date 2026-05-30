import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import './styles/globals.css';

import Landing         from './pages/Landing';
import Dashboard       from './pages/Dashboard';
import CandidateReview from './pages/CandidateReview';
import CreateInterview from './pages/CreateInterview';
import CandidatePortal from './pages/CandidatePortal';
import HardwareCheck   from './pages/HardwareCheck';
import Interview       from './pages/Interview';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/"                          element={<Landing />} />

          {/* Recruiter */}
          <Route path="/dashboard"                 element={<Dashboard />} />
          <Route path="/dashboard/candidate/:id"   element={<CandidateReview />} />
          <Route path="/dashboard/create"          element={<CreateInterview />} />

          {/* Candidate */}
          <Route path="/candidate"                 element={<CandidatePortal />} />
          <Route path="/candidate/hwcheck"         element={<HardwareCheck />} />
          <Route path="/candidate/interview"       element={<Interview />} />

          {/* Fallback */}
          <Route path="*"                          element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
