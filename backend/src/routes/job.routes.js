const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth.middleware');
const Job       = require('../models/Job.model');
const Interview = require('../models/Interview.model');

const router = express.Router();

const MOCK_JOBS = [
  { _id:'j1', title:'Senior Frontend Engineer', department:'Engineering', level:'Senior', status:'active',  deadline:'2025-01-25', inviteToken:'INV-ABC123', stats:{ totalCandidates:24, completedCount:18, avgScore:82, shortlisted:5 } },
  { _id:'j2', title:'Full Stack Developer',     department:'Engineering', level:'Mid',    status:'active',  deadline:'2025-01-22', inviteToken:'INV-DEF456', stats:{ totalCandidates:31, completedCount:27, avgScore:79, shortlisted:8 } },
  { _id:'j3', title:'Data Scientist',           department:'Data',        level:'Senior', status:'active',  deadline:'2025-01-18', inviteToken:'INV-GHI789', stats:{ totalCandidates:15, completedCount:12, avgScore:76, shortlisted:3 } },
  { _id:'j4', title:'Product Manager',          department:'Product',     level:'Senior', status:'closed',  deadline:'2025-01-10', inviteToken:'INV-JKL012', stats:{ totalCandidates:42, completedCount:35, avgScore:84, shortlisted:10 } },
];

// GET /api/jobs
router.get('/', async (req, res, next) => {
  try {
    try {
      const jobs = await Job.find().sort('-createdAt').lean();
      // Attach stats via aggregation
      const withStats = await Promise.all(jobs.map(async (j) => {
        const [total, completed, shortlisted] = await Promise.all([
          Interview.countDocuments({ jobId: j._id }),
          Interview.countDocuments({ jobId: j._id, status: 'completed' }),
          Interview.countDocuments({ jobId: j._id, shortlisted: true }),
        ]);
        const scoreAgg = await Interview.aggregate([
          { $match: { jobId: j._id, status: 'completed' } },
          { $group: { _id: null, avg: { $avg: '$aiScore' } } },
        ]);
        return { ...j, stats: { totalCandidates: total, completedCount: completed, shortlisted, avgScore: Math.round(scoreAgg[0]?.avg || 0) } };
      }));
      return res.json({ jobs: withStats });
    } catch {
      return res.json({ jobs: MOCK_JOBS, mock: true });
    }
  } catch (err) { next(err); }
});

// POST /api/jobs
router.post('/', [
  body('title').trim().notEmpty().withMessage('Job title required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { title, department, level, description, questions, deadline } = req.body;
    const inviteToken = 'INV-' + uuidv4().slice(0,8).toUpperCase();

    try {
      // Use a placeholder recruiterId if auth not provided (mock mode)
      const recruiterId = req.user?._id || new (require('mongoose').Types.ObjectId)();
      const job = await Job.create({ title, department, level, description, questions: questions || [], deadline, inviteToken, createdBy: recruiterId });
      return res.status(201).json({ job, inviteToken, inviteLink: `https://interview.ai/join/${inviteToken}` });
    } catch {
      return res.status(201).json({ job: { _id: 'mock-' + Date.now(), title, department, status:'active', inviteToken }, inviteToken, inviteLink: `https://interview.ai/join/${inviteToken}`, mock: true });
    }
  } catch (err) { next(err); }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res, next) => {
  try {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json({ job });
    } catch {
      const job = MOCK_JOBS.find(j => j._id === req.params.id);
      if (!job) return res.status(404).json({ error: 'Not found' });
      return res.json({ job, mock: true });
    }
  } catch (err) { next(err); }
});

// PATCH /api/jobs/:id
router.patch('/:id', protect, async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) { next(err); }
});

// DELETE /api/jobs/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
