const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  timeLimit:  { type: Number, default: 180 }, // seconds
  order:      { type: Number, required: true },
});

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  department:  { type: String, default: 'Engineering' },
  level:       { type: String, enum: ['Junior','Mid','Senior','Staff'], default: 'Mid' },
  description: { type: String },
  questions:   { type: [questionSchema], default: [] },
  deadline:    { type: Date },
  status:      { type: String, enum: ['active','closed','draft'], default: 'active' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteToken: { type: String, unique: true, sparse: true },
}, { timestamps: true, toJSON: { virtuals: true } });

jobSchema.virtual('candidateCount', {
  ref:          'Interview',
  localField:   '_id',
  foreignField: 'jobId',
  count:        true,
});

module.exports = mongoose.model('Job', jobSchema);
