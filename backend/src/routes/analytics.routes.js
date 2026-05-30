const express   = require('express');
const Interview = require('../models/Interview.model');

const router = express.Router();

// GET /api/analytics
router.get('/', async (req, res, next) => {
  try {
    try {
      const [total, completed, shortlisted, rejected, flaggedArr, scoreAgg, weeklyArr] = await Promise.all([
        Interview.countDocuments(),
        Interview.countDocuments({ status: 'completed' }),
        Interview.countDocuments({ shortlisted: true }),
        Interview.countDocuments({ rejected: true }),
        Interview.countDocuments({ proctoringFlags: { $gt: 0 } }),
        Interview.aggregate([{ $match: { status:'completed', aiScore:{ $gt:0 } } }, { $group:{ _id:null, avg:{ $avg:'$aiScore' } } }]),
        Interview.aggregate([
          { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
          { $group: { _id: { $dayOfWeek:'$createdAt' }, count:{ $sum:1 } } },
          { $sort: { '_id':1 } },
        ]),
      ]);

      return res.json({
        total, completed, shortlisted, rejected,
        flagged:        flaggedArr,
        completionRate: total ? Math.round(completed / total * 100) : 0,
        avgScore:       scoreAgg[0]?.avg ? Math.round(scoreAgg[0].avg * 10) / 10 : 0,
        weeklyVolume:   weeklyArr,
      });
    } catch {
      // Mock fallback
      return res.json({
        total:127, completed:107, shortlisted:23, rejected:41, flagged:14,
        completionRate:84, avgScore:79.4,
        weeklyVolume:[22,31,18,40,27,35,48],
        mock:true,
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
