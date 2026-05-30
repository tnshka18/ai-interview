import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import Modal from '../components/Modal';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../context/ToastContext';
import { startSession, completeSession, uploadChunk as apiUploadChunk } from '../utils/api';

const QUESTIONS = [
  'Tell me about yourself and your most impactful project in the last two years.',
  'Describe a time you solved a complex technical problem under tight deadlines.',
  'How do you handle disagreements with team members about technical direction?',
  'Walk me through how you would design a scalable URL shortening service.',
  'What does your ideal engineering culture look like and how do you contribute to it?',
];
const TIPS = [
  'Speak clearly and at a natural pace',
  'Use the STAR method for behavioural questions',
  'Look into the camera, not the screen',
  'Keep answers between 1.5 – 3 minutes',
];
const TIME_LIMIT = 180; // 3 minutes per question

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function Interview() {
  const nav   = useNavigate();
  const toast = useToast();

  const [sessionId, setSessionId]   = useState(null);
  const [qIdx, setQIdx]             = useState(0);
  const [recording, setRecording]   = useState(false);
  const [muted, setMuted]           = useState(false);
  const [timer, setTimer]           = useState(0);
  const [chunks, setChunks]         = useState([]);
  const [answers, setAnswers]       = useState([]);
  const [proctoring, setProctoring] = useState([]);
  const [done, setDone]             = useState(false);
  const [exitModal, setExitModal]   = useState(false);
  const [chunkIdx, setChunkIdx]     = useState(0);
  // Camera/mic state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Refs
  const timerRef      = useRef(null);
  const chunkRef      = useRef(null);
  const streamRef     = useRef(null);   // MediaStream
  const mediaRecRef   = useRef(null);   // MediaRecorder
  const videoRef      = useRef(null);   // <video> element for live preview
  const chunkIdxRef   = useRef(0);      // always-current chunk index for recorder callback
  const recordingRef  = useRef(false);  // mirror of `recording` for callbacks
  const timerValRef   = useRef(0);      // mirror of `timer` for stopRecording callback

  // Keep refs in sync
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { timerValRef.current  = timer; },    [timer]);

  // ── WebSocket ──────────────────────────────────────────────
  const { send, status: wsStatus } = useWebSocket({
    session_restored: () => { toast('Session resumed ✓', 'success'); },
    chunk_ack:        () => {},
    proctoring_ack:   () => {},
  });

  // ── Acquire camera + mic on mount ─────────────────────────
  useEffect(() => {
    let active = true;
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted     = true; // prevent feedback — we record audio separately
        }
        setCameraReady(true);
      } catch (err) {
        if (!active) return;
        const msg =
          err.name === 'NotAllowedError'  ? 'Camera/mic permission denied. Please allow access and refresh.' :
          err.name === 'NotFoundError'    ? 'No camera or microphone found on this device.' :
          err.name === 'NotReadableError' ? 'Camera is in use by another application.' :
          `Could not access camera: ${err.message}`;
        setCameraError(msg);
        toast(msg, 'error');
      }
    };
    getMedia();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  // Apply mute toggle to actual audio track
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, [muted]);

  // ── Start session ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const data = await startSession({ candidateName: 'Demo Candidate', candidateEmail: 'demo@example.com' });
        setSessionId(data.sessionId);
        send('session_join', { sessionId: data.sessionId, candidateName: 'Demo Candidate' });
      } catch {
        toast('Session started (offline mode)', 'info');
        setSessionId('demo-' + Date.now());
      }
    };
    init();
  }, []); // eslint-disable-line

  // ── Proctoring ────────────────────────────────────────────
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => {
      const events = ['face_detected', 'face_detected', 'face_detected', 'tab_switch'];
      const type   = events[Math.floor(Math.random() * events.length)];
      setProctoring(p => [...p, { type, ts: Date.now() }]);
      if (type === 'tab_switch' && sessionId) {
        send('proctoring_event', { sessionId, event: { type, timestamp: Date.now(), severity: 'low' } });
      }
    }, 8000);
    return () => clearInterval(iv);
  }, [recording, sessionId, send]);

  // ── Stop recording (defined before start so it can be referenced) ─
  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return;

    // Stop MediaRecorder
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }

    // Stop timers
    clearInterval(timerRef.current);
    clearInterval(chunkRef.current);

    setRecording(false);

    const capturedTimer = timerValRef.current;
    const capturedQIdx  = qIdx;

    const saved = { questionIndex: capturedQIdx, duration: capturedTimer };
    setAnswers(a => {
      const newAnswers = [...a, saved];
      const isLast = capturedQIdx >= QUESTIONS.length - 1;
      if (isLast) {
        setDone(true);
        completeSession(sessionId, { duration: capturedTimer, answers: newAnswers }).catch(() => {});
        send('interview_complete', { sessionId });
      }
      return newAnswers;
    });

    send('answer_complete', { sessionId, questionIndex: capturedQIdx, duration: capturedTimer });

    const isLast = capturedQIdx >= QUESTIONS.length - 1;
    if (!isLast) {
      toast(`Answer saved — ${chunkIdxRef.current} chunks captured`, 'success');
      setTimeout(() => {
        setQIdx(i => i + 1);
        setTimer(0);
        timerValRef.current = 0;
        setChunks([]);
        chunkIdxRef.current = 0;
        toast('Next question →', 'info');
      }, 1200);
    }
  }, [qIdx, sessionId, send, toast]); // eslint-disable-line

  // ── Start recording ────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!streamRef.current) { toast('Camera not ready yet', 'error'); return; }

    setTimer(0);
    timerValRef.current = 0;
    setChunkIdx(0);
    chunkIdxRef.current = 0;
    setChunks([]);
    setRecording(true);

    // ── MediaRecorder setup ──
    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
      MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
      MediaRecorder.isTypeSupported('video/webm')                 ? 'video/webm' :
      '';

    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    mediaRecRef.current = recorder;

    recorder.ondataavailable = async (e) => {
      if (!e.data || e.data.size === 0) return;
      chunkIdxRef.current += 1;
      const idx  = chunkIdxRef.current;
      const blob = e.data;

      setChunks(c => [...c, { idx, size: blob.size, ts: Date.now() }]);

      // Send chunk metadata via WebSocket
      send('chunk_meta', { sessionId, questionIndex: qIdx, chunkIndex: idx, size: blob.size });

      // Upload chunk to backend (fire-and-forget)
      apiUploadChunk(sessionId, qIdx, idx, blob).catch(() => {});
    };

    recorder.start(3000); // emit a chunk every 3 s

    // ── Countdown timer ──
    timerRef.current = setInterval(() => {
      setTimer(t => {
        const next = t + 1;
        timerValRef.current = next;
        if (next >= TIME_LIMIT) {
          stopRecording();
          return t;
        }
        return next;
      });
    }, 1000);

    toast('● Recording started', 'success');
  }, [qIdx, sessionId, send, toast, stopRecording]);

  const toggleMute = () => {
    setMuted(m => !m);
    toast(muted ? 'Microphone unmuted' : 'Microphone muted', 'info');
  };

  const handleExit = () => {
    clearInterval(timerRef.current);
    clearInterval(chunkRef.current);
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    nav('/candidate');
    toast('Session saved', 'info');
  };

  if (done) return (
    <InterviewComplete
      answers={answers}
      chunks={chunks}
      proctoring={proctoring}
      onLeave={() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        nav('/candidate');
      }}
    />
  );

  const liveFlag = proctoring.length > 0 && proctoring[proctoring.length - 1].type === 'tab_switch';
  const timeLeft = TIME_LIMIT - timer;
  const timerWarning = timeLeft <= 30 && recording;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav variant="candidate" />

      {exitModal && (
        <Modal title="Exit Interview?" subtitle="Your progress is saved. You can resume within 30 minutes."
          onClose={() => setExitModal(false)}
          actions={[
            { label: 'Stay',        className: 'btn-primary', onClick: () => setExitModal(false) },
            { label: 'Exit & Save', className: 'btn-outline', onClick: handleExit },
          ]} />
      )}

      <div className="main page-enter">
        {/* Progress bar */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'rgba(10,10,15,.4)', marginBottom: 8 }}>
            <span>Progress</span><span>{qIdx} / {QUESTIONS.length} answered</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: i < qIdx ? 'var(--green)' : i === qIdx ? 'var(--gold)' : 'var(--surface2)', transition: 'background .4s' }} />
            ))}
          </div>
        </div>

        <div className="interview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 22, alignItems: 'start' }}>
          {/* ── Main area ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Question card */}
            <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius)', padding: '36px 36px 32px', color: 'var(--cream)', position: 'relative', overflow: 'hidden', minHeight: 190 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 0% 0%, rgba(201,168,76,.15), transparent 60%)' }} />
              <div style={{ position: 'absolute', top: 22, right: 22, width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'var(--gold)' }}>🎙️</div>
              <div style={{ fontSize: '.7rem', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, position: 'relative' }}>
                Question {qIdx + 1} of {QUESTIONS.length}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem,2.4vw,1.6rem)', fontWeight: 700, lineHeight: 1.35, position: 'relative' }}>
                {QUESTIONS[qIdx]}
              </div>
            </div>

            {/* Camera preview */}
            <div style={{ background: 'var(--ink2)', borderRadius: 'var(--radius)', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {/* Real camera feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: cameraReady ? 'block' : 'none',
                  transform: 'scaleX(-1)', // mirror effect
                }}
              />

              {/* Fallback when camera not ready */}
              {!cameraReady && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(255,255,255,.5)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px solid rgba(255,255,255,.1)' }}>
                    {cameraError ? '🚫' : '⏳'}
                  </div>
                  <span style={{ fontSize: '.8rem', textAlign: 'center', maxWidth: 280, padding: '0 20px' }}>
                    {cameraError || 'Requesting camera access…'}
                  </span>
                  {cameraError && (
                    <button className="btn btn-gold btn-sm" onClick={() => window.location.reload()}>
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* REC badge + timer overlay */}
              {recording && (
                <>
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', borderRadius: 100, padding: '5px 12px', fontSize: '.76rem', color: '#fff', fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'blink 1.2s ease infinite' }} />
                    REC
                  </div>
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    background: timerWarning ? 'rgba(212,48,32,.85)' : 'rgba(0,0,0,.55)',
                    backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-sm)',
                    padding: '7px 12px', fontFamily: 'monospace', fontSize: '1.3rem',
                    color: '#fff', fontWeight: 700, transition: 'background .3s',
                  }}>
                    {fmt(timer)}
                    {timerWarning && (
                      <span style={{ fontSize: '.7rem', display: 'block', textAlign: 'center', opacity: .85 }}>
                        {fmt(timeLeft)} left
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Mic toggle button */}
              <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 11 }}>
                <button
                  onClick={toggleMute}
                  style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: muted ? 'var(--accent)' : 'rgba(255,255,255,.14)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'var(--transition)' }}
                  title={muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {muted ? '🔇' : '🎙️'}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {!recording ? (
                <>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startRecording}
                    disabled={!sessionId || !cameraReady}
                    title={!cameraReady ? 'Waiting for camera access…' : ''}
                  >
                    ● Start Recording
                  </button>
                  {!cameraReady && !cameraError && (
                    <span style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>Waiting for camera…</span>
                  )}
                  {qIdx > 0 && (
                    <span style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>{qIdx} answer{qIdx !== 1 ? 's' : ''} saved ✓</span>
                  )}
                </>
              ) : (
                <>
                  <button className="btn btn-danger btn-lg" onClick={stopRecording}>⬛ Stop & Save Answer</button>
                  <span style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>Streaming {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}…</span>
                </>
              )}
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setExitModal(true)}>Exit</button>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Session status */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 13 }}>Session Status</div>
              {[
                ['🔴', 'Recording',  recording ? 'Active' : 'Idle'],
                ['📷', 'Camera',     cameraReady ? 'Live' : cameraError ? 'Error' : 'Starting…'],
                ['📡', 'WebSocket',  wsStatus === 'connected' ? 'Connected' : wsStatus],
                ['📡', 'Stream',     recording ? `${chunks.length} chunks sent` : 'Ready'],
                ['🛡️', 'Proctoring', 'Active'],
                ['💾', 'Session',    sessionId ? 'Saved' : 'Connecting…'],
              ].map(([ic, label, val]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', marginBottom: 6, fontSize: '.82rem' }}>
                  <span>{ic} {label}</span>
                  <span style={{ fontSize: '.78rem', fontWeight: 500, color: (val.includes('Active') || val.includes('Connected') || val.includes('Saved') || val.includes('chunks') || val === 'Live') ? 'var(--green)' : val.includes('Error') ? 'var(--red)' : 'rgba(10,10,15,.4)' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 13 }}>💡 Tips</div>
              {TIPS.map(t => (
                <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '.82rem', color: 'rgba(10,10,15,.55)', marginBottom: 10 }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>→</span>{t}
                </div>
              ))}
            </div>

            {/* Live monitoring */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 13 }}>🛡️ Live Monitoring</div>
              <div style={{ fontSize: '.8rem', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: liveFlag ? 'rgba(228,160,8,.1)' : 'var(--green-light)', color: liveFlag ? 'var(--gold-dark)' : 'var(--green)', marginBottom: 8 }}>
                {liveFlag ? '⚠️ Tab switch detected' : '✅ Face detected — all clear'}
              </div>
              <div style={{ fontSize: '.75rem', color: 'rgba(10,10,15,.35)' }}>Events logged: {proctoring.length}</div>
            </div>

            {/* Answered questions */}
            {qIdx > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>Answered</div>
                {Array.from({ length: qIdx }, (_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)', marginBottom: 6, fontSize: '.8rem', color: 'var(--green)' }}>
                    <span>✓</span><span>Q{i + 1} — Saved ({fmt(answers[i]?.duration || 0)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Completion Screen ─────────────────────────────────────────
function InterviewComplete({ answers, chunks, proctoring, onLeave }) {
  const totalDuration = answers.reduce((sum, a) => sum + (a.duration || 0), 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <div className="nav-logo"><span className="nav-logo-dot" />InterviewAI</div>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }} className="page-enter">
          <div style={{ fontSize: '4rem', marginBottom: 22 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 14 }}>
            Interview Complete!
          </h2>
          <p style={{ fontSize: '.95rem', color: 'rgba(10,10,15,.5)', lineHeight: 1.7, marginBottom: 36 }}>
            All {answers.length} questions answered and saved. Your responses are being processed — transcription and AI evaluation typically completes within 3–5 minutes.
          </p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 26, marginBottom: 30, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Session Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Questions Answered', answers.length],
                ['Total Duration',     `${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`],
                ['Chunks Streamed',    chunks.length],
                ['Integrity Flags',    proctoring.filter(p => p.type === 'tab_switch').length],
                ['Status',             'Processing…'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(10,10,15,.38)', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onLeave}>← Back to Portal</button>
        </div>
      </div>
    </div>
  );
}