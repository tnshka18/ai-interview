const mongoose = require('mongoose');

const proctoringEventSchema = new mongoose.Schema({
  type:      { type: String, enum: ['tab_switch','face_absent','face_multiple','audio_silence','window_blur'], required: true },
  timestamp: { type: Date, default: Date.now },
  duration:  { type: Number }, // seconds
  videoTime: { type: Number }, // seconds into recording
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  transcript:    { type: String, default: '' },
  duration:      { type: Number, default: 0 }, // seconds recorded
  chunksCount:   { type: Number, default: 0 },
  s3Keys:        [{ type: String }],
  mergedKey:     { type: String },
  aiScore:       { type: Number },
  aiNotes:       { type: String },
}, { _id: false });

const sessionDataSchema = new mongoose.Schema({
  questionIndex:    { type: Number, default: 0 },
  chunks:           [{ index: Number, size: Number, s3Key: String, ts: Date }],
  proctoring_events: [proctoringEventSchema],
  answers:          [answerSchema],
  reconnects:       { type: Number, default: 0 },
  lastActive:       { type: Date, default: Date.now },
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  candidateId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  jobId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  recruiterId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: ['pending','in_progress','completed','expired'], default: 'pending' },
  aiScore:         { type: Number, min: 0, max: 100 },
  aiEvaluation:    { type: String },
  proctoringFlags: { type: Number, default: 0 },
  duration:        { type: Number, default: 0 }, // total seconds
  session_data:    { type: sessionDataSchema, default: () => ({}) },
  shortlisted:     { type: Boolean, default: false },
  rejected:        { type: Boolean, default: false },
  recruiterNotes:  { type: String },
  startedAt:       { type: Date },
  completedAt:     { type: Date },
}, { timestamps: true });

// Index for fast candidate lookups
interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
