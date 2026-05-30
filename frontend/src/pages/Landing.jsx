import React from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  ['🎙️', 'AI Voice Interviewer',    'Natural TTS delivers questions. Candidates respond on camera with full audio/video capture.'],
  ['📡', 'Chunk Streaming',          'Media streamed in real-time — 90%+ captured even on poor connections.'],
  ['🧠', 'Auto Transcription',       'Deepgram STT converts every response to searchable timestamped text.'],
  ['🛡️', 'Integrity Monitoring',    'Real-time face detection and tab-switch tracking with timestamped flags.'],
  ['📊', 'AI Scoring',               'Responses auto-evaluated for communication, clarity, and technical depth.'],
  ['🔄', 'Session Recovery',         'Sessions persist server-side. Candidates resume exactly where they left off.'],
  ['📋', 'Recruiter Dashboard',      'Video + transcript + score in one unified panel. Filter and shortlist at speed.'],
  ['⚡', 'Async Processing',         'SQS + Lambda workers keep UI responsive. Transcription runs in background.'],
];

const STATS = [
  ['10×', 'Faster screening'],
  ['94%', 'Transcript accuracy'],
  ['< 2s', 'Question transition'],
  ['99.9%', 'Session uptime'],
];

export default function Landing() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-logo-dot" />InterviewAI
        </div>
        <div className="nav-actions">
          <button className="nav-pill" onClick={() => nav('/candidate')}>Candidate Portal</button>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/dashboard')}>Recruiter Dashboard →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }} className="page-enter">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 900px 600px at 50% -100px, rgba(201,168,76,.13) 0%, transparent 70%), radial-gradient(ellipse 600px 400px at 80% 80%, rgba(42,107,232,.07) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 100, padding: '6px 16px 6px 8px', fontSize: '.78rem', fontWeight: 500, color: 'var(--gold-dark)', marginBottom: 28 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
          AI-Powered Screening Platform
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem,6vw,5rem)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.0, marginBottom: 22, maxWidth: 820, position: 'relative' }}>
          Screen candidates{' '}
          <em style={{ fontStyle: 'normal', color: 'var(--gold)' }}>10×</em>{' '}
          faster with AI interviews
        </h1>

        <p style={{ fontSize: '1.1rem', fontWeight: 300, color: 'rgba(10,10,15,.6)', maxWidth: 520, lineHeight: 1.7, marginBottom: 44 }}>
          Automated video interviews with real-time transcription, AI scoring, and integrity monitoring — so your team focuses only on the best.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/dashboard')}>Open Recruiter Dashboard</button>
          <button className="btn btn-secondary btn-lg" onClick={() => nav('/candidate')}>Take a Demo Interview</button>
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexWrap: 'wrap' }}>
        {STATS.map(([num, label]) => (
          <div key={label} style={{ flex: '1 1 120px', padding: '26px 24px', textAlign: 'center', borderRight: '1px solid var(--border)', transition: 'var(--transition)', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 5 }}>{num}</div>
            <div style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.5)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section style={{ padding: '72px 40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="section-label">Platform Features</div>
        <div className="section-title" style={{ maxWidth: 460 }}>Everything you need to hire smarter</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 18 }}>
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 26, transition: 'var(--transition)', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-sm)', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: '1.3rem' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 7 }}>{title}</div>
              <div style={{ fontSize: '.85rem', lineHeight: 1.6, color: 'rgba(10,10,15,.5)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '22px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: '.78rem', color: 'rgba(10,10,15,.4)' }}>© 2025 InterviewAI Platform</div>
        <div style={{ display: 'flex', gap: 18 }}>
          {['Docs', 'API', 'Privacy'].map(l => <a key={l} href="#" style={{ fontSize: '.78rem', color: 'rgba(10,10,15,.4)', textDecoration: 'none' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  );
}
