import React from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';

const FAQS = [
  ['What if I lose connection?',     'Your session is automatically saved. You can rejoin and resume from where you left off within 30 minutes.'],
  ["Can I re-record an answer?",     "No — each question is recorded once. Take a moment to gather your thoughts before pressing Record."],
  ['Who reviews my interview?',      'Your responses are first evaluated by AI, then reviewed by a human recruiter before any hiring decision.'],
  ['Is my data secure?',             'All recordings are encrypted in transit and at rest. Only authorised recruiter accounts can access your interview.'],
];

export default function CandidatePortal() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav variant="candidate" />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 80px', width: '100%' }} className="page-enter">
        <div style={{ marginBottom: 44 }}>
          <div className="section-label">Candidate Portal</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 12 }}>
            Welcome to your interview
          </h2>
          <p style={{ fontSize: '.93rem', color: 'rgba(10,10,15,.5)', lineHeight: 1.7 }}>
            Complete your automated screening interview below. Your session is recorded and reviewed by the recruiter. Please ensure you are in a quiet, well-lit environment.
          </p>
        </div>

        {/* Job card */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>💼</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.02rem' }}>Senior Frontend Engineer</div>
              <div style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>InterviewAI Demo · 5 questions · ~25 mins</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
            {[['5','Questions'],['3 min','Per answer'],['AI','Transcribed']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: '.7rem', color: 'rgba(10,10,15,.4)' }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '.82rem', lineHeight: 1.75, color: 'rgba(10,10,15,.55)', marginBottom: 22 }}>
            <strong style={{ color: 'var(--ink)' }}>Before you begin:</strong><br />
            · Ensure camera and microphone permissions are granted<br />
            · Find a quiet space with good lighting<br />
            · You'll have 3 minutes per question<br />
            · Your session is auto-saved — you can reconnect if disconnected
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => nav('/candidate/hwcheck')}>
            Start Hardware Check →
          </button>
        </div>

        {/* FAQ */}
        <div className="card" style={{ background: 'var(--surface)' }}>
          <div className="card-title" style={{ marginBottom: 18 }}>❓ Frequently Asked Questions</div>
          {FAQS.map(([q, a]) => (
            <div key={q} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: '.86rem', marginBottom: 5 }}>{q}</div>
              <div style={{ fontSize: '.82rem', color: 'rgba(10,10,15,.5)', lineHeight: 1.65 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
