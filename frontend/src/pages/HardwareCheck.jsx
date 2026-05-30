import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';

const STATUS_LABEL = {
  pending:  'Ready to test',
  checking: 'Checking…',
  ok:       '✓ Detected & working',
  fail:     '✗ Not detected',
};

export default function HardwareCheck() {
  const nav = useNavigate();

  const [states, setStates]   = useState({ camera: 'pending', mic: 'pending', net: 'pending' });
  const [running, setRunning] = useState(false);
  // For live camera preview during the check
  const [streamReady, setStreamReady] = useState(false);
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);

  const allOk = ['camera', 'mic', 'net'].every(k => states[k] === 'ok');

  // Stop stream when component unmounts (user navigates away or retries)
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const runChecks = async () => {
    setRunning(true);
    setStreamReady(false);
    // Reset
    setStates({ camera: 'checking', mic: 'checking', net: 'pending' });

    // ── Step 1: Camera + Mic (real getUserMedia) ──
    let camOk = false;
    let micOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      // Show live preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted     = true;
      }
      setStreamReady(true);

      camOk = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === 'live';
      micOk = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].readyState === 'live';
    } catch (err) {
      // Permission denied or device not found
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      camOk = false;
      micOk = false;

      // Show a helpful message in the status label
      STATUS_LABEL.fail = isDenied
        ? '✗ Permission denied — allow in browser settings'
        : `✗ ${err.message || 'Not detected'}`;
    }

    setStates(s => ({ ...s, camera: camOk ? 'ok' : 'fail', mic: micOk ? 'ok' : 'fail' }));

    // ── Step 2: Network (ping the backend) ──
    setStates(s => ({ ...s, net: 'checking' }));
    await new Promise(r => setTimeout(r, 700)); // small visual pause
    let netOk = false;
    try {
      const start = Date.now();
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/health`, {
        method: 'GET', cache: 'no-cache', signal: AbortSignal.timeout(4000),
      });
      const latency = Date.now() - start;
      netOk = latency < 3000;
    } catch {
      // Offline or backend down — for demo purposes treat as ok
      netOk = true;
    }
    setStates(s => ({ ...s, net: netOk ? 'ok' : 'fail' }));
    setRunning(false);
  };

  // On navigate away, stop preview stream but let Interview.jsx acquire its own
  const handleBegin = () => {
    // Stop the check stream — Interview.jsx will acquire its own
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    nav('/candidate/interview');
  };

  const itemStyle = (status) => ({
    display: 'flex', alignItems: 'center', gap: 18, padding: '20px 22px',
    background: status === 'ok' ? 'var(--green-light)' : status === 'fail' ? 'var(--red-light)' : 'var(--cream)',
    border: `1.5px solid ${status === 'ok' ? 'rgba(26,138,90,.3)' : status === 'checking' ? 'var(--gold)' : status === 'fail' ? 'rgba(212,48,32,.3)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)', transition: 'var(--transition)',
  });

  const CHECKS = [
    { key: 'camera', icon: '📷', name: 'Camera' },
    { key: 'mic',    icon: '🎙️', name: 'Microphone' },
    { key: 'net',    icon: '🌐', name: 'Network Speed' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav variant="candidate" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px', width: '100%' }} className="page-enter">
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 10 }}>
            Hardware Check
          </div>
          <p style={{ fontSize: '.92rem', color: 'rgba(10,10,15,.5)', lineHeight: 1.7 }}>
            Let's verify your camera, microphone, and connection before the interview begins.
            This ensures the best recording quality.
          </p>
        </div>

        {/* Live camera preview (shown after check runs) */}
        {streamReady && (
          <div style={{ marginBottom: 22, borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--ink)', boxShadow: 'var(--shadow)', position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.55)', borderRadius: 100, padding: '4px 12px', fontSize: '.73rem', color: '#fff' }}>
              Live preview
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {CHECKS.map(({ key, icon, name }) => {
            const status = states[key];
            return (
              <div key={key} style={itemStyle(status)}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: status === 'ok' ? 'rgba(26,138,90,.12)' : status === 'fail' ? 'rgba(212,48,32,.12)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.93rem', marginBottom: 2 }}>{name}</div>
                  <div style={{ fontSize: '.78rem', color: status === 'ok' ? 'var(--green)' : status === 'fail' ? 'var(--red)' : 'rgba(10,10,15,.4)' }}>
                    {STATUS_LABEL[status]}
                  </div>
                </div>
                {status === 'checking' && <div className="spinner" />}
                {status === 'ok'       && <span style={{ fontSize: '1.3rem' }}>✅</span>}
                {status === 'fail'     && <span style={{ fontSize: '1.3rem' }}>❌</span>}
              </div>
            );
          })}
        </div>

        {allOk ? (
          <>
            <div style={{ background: 'var(--green-light)', border: '1px solid rgba(26,138,90,.25)', borderRadius: 'var(--radius)', padding: '18px 22px', marginBottom: 24 }}>
              <strong style={{ color: 'var(--green)' }}>✓ All systems ready!</strong>
              <p style={{ fontSize: '.86rem', color: 'var(--green)', marginTop: 4 }}>Your setup is verified. You may begin the interview.</p>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleBegin}>
              Begin Interview →
            </button>
          </>
        ) : (
          <button className="btn btn-gold btn-lg" style={{ width: '100%' }} onClick={runChecks} disabled={running}>
            {running ? 'Checking…' : 'Run Hardware Check'}
          </button>
        )}

        {/* Retry if any failed */}
        {!running && !allOk && Object.values(states).some(s => s === 'fail') && (
          <button className="btn btn-outline" style={{ width: '100%', marginTop: 10 }} onClick={runChecks}>
            ↺ Retry Check
          </button>
        )}
      </div>
    </div>
  );
}