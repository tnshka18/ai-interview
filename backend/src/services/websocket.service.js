const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

// In-memory session store — replace with Redis at scale
const activeSessions = new Map();
let wssInstance = null;

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wssInstance = wss;

  wss.on('connection', (ws) => {
    ws.clientId = uuidv4();
    ws.isAlive   = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, msg);
      } catch {
        safeSend(ws, { type: 'error', message: 'Invalid JSON payload' });
      }
    });

    ws.on('close', () => {
      if (ws.sessionId) {
        const sess = activeSessions.get(ws.sessionId);
        if (sess) { sess.disconnectedAt = Date.now(); activeSessions.set(ws.sessionId, sess); }
      }
    });

    ws.on('error', (err) => console.error('[WS] client error:', err.message));

    safeSend(ws, { type: 'connected', clientId: ws.clientId });
  });

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
  console.log('[WS] WebSocket server ready on /ws');
}

function handleMessage(ws, { type, payload = {} }) {
  switch (type) {

    case 'session_join': {
      const { sessionId, candidateName } = payload;
      ws.sessionId = sessionId;
      let sess = activeSessions.get(sessionId);
      if (!sess) {
        sess = { sessionId, candidateName, questionIndex: 0, chunks: [], proctoring: [], answers: [], startedAt: Date.now() };
        activeSessions.set(sessionId, sess);
        safeSend(ws, { type: 'session_created', session: sess });
      } else {
        sess.reconnects = (sess.reconnects || 0) + 1;
        activeSessions.set(sessionId, sess);
        safeSend(ws, { type: 'session_restored', session: sess });
      }
      break;
    }

    case 'chunk_meta': {
      const { sessionId, questionIndex, chunkIndex, size } = payload;
      const sess = activeSessions.get(sessionId);
      if (!sess) return safeSend(ws, { type: 'error', message: 'Session not found' });

      // Deduplicate
      const exists = sess.chunks.some(c => c.questionIndex === questionIndex && c.chunkIndex === chunkIndex);
      if (!exists) {
        sess.chunks.push({ questionIndex, chunkIndex, size, key: `sessions/${sessionId}/q${questionIndex}/chunk_${String(chunkIndex).padStart(3,'0')}.webm`, ts: Date.now() });
        activeSessions.set(sessionId, sess);
      }
      safeSend(ws, { type: 'chunk_ack', chunkIndex, duplicate: exists });
      break;
    }

    case 'proctoring_event': {
      const { sessionId, event } = payload;
      const sess = activeSessions.get(sessionId);
      if (!sess) return;
      const flagged = { ...event, timestamp: Date.now() };
      sess.proctoring.push(flagged);
      activeSessions.set(sessionId, sess);
      safeSend(ws, { type: 'proctoring_ack', event: flagged });
      // Notify any watching recruiters
      broadcastToRecruiters(sessionId, { type: 'proctoring_flag', sessionId, event: flagged });
      break;
    }

    case 'answer_complete': {
      const { sessionId, questionIndex, duration } = payload;
      const sess = activeSessions.get(sessionId);
      if (!sess) return;
      sess.answers.push({ questionIndex, duration, completedAt: Date.now() });
      sess.questionIndex = questionIndex + 1;
      activeSessions.set(sessionId, sess);
      safeSend(ws, { type: 'answer_saved', questionIndex, nextQuestion: sess.questionIndex });
      break;
    }

    case 'interview_complete': {
      const { sessionId } = payload;
      const sess = activeSessions.get(sessionId);
      if (!sess) return;
      sess.status = 'completed';
      sess.completedAt = Date.now();
      activeSessions.set(sessionId, sess);
      safeSend(ws, { type: 'interview_done', summary: { totalChunks: sess.chunks.length, totalAnswers: sess.answers.length, flags: sess.proctoring.length } });
      break;
    }

    case 'recruiter_watch': {
      ws.isRecruiter      = true;
      ws.watchingSession  = payload.sessionId;
      // Send current live session state
      const sess = activeSessions.get(payload.sessionId);
      safeSend(ws, { type: 'watching', sessionId: payload.sessionId, currentState: sess || null });
      break;
    }

    default:
      safeSend(ws, { type: 'error', message: `Unknown event type: ${type}` });
  }
}

function safeSend(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcastToRecruiters(sessionId, data) {
  if (!wssInstance) return;
  wssInstance.clients.forEach((client) => {
    if (client.isRecruiter && client.watchingSession === sessionId) safeSend(client, data);
  });
}

module.exports = { initWebSocket, activeSessions };
