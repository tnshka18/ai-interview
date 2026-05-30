# 🎙️ InterviewAI — Full-Stack Automated Video Screening Platform

React frontend + Node.js/Express backend. Real-time WebSocket streaming, chunk upload, proctoring, AI scoring dashboard.

---

## 🚀 Quick Start (3 commands)

```bash
# 1. Install all dependencies
npm run install:all

# 2. Copy and configure environment
cp backend/.env.example backend/.env

# 3. Start both servers simultaneously
npm run dev
```

- **Frontend** → http://localhost:3000
- **Backend**  → http://localhost:5000
- **WS**       → ws://localhost:5000/ws

> No MongoDB? No problem. The app auto-detects a missing DB and serves mock data — every page works out of the box.

---

## 📁 Project Structure

```
interview-ai/
├── frontend/                        React (CRA)
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx          Marketing home page
│       │   ├── Dashboard.jsx        Recruiter dashboard (3 tabs)
│       │   ├── CandidateReview.jsx  Video + transcript + scoring
│       │   ├── CreateInterview.jsx  Job + question builder
│       │   ├── CandidatePortal.jsx  Candidate-facing portal
│       │   ├── HardwareCheck.jsx    Camera/mic/network check
│       │   └── Interview.jsx        Live recording session
│       ├── components/
│       │   ├── Nav.jsx              Shared nav bar
│       │   └── Modal.jsx            Reusable dialog
│       ├── context/ToastContext.jsx  Global toasts
│       ├── hooks/useWebSocket.js    WS hook with auto-reconnect
│       ├── utils/api.js             All API calls + mock fallback
│       └── styles/globals.css       Full design system
│
├── backend/
│   └── src/
│       ├── server.js                Entry point
│       ├── config/
│       │   ├── db.js                MongoDB connection
│       │   └── seed.js              Demo data seeder
│       ├── services/
│       │   └── websocket.service.js WS server + session store
│       ├── middleware/
│       │   ├── auth.middleware.js   JWT protect + requireRole
│       │   └── error.middleware.js  Global error handler
│       ├── models/
│       │   ├── User.model.js        Recruiter accounts
│       │   ├── Candidate.model.js   Candidate profiles
│       │   ├── Job.model.js         Job openings + questions
│       │   └── Interview.model.js   Session data + scores + proctoring
│       └── routes/
│           ├── auth.routes.js       POST /login /register  GET /me
│           ├── candidate.routes.js  GET/PATCH candidates
│           ├── interview.routes.js  CRUD interviews
│           ├── session.routes.js    POST/GET/PATCH sessions
│           ├── chunk.routes.js      POST upload  GET manifest  POST merge
│           ├── job.routes.js        CRUD jobs
│           └── analytics.routes.js  GET analytics
│
└── package.json                     Root scripts (concurrently)
```

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create recruiter account |
| POST | `/api/auth/login` | Login → JWT token |
| GET  | `/api/auth/me` | Get current user |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/candidates` | List all (search, filter by status) |
| GET    | `/api/candidates/:id` | Single candidate with interview data |
| PATCH  | `/api/candidates/:id/shortlist` | Shortlist candidate |
| PATCH  | `/api/candidates/:id/reject` | Reject candidate |
| PATCH  | `/api/candidates/:id/notes` | Add recruiter notes |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/sessions` | Start interview session |
| GET    | `/api/sessions/:id` | Get / resume session |
| PATCH  | `/api/sessions/:id/complete` | Mark complete |

### Chunks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/chunks/upload` | Upload media chunk (multipart) |
| GET    | `/api/chunks/:sessionId/manifest` | List all received chunks |
| POST   | `/api/chunks/:sessionId/merge` | Trigger merge job |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/jobs` | All jobs with stats |
| POST   | `/api/jobs` | Create job + generate invite link |
| GET    | `/api/jobs/:id` | Single job |
| PATCH  | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/analytics` | Platform-wide metrics |

---

## 🔌 WebSocket Events

Connect to `ws://localhost:5000/ws`

| Event (→ server) | Payload | Effect |
|------------------|---------|--------|
| `session_join` | `{sessionId, candidateName}` | Create or resume session |
| `chunk_meta` | `{sessionId, questionIndex, chunkIndex, size}` | Register chunk metadata |
| `proctoring_event` | `{sessionId, event}` | Log flag, notify watching recruiters |
| `answer_complete` | `{sessionId, questionIndex, duration}` | Save answer, advance question |
| `interview_complete` | `{sessionId}` | Mark interview done |
| `recruiter_watch` | `{sessionId}` | Live monitor a session |

| Event (← server) | Meaning |
|------------------|---------|
| `connected` | Handshake successful |
| `session_created` | New session initialised |
| `session_restored` | Resume data sent |
| `chunk_ack` | Chunk confirmed (or marked duplicate) |
| `proctoring_ack` | Flag logged |
| `proctoring_flag` | Broadcast to watching recruiter |
| `answer_saved` | Answer persisted |
| `interview_done` | Summary sent |

---

## 🗂️ App Routes (Frontend)

| URL | Page | Who |
|-----|------|-----|
| `/` | Landing page | Public |
| `/dashboard` | Recruiter dashboard | Recruiter |
| `/dashboard/candidate/:id` | Candidate review | Recruiter |
| `/dashboard/create` | Create interview | Recruiter |
| `/candidate` | Candidate portal | Candidate |
| `/candidate/hwcheck` | Hardware check | Candidate |
| `/candidate/interview` | Live interview | Candidate |

---

## 🌱 Seed Demo Data

```bash
# Requires MongoDB running
npm run seed
# Login: recruiter@interviewai.com / password123
```

---

## 🏗️ Production Roadmap

| Feature | Status | Notes |
|---------|--------|-------|
| REST API + WebSocket | ✅ Complete | |
| Mock fallback (no DB) | ✅ Complete | |
| MongoDB models | ✅ Complete | |
| JWT Auth | ✅ Complete | |
| Chunk streaming | ✅ Complete | In-memory store |
| S3 chunk storage | 🔜 Wiring only | Replace multer memoryStorage |
| FFmpeg merge | 🔜 Simulated | Enqueue to SQS → Lambda |
| Deepgram transcription | 🔜 Wiring only | Add DEEPGRAM_API_KEY |
| AI scoring | 🔜 Stubbed | Connect LLM evaluator |

## Deployment link:
https://ai-interview-1-fluy.onrender.com/

## Submission Date:
31/05/2026
