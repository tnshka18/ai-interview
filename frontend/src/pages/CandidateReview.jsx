import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import Modal from '../components/Modal';
import { getCandidate, shortlistCandidate, rejectCandidate } from '../utils/api';
import { useToast } from '../context/ToastContext';

const MOCK_TRANSCRIPTS = [
  { q: "Tell me about yourself and your most impactful project.", a: "I'm a senior engineer with 7 years of experience in frontend development, primarily working with React and TypeScript. My most impactful project was leading a complete redesign of our checkout flow at Stripe, which reduced cart abandonment by 34% and increased conversion by 19%. I owned the architecture, mentored two junior engineers, and coordinated closely with product and design over a six-month timeline." },
  { q: "Describe a time you solved a complex problem under tight deadlines.", a: "Six months ago, our payment processing pipeline started dropping 3% of transactions during peak load. I had 48 hours to diagnose and fix it before a major product launch. I traced it to a race condition in our async queue handler, implemented a distributed lock using Redis, and deployed a fix with zero downtime. The launch went smoothly." },
  { q: "How do you handle disagreements about technical direction?", a: "I try to separate ego from the decision. I'll clearly articulate my reasoning with data when I have it, actively listen to the other perspective, and then propose a timebox experiment if we're still split. Most technical disagreements are actually about different assumptions, and once those are surfaced, alignment usually follows." },
];
const MOCK_PROCTORING = [
  { time: '00:00', type: 'ok',   icon: '✅', msg: 'Hardware check passed — camera and mic verified' },
  { time: '02:14', type: 'warn', icon: '⚠️', msg: 'Face absent for 4 seconds' },
  { time: '04:32', type: 'warn', icon: '🔄', msg: 'Tab switch detected — returned after 2 seconds' },
  { time: '09:10', type: 'ok',   icon: '✅', msg: 'Single face consistently detected' },
  { time: '15:00', type: 'ok',   icon: '✅', msg: 'Interview completed successfully' },
];

function fmtDuration(s) {
  if (!s && s !== 0) return '—';
  const totalSec = Math.round(s);
  return `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
}
function scoreColor(s) { return s >= 85 ? 'var(--green)' : s >= 70 ? 'var(--gold-dark)' : 'var(--red)'; }
const COLORS = ['#c9a84c', '#2a6be8', '#1a8a5a', '#e8462a', '#9b59b6', '#e67e22', '#1abc9c', '#e91e9c'];
function initials(name) { return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'; }

export default function CandidateReview() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const toast   = useToast();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);

  // ── Playback state ────────────────────────────────────────
  // videoProgress: 0–100 (percentage through the recording)
  const [videoProgress, setVideoProgress] = useState(0);
  const [playing, setPlaying]             = useState(false);

  const playIntervalRef   = useRef(null);
  const progressRef       = useRef(0);    // always-current value for the interval callback
  const durationRef       = useRef(1122); // total duration in seconds

  // Keep progressRef in sync
  useEffect(() => { progressRef.current = videoProgress; }, [videoProgress]);

  useEffect(() => {
    getCandidate(id)
      .then(data => {
        setCandidate(data);
        if (data?.interviewDuration) durationRef.current = data.interviewDuration;
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  // ── Play / pause ticker ───────────────────────────────────
  // Advances videoProgress at real-time speed relative to total duration.
  // e.g. if duration = 1000 s, one real second = 0.1% → we tick 0.1 per 100 ms.
  const startPlayback = useCallback(() => {
    clearInterval(playIntervalRef.current);
    const TICK_MS      = 100;                                            // update every 100 ms
    const totalSec     = durationRef.current || 1122;
    const pctPerTick   = (TICK_MS / 1000 / totalSec) * 100;             // % to add per tick

    playIntervalRef.current = setInterval(() => {
      const next = progressRef.current + pctPerTick;
      if (next >= 100) {
        setVideoProgress(100);
        setPlaying(false);
        clearInterval(playIntervalRef.current);
      } else {
        setVideoProgress(next);
      }
    }, TICK_MS);
  }, []);

  const stopPlayback = useCallback(() => {
    clearInterval(playIntervalRef.current);
  }, []);

  useEffect(() => {
    if (playing) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return stopPlayback;
  }, [playing, startPlayback, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(playIntervalRef.current), []);

  const togglePlay = () => {
    if (videoProgress >= 100) {
      // Restart
      setVideoProgress(0);
      progressRef.current = 0;
      setPlaying(true);
    } else {
      setPlaying(p => !p);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setVideoProgress(pct);
    progressRef.current = pct;
  };

  // ── Recommendation ────────────────────────────────────────
  const handleRecommendation = async (rec) => {
    try {
      if (rec === 'shortlist') await shortlistCandidate(id);
      else if (rec === 'reject') await rejectCandidate(id);
      setCandidate(c => ({ ...c, recommendation: rec }));
      toast(`${candidate.name} ${rec === 'shortlist' ? 'shortlisted' : rec === 'reject' ? 'rejected' : 'put on hold'} successfully!`, 'success');
      setModal(null);
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </div>
  );

  if (!candidate) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: '2rem' }}>😕</span>
        <p>Candidate not found.</p>
        <button className="btn btn-outline" onClick={() => nav('/dashboard')}>← Back</button>
      </div>
    </div>
  );

  const color = COLORS[id.charCodeAt(0) % COLORS.length];
  const s     = candidate.scores || {};
  const breakdownItems = [
    ['Communication',   s.communication  || 0],
    ['Technical Depth', s.technical      || 0],
    ['Problem Solving', s.problemSolving || 0],
    ['Culture Fit',     s.cultureFit     || 0],
  ];

  const totalDuration    = candidate.interviewDuration || 1122;
  const currentTimeSec   = (videoProgress / 100) * totalDuration;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {modal === 'shortlist' && (
        <Modal title={`Shortlist ${candidate.name}?`}
          subtitle="Moving to the shortlist will notify the hiring manager and schedule a technical screen."
          onClose={() => setModal(null)}
          actions={[
            { label: 'Cancel',              className: 'btn-outline', onClick: () => setModal(null) },
            { label: '✓ Confirm Shortlist', className: 'btn-primary', onClick: () => handleRecommendation('shortlist') },
          ]} />
      )}
      {modal === 'reject' && (
        <Modal title={`Reject ${candidate.name}?`}
          subtitle="The candidate will receive an automated rejection email. Reversible within 24 hours."
          onClose={() => setModal(null)}
          actions={[
            { label: 'Cancel',           className: 'btn-outline', onClick: () => setModal(null) },
            { label: '✗ Confirm Reject', className: 'btn-danger',  onClick: () => handleRecommendation('reject') },
          ]} />
      )}

      <div className="main page-enter">
        {/* ── Header ── */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 50, height: 50, fontSize: '.95rem', background: `${color}20`, color }}>
              {initials(candidate.name)}
            </div>
            <div>
              <div className="page-title" style={{ fontSize: '1.7rem' }}>{candidate.name}</div>
              <div className="page-sub">{candidate.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {s.overall > 0 && (
              <span className={`badge ${s.overall >= 85 ? 'badge-green' : s.overall >= 70 ? 'badge-yellow' : 'badge-red'}`}
                style={{ fontSize: '.88rem', padding: '6px 14px' }}>
                AI Score: {s.overall}/100
              </span>
            )}
            {candidate.proctoringFlags > 0 && (
              <span className="badge badge-yellow" style={{ fontSize: '.88rem', padding: '6px 14px' }}>
                ⚠ {candidate.proctoringFlags} flags
              </span>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => nav('/dashboard')}>← Dashboard</button>
          </div>
        </div>

        <div className="review-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 22, alignItems: 'start' }}>
          {/* ── Left sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Video player */}
            <div
              style={{ background: 'var(--ink)', borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', position: 'relative', boxShadow: 'var(--shadow-lg)', cursor: 'pointer' }}
              onClick={togglePlay}
            >
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#0a0a1a,#1a1a3e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'rgba(255,255,255,.7)' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', transition: 'var(--transition)', transform: playing ? 'scale(1.08)' : 'scale(1)' }}>
                  {videoProgress >= 100 ? '↺' : playing ? '⏸' : '▶'}
                </div>
                <span style={{ fontSize: '.8rem', opacity: .6 }}>
                  {videoProgress >= 100 ? 'Click to replay' : playing ? 'Playing…' : 'Click to play recording'}
                </span>
              </div>

              {/* Progress bar + timestamp */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 14px 12px', background: 'linear-gradient(to top,rgba(0,0,0,.8),transparent)', display: 'flex', alignItems: 'center', gap: 9 }}>
                {/* Seekable bar */}
                <div
                  style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 100, cursor: 'pointer', position: 'relative' }}
                  onClick={handleSeek}
                >
                  <div style={{ height: '100%', width: `${videoProgress}%`, background: 'var(--gold)', borderRadius: 100, transition: playing ? 'none' : 'width .3s' }} />
                  {/* Flag markers */}
                  {[20, 45].map((pos, i) => (
                    <div key={i} style={{ position: 'absolute', top: -5, left: `${pos}%`, width: 3, height: 14, borderRadius: 2, background: 'var(--gold-light)', transform: 'translateX(-50%)', pointerEvents: 'none' }} title="Proctoring flag" />
                  ))}
                </div>

                {/* Timestamp — updates as video "plays" */}
                <span style={{ color: 'rgba(255,255,255,.65)', fontSize: '.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {fmtDuration(currentTimeSec)} / {fmtDuration(totalDuration)}
                </span>
              </div>
            </div>

            {/* Candidate info */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Candidate Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Role',     candidate.role],
                  ['Duration', fmtDuration(candidate.interviewDuration)],
                  ['Date',     candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '—'],
                  ['Status',   candidate.status],
                  ['Score',    `${s.overall || '—'}/100`],
                  ['Flags',    `${candidate.proctoringFlags || 0} event(s)`],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(10,10,15,.38)', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: '.88rem', fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score breakdown */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Score Breakdown</div>
              {breakdownItems.map(([label, val]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 5 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                  <div className="score-bar" style={{ height: 7 }}>
                    <div className="score-bar-fill" style={{ width: `${val}%`, background: scoreColor(val) }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Integrity report */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>🛡️ Integrity Report</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {MOCK_PROCTORING.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 'var(--radius-sm)', background: p.type === 'warn' ? 'rgba(228,160,8,.09)' : 'var(--green-light)', fontSize: '.8rem' }}>
                    <span>{p.icon}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '.76rem', color: 'rgba(10,10,15,.4)', minWidth: 40 }}>{p.time}</span>
                    <span style={{ flex: 1 }}>{p.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right main ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Transcript */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>📝 Full Transcript</div>
                <button className="btn btn-outline btn-sm" onClick={() => toast('Transcript exported', 'success')}>Export</button>
              </div>
              {MOCK_TRANSCRIPTS.map((t, i) => (
                <div key={i} style={{ padding: '18px 22px', borderBottom: i < MOCK_TRANSCRIPTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: 6 }}>Question {i + 1}</div>
                  <div style={{ fontSize: '.86rem', fontWeight: 500, marginBottom: 9 }}>{t.q}</div>
                  <div style={{ fontSize: '.84rem', lineHeight: 1.68, color: 'rgba(10,10,15,.6)' }}>"{t.a}"</div>
                </div>
              ))}
            </div>

            {/* AI Evaluation */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 6 }}>🤖 AI Evaluation Summary</div>
              <p style={{ fontSize: '.85rem', color: 'rgba(10,10,15,.5)', marginBottom: 18 }}>Generated by Evaluation Orchestrator after transcript analysis</p>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 18, fontSize: '.86rem', lineHeight: 1.72, color: 'rgba(10,10,15,.68)', marginBottom: 20 }}>
                <strong style={{ color: 'var(--ink)' }}>{candidate.name}</strong> demonstrates{' '}
                <strong>strong communication clarity</strong> with structured, concise answers. Technical depth is evident in the checkout-flow redesign example (Q1), showing ownership across the full project lifecycle.<br /><br />
                Problem-solving approach is systematic — the candidate correctly identified root cause in the queue race condition scenario and resolved it with a production-safe solution. Culture-fit signals are positive; conflict-resolution framing prioritizes data over ego.<br /><br />
                <strong>Recommendation:</strong> Advance to technical screen.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setModal('shortlist')}>✓ Shortlist</button>
                <button className="btn btn-outline" onClick={() => setModal('reject')}>✗ Reject</button>
                <button className="btn btn-secondary" onClick={() => handleRecommendation('hold')}>Hold</button>
              </div>
              {candidate.recommendation && candidate.recommendation !== 'pending' && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--green-light)', fontSize: '.82rem', color: 'var(--green)', fontWeight: 500 }}>
                  ✓ Marked as: <strong style={{ textTransform: 'capitalize' }}>{candidate.recommendation}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}