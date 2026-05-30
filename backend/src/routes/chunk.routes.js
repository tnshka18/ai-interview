const express = require('express');
const multer  = require('multer');
const path    = require('path');

const router  = express.Router();

// In-memory chunk store (replace with S3 in production)
const chunkStore = {};   // { [sessionId]: { [qIdx]: [ {chunkIndex, size, key, ts} ] } }

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 6 * 1024 * 1024 },   // 6 MB per chunk
  fileFilter: (_req, file, cb) => {
    const ok = ['.webm', '.wav', '.ogg', '.mp4'].includes(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only audio/video chunks accepted'));
  },
});

// POST /api/chunks/upload
router.post('/upload', upload.single('chunk'), (req, res) => {
  const { sessionId, questionIndex, chunkIndex } = req.body;

  if (!sessionId || chunkIndex === undefined) {
    return res.status(400).json({ error: 'sessionId and chunkIndex required' });
  }
  if (!req.file || req.file.size < 50) {
    return res.status(400).json({ error: 'Empty or corrupt chunk rejected' });
  }

  const qi  = Number(questionIndex) || 0;
  const ci  = Number(chunkIndex);
  const key = `sessions/${sessionId}/q${qi}/chunk_${String(ci).padStart(3,'0')}.webm`;

  if (!chunkStore[sessionId])     chunkStore[sessionId]     = {};
  if (!chunkStore[sessionId][qi]) chunkStore[sessionId][qi] = [];

  const dup = chunkStore[sessionId][qi].some(c => c.chunkIndex === ci);
  if (dup) return res.json({ message: 'Duplicate chunk ignored', key, duplicate: true });

  chunkStore[sessionId][qi].push({ chunkIndex: ci, key, size: req.file.size, ts: Date.now() });

  console.log(`[CHUNK] ${key} — ${req.file.size}B`);
  res.json({ message: 'Chunk received', key, chunkIndex: ci, size: req.file.size, totalChunks: chunkStore[sessionId][qi].length });
});

// GET /api/chunks/:sessionId/manifest
router.get('/:sessionId/manifest', (req, res) => {
  const data = chunkStore[req.params.sessionId];
  if (!data) return res.json({ sessionId: req.params.sessionId, questions: {}, totalChunks: 0 });

  let total = 0;
  const questions = {};
  for (const [qi, chunks] of Object.entries(data)) {
    const sorted = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    questions[qi] = { count: sorted.length, totalBytes: sorted.reduce((a, c) => a + c.size, 0), keys: sorted.map(c => c.key) };
    total += sorted.length;
  }
  res.json({ sessionId: req.params.sessionId, questions, totalChunks: total });
});

// POST /api/chunks/:sessionId/merge  — in production: enqueue SQS job → Lambda FFmpeg
router.post('/:sessionId/merge', (req, res) => {
  const { sessionId } = req.params;
  const qi     = Number(req.body.questionIndex) || 0;
  const chunks = chunkStore[sessionId]?.[qi];

  if (!chunks?.length) return res.status(404).json({ error: 'No chunks found for this question' });

  const sorted    = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  const mergedKey = `sessions/${sessionId}/q${qi}/merged.webm`;

  console.log(`[MERGE] ${sessionId}/q${qi} — ${sorted.length} chunks → ${mergedKey}`);
  res.json({ message: 'Merge job enqueued', mergedKey, chunkCount: sorted.length, status: 'processing' });
});

module.exports = router;
