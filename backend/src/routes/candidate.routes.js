const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const Candidate = require('../models/Candidate.model');
const Interview = require('../models/Interview.model');

const router = express.Router();

// GET /api/candidates — list all with interview data
router.get('/', protect, async (req, res, next) => {
  try {
    const { search, status, jobId } = req.query;

    // Build interview filter
    const interviewFilter = { recruiterId: req.user._id };
    if (status) interviewFilter.status = status;
    if (jobId)  interviewFilter.jobId  = jobId;

    let interviews = await Interview.find(interviewFilter)
      .populate('candidateId', 'name email company')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 });

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      interviews = interviews.filter(iv =>
        iv.candidateId?.name?.toLowerCase().includes(s) ||
        iv.candidateId?.company?.toLowerCase().includes(s) ||
        iv.jobId?.title?.toLowerCase().includes(s)
      );
    }

    res.json({ candidates: interviews, total: interviews.length });
  } catch (err) { next(err); }
});

// GET /api/candidates/:id — single candidate with full interview data
router.get('/:id', protect, async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidateId')
      .populate('jobId');
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json({ interview });
  } catch (err) { next(err); }
});

// PATCH /api/candidates/:id/shortlist
router.patch('/:id/shortlist', protect, async (req, res, next) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { shortlisted: true, rejected: false },
      { new: true }
    );
    if (!interview) return res.status(404).json({ error: 'Not found' });
    res.json({ interview, message: 'Candidate shortlisted' });
  } catch (err) { next(err); }
});

// PATCH /api/candidates/:id/reject
router.patch('/:id/reject', protect, async (req, res, next) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { rejected: true, shortlisted: false },
      { new: true }
    );
    if (!interview) return res.status(404).json({ error: 'Not found' });
    res.json({ interview, message: 'Candidate rejected' });
  } catch (err) { next(err); }
});

// PATCH /api/candidates/:id/notes
router.patch('/:id/notes', protect, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { recruiterNotes: notes },
      { new: true }
    );
    res.json({ interview });
  } catch (err) { next(err); }
});

module.exports = router;
