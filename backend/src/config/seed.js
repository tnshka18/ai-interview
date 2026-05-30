require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./db');
const User = require('../models/User.model');
const Job = require('../models/Job.model');
const Interview = require('../models/Interview.model');
const Candidate = require('../models/Candidate.model');

const seed = async () => {
  await connectDB();

  // Clear existing
  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Interview.deleteMany({}),
    Candidate.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Recruiter user
  const hash = await bcrypt.hash('password123', 10);
  const recruiter = await User.create({
    name: 'Rahul Verma',
    email: 'recruiter@interviewai.com',
    password: hash,
    role: 'recruiter',
  });

  // Jobs
  const jobs = await Job.insertMany([
    { title: 'Senior Frontend Engineer', department: 'Engineering', level: 'Senior', createdBy: recruiter._id, deadline: new Date('2025-02-01'), status: 'active' },
    { title: 'Full Stack Developer',     department: 'Engineering', level: 'Mid',    createdBy: recruiter._id, deadline: new Date('2025-02-05'), status: 'active' },
    { title: 'Data Scientist',           department: 'Data',        level: 'Senior', createdBy: recruiter._id, deadline: new Date('2025-01-28'), status: 'active' },
    { title: 'Product Manager',          department: 'Product',     level: 'Senior', createdBy: recruiter._id, deadline: new Date('2025-01-10'), status: 'closed' },
  ]);

  // Candidates & their sessions
  const candidateData = [
    { name: 'Arjun Sharma',  email: 'arjun@example.com',  company: 'Google',    score: 87, status: 'completed', flags: 1 },
    { name: 'Priya Mehta',   email: 'priya@example.com',  company: 'Stripe',    score: 92, status: 'completed', flags: 0 },
    { name: 'Ravi Patel',    email: 'ravi@example.com',   company: 'Amazon',    score: 74, status: 'completed', flags: 3 },
    { name: 'Sneha Iyer',    email: 'sneha@example.com',  company: 'Microsoft', score: 88, status: 'in_progress', flags: 0 },
    { name: 'Vikram Nair',   email: 'vikram@example.com', company: 'Netflix',   score: 65, status: 'completed', flags: 5 },
    { name: 'Aisha Khan',    email: 'aisha@example.com',  company: 'Meta',      score: 95, status: 'completed', flags: 0 },
    { name: 'Dev Chopra',    email: 'dev@example.com',    company: 'Airbnb',    score: 81, status: 'pending',   flags: 0 },
    { name: 'Neha Gupta',    email: 'neha@example.com',   company: 'Apple',     score: 78, status: 'completed', flags: 2 },
  ];

  for (const cd of candidateData) {
    const candidate = await Candidate.create({
      name: cd.name,
      email: cd.email,
      company: cd.company,
      jobId: jobs[0]._id,
    });

    await Interview.create({
      candidateId: candidate._id,
      jobId: jobs[0]._id,
      recruiterId: recruiter._id,
      status: cd.status,
      aiScore: cd.score,
      proctoringFlags: cd.flags,
      session_data: {
        questionIndex: cd.status === 'completed' ? 3 : cd.status === 'in_progress' ? 1 : 0,
        chunks: [],
        proctoring_events: [],
        answers: cd.status === 'completed' ? [
          { questionIndex: 0, transcript: "I'm a senior engineer with 7 years of experience primarily working with React and TypeScript. My most impactful project was leading a checkout redesign that reduced cart abandonment by 34%.", duration: 142 },
          { questionIndex: 1, transcript: "Six months ago our payment pipeline dropped 3% of transactions. I traced it to a race condition in our queue handler and fixed it with a distributed Redis lock.", duration: 118 },
          { questionIndex: 2, transcript: "I separate ego from technical decisions. I articulate my reasoning clearly, listen actively, then propose a timebox experiment if we're still misaligned.", duration: 95 },
        ] : [],
      },
    });
  }

  console.log(`✅ Seeded: 1 recruiter, ${jobs.length} jobs, ${candidateData.length} candidates`);
  console.log('\n📧 Login: recruiter@interviewai.com / password123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
