const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth.middleware');
const Interview = require('../models/Interview.model');
const Candidate = require('../models/Candidate.model');
const Job = require('../models/Job.model');

const router = express.Router();

// GET /api/interviews — all interviews for recruiter
router.get('/', protect, async (req, res, next) => {
  try {
    const interviews = await Interview.find({ recruiterId: req.user._id })
      .populate('candidateId', 'name email company')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 });
    res.json({ interviews });
  } catch (err) { next(err); }
});

// POST /api/interviews — create new interview session for a candidate
router.post('/', protect, async (req, res, next) => {
  try {
    const { candidateName, candidateEmail, candidateCompany, jobId } = req.body;
    if (!candidateName || !candidateEmail || !jobId) {
      return res.status(400).json({ error: 'candidateName, candidateEmail, and jobId are required' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let candidate = await Candidate.findOne({ email: candidateEmail, jobId });
    if (!candidate) {
      candidate = await Candidate.create({ name: candidateName, email: candidateEmail, company: candidateCompany, jobId });
    }

    const interview = await Interview.create({
      candidateId: candidate._id,
      jobId,
      recruiterId: req.user._id,
    });

    res.status(201).json({ interview, candidateLink: `/interview/${interview._id}` });
  } catch (err) { next(err); }
});

// GET /api/interviews/:id — single interview
router.get('/:id', async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidateId')
      .populate({ path: 'jobId', select: 'title questions timeLimit' });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json({ interview });
  } catch (err) { next(err); }
});

module.exports = router;
