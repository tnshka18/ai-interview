const express    = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const Interview  = require('../models/Interview.model');
const Candidate  = require('../models/Candidate.model');
const Job        = require('../models/Job.model');
const { activeSessions } = require('../services/websocket.service');

const router = express.Router();

const DEFAULT_QUESTIONS = [
  { order:1, text:'Tell me about yourself and your most impactful project in the last two years.', timeLimit:180 },
  { order:2, text:'Describe a time you solved a complex technical problem under tight deadlines.',  timeLimit:180 },
  { order:3, text:'How do you handle disagreements with team members about technical direction?',   timeLimit:180 },
  { order:4, text:'Walk me through how you would design a scalable URL shortening service.',        timeLimit:180 },
  { order:5, text:"What does your ideal engineering culture look like?",                            timeLimit:180 },
];

// POST /api/sessions — start or create a session
router.post('/', [
  body('candidateName').trim().notEmpty().withMessage('Candidate name required'),
  body('candidateEmail').isEmail().withMessage('Valid email required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { candidateName, candidateEmail, jobId, inviteToken } = req.body;
    const sessionId = uuidv4();

    try {
      // Resolve job
      let job = null;
      if (jobId)      job = await Job.findById(jobId);
      if (inviteToken) job = await Job.findOne({ inviteToken });

      // Upsert candidate
      let candidate = await Candidate.findOne({ email: candidateEmail });
      if (!candidate) candidate = await Candidate.create({ name: candidateName, email: candidateEmail, jobId: job?._id });

      // Create interview record
      const interview = await Interview.create({
        candidateId: candidate._id,
        jobId:       job?._id || new (require('mongoose').Types.ObjectId)(),
        recruiterId: job?.createdBy || new (require('mongoose').Types.ObjectId)(),
        status:      'in_progress',
        startedAt:   new Date(),
        session_data: { questionIndex: 0, chunks: [], proctoring_events: [], answers: [], lastActive: new Date() },
      });

      return res.status(201).json({
        sessionId,
        interviewId: interview._id,
        questions:   job?.questions?.length ? job.questions : DEFAULT_QUESTIONS,
        message:     'Session started',
      });
    } catch (dbErr) {
      // Mock fallback — no DB required
      return res.status(201).json({
        sessionId,
        interviewId: 'mock-' + sessionId.slice(0,8),
        questions:   DEFAULT_QUESTIONS,
        message:     'Session started (mock mode)',
        mock:        true,
      });
    }
  } catch (err) { next(err); }
});

// GET /api/sessions/:sessionId — get or resume a session
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Check WS in-memory store first (fastest)
    const wsSession = activeSessions.get(sessionId);
    if (wsSession) return res.json({ session: wsSession, source: 'websocket' });

    // Then DB
    try {
      const interview = await Interview.findOne({ 'session_data.sessionId': sessionId })
        .populate('candidateId', 'name email')
        .populate('jobId', 'title questions');
      if (!interview) return res.status(404).json({ error: 'Session not found' });
      return res.json({ session: interview.session_data, interview, source: 'database' });
    } catch {
      return res.status(404).json({ error: 'Session not found' });
    }
  } catch (err) { next(err); }
});

// PATCH /api/sessions/:sessionId/complete
router.patch('/:sessionId/complete', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { duration, answers, interviewId } = req.body;

    try {
      if (interviewId) {
        await Interview.findByIdAndUpdate(interviewId, {
          status:      'completed',
          completedAt: new Date(),
          duration,
          'session_data.answers': answers || [],
        });
      }
      return res.json({ message: 'Session completed', sessionId });
    } catch {
      return res.json({ message: 'Session completed (mock)', sessionId });
    }
  } catch (err) { next(err); }
});

module.exports = router;
