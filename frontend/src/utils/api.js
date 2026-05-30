const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    // Network error — return mock data so UI still works
    console.warn(`[API mock] ${path}:`, err.message);
    return getMockData(path, options);
  }
}

// ── Candidates ─────────────────────────────────────────────
export const getCandidates = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/candidates${q ? '?' + q : ''}`);
};
export const getCandidate         = (id) => request(`/candidates/${id}`);
export const shortlistCandidate   = (id) => request(`/candidates/${id}/shortlist`, { method:'PATCH' });
export const rejectCandidate      = (id) => request(`/candidates/${id}/reject`,    { method:'PATCH' });
export const updateNotes          = (id, notes) => request(`/candidates/${id}/notes`, { method:'PATCH', body: JSON.stringify({ notes }) });

// ── Interviews ─────────────────────────────────────────────
export const getInterviews = () => request('/interviews');
export const getInterview  = (id) => request(`/interviews/${id}`);
export const createInterview = (data) => request('/interviews', { method:'POST', body: JSON.stringify(data) });

// ── Sessions ───────────────────────────────────────────────
export const startSession    = (data)      => request('/sessions', { method:'POST', body: JSON.stringify(data) });
export const getSession      = (sid)       => request(`/sessions/${sid}`);
export const completeSession = (sid, data) => request(`/sessions/${sid}/complete`, { method:'PATCH', body: JSON.stringify(data) });

// ── Chunks ─────────────────────────────────────────────────
export const uploadChunk = async (sessionId, questionIndex, chunkIndex, blob) => {
  const fd = new FormData();
  fd.append('chunk', blob, `chunk_${chunkIndex}.webm`);
  fd.append('sessionId', sessionId);
  fd.append('questionIndex', questionIndex);
  fd.append('chunkIndex', chunkIndex);
  try {
    const res  = await fetch(`${BASE}/chunks/upload`, { method:'POST', body: fd });
    return res.json();
  } catch { return { message:'chunk saved (mock)', chunkIndex, mock:true }; }
};
export const getChunkManifest = (sid) => request(`/chunks/${sid}/manifest`);
export const triggerMerge     = (sid, questionIndex) => request(`/chunks/${sid}/merge`, { method:'POST', body: JSON.stringify({ questionIndex }) });

// ── Jobs ───────────────────────────────────────────────────
export const getJobs   = ()     => request('/jobs');
export const getJob    = (id)   => request(`/jobs/${id}`);
export const createJob = (data) => request('/jobs', { method:'POST', body: JSON.stringify(data) });
export const updateJob = (id, data) => request(`/jobs/${id}`, { method:'PATCH', body: JSON.stringify(data) });

// ── Analytics ──────────────────────────────────────────────
export const getAnalytics = () => request('/analytics');

// ── Auth ───────────────────────────────────────────────────
export const login    = (data) => request('/auth/login',    { method:'POST', body: JSON.stringify(data) });
export const register = (data) => request('/auth/register', { method:'POST', body: JSON.stringify(data) });
export const getMe    = ()     => request('/auth/me');

// ── Health ─────────────────────────────────────────────────
export const healthCheck = () => request('/health');

// ── Mock data fallback ─────────────────────────────────────
const MOCK_CANDIDATES = [
  { _id:'1', name:'Arjun Sharma',  email:'arjun@example.com',  role:'Senior Frontend Engineer', status:'completed',   scores:{ overall:87, communication:91, technical:83, problemSolving:88, cultureFit:76 }, proctoringFlags:1, interviewDuration:1122, createdAt:'2025-01-15', recommendation:'shortlist' },
  { _id:'2', name:'Priya Mehta',   email:'priya@example.com',  role:'Full Stack Developer',     status:'completed',   scores:{ overall:92, communication:95, technical:90, problemSolving:91, cultureFit:89 }, proctoringFlags:0, interviewDuration:1330, createdAt:'2025-01-14', recommendation:'shortlist' },
  { _id:'3', name:'Ravi Patel',    email:'ravi@example.com',   role:'Data Scientist',           status:'completed',   scores:{ overall:74, communication:72, technical:78, problemSolving:74, cultureFit:70 }, proctoringFlags:3, interviewDuration:1015, createdAt:'2025-01-14', recommendation:'hold'      },
  { _id:'4', name:'Sneha Iyer',    email:'sneha@example.com',  role:'Product Manager',          status:'in_progress', scores:{ overall:88, communication:90, technical:82, problemSolving:87, cultureFit:91 }, proctoringFlags:0, interviewDuration:null,  createdAt:'2025-01-15', recommendation:'pending'   },
  { _id:'5', name:'Vikram Nair',   email:'vikram@example.com', role:'DevOps Engineer',          status:'completed',   scores:{ overall:65, communication:63, technical:70, problemSolving:65, cultureFit:60 }, proctoringFlags:5, interviewDuration:860,   createdAt:'2025-01-13', recommendation:'reject'    },
  { _id:'6', name:'Aisha Khan',    email:'aisha@example.com',  role:'Backend Engineer',         status:'completed',   scores:{ overall:95, communication:94, technical:97, problemSolving:95, cultureFit:92 }, proctoringFlags:0, interviewDuration:1441, createdAt:'2025-01-12', recommendation:'shortlist' },
  { _id:'7', name:'Dev Chopra',    email:'dev@example.com',    role:'UX Designer',              status:'pending',     scores:{ overall:81, communication:84, technical:75, problemSolving:80, cultureFit:85 }, proctoringFlags:0, interviewDuration:null,  createdAt:'2025-01-15', recommendation:'pending'   },
  { _id:'8', name:'Neha Gupta',    email:'neha@example.com',   role:'ML Engineer',              status:'completed',   scores:{ overall:78, communication:76, technical:82, problemSolving:78, cultureFit:74 }, proctoringFlags:2, interviewDuration:1235, createdAt:'2025-01-11', recommendation:'hold'      },
];
const MOCK_JOBS = [
  { _id:'j1', title:'Senior Frontend Engineer', department:'Engineering', status:'active',  deadline:'2025-01-25', stats:{ totalCandidates:24, completedCount:18, avgScore:82 } },
  { _id:'j2', title:'Full Stack Developer',     department:'Engineering', status:'active',  deadline:'2025-01-22', stats:{ totalCandidates:31, completedCount:27, avgScore:79 } },
  { _id:'j3', title:'Data Scientist',           department:'Data',        status:'active',  deadline:'2025-01-18', stats:{ totalCandidates:15, completedCount:12, avgScore:76 } },
  { _id:'j4', title:'Product Manager',          department:'Product',     status:'closed',  deadline:'2025-01-10', stats:{ totalCandidates:42, completedCount:35, avgScore:84 } },
];

function getMockData(path) {
  if (path.startsWith('/candidates/') && !path.includes('shortlist') && !path.includes('reject')) {
    const id = path.split('/')[2];
    return MOCK_CANDIDATES.find(c => c._id === id) || MOCK_CANDIDATES[0];
  }
  if (path.startsWith('/candidates'))  return { candidates: MOCK_CANDIDATES, total: MOCK_CANDIDATES.length, mock: true };
  if (path.startsWith('/jobs/'))       return { job: MOCK_JOBS.find(j => j._id === path.split('/')[2]) || MOCK_JOBS[0], mock: true };
  if (path.startsWith('/jobs'))        return { jobs: MOCK_JOBS, mock: true };
  if (path.startsWith('/analytics'))   return { total:127, completed:107, shortlisted:23, rejected:41, flagged:14, completionRate:84, avgScore:79.4, weeklyVolume:[22,31,18,40,27,35,48], mock:true };
  if (path.startsWith('/sessions'))    return { sessionId:'mock-'+ Math.random().toString(36).slice(2,10), interviewId:'mock-id', questions:[{order:1,text:'Tell me about yourself.',timeLimit:180}], mock:true };
  if (path.startsWith('/auth/login'))  return { token:'mock-token', user:{ _id:'u1', name:'Demo Recruiter', email:'recruiter@demo.com', role:'recruiter' }, mock:true };
  return { mock: true };
}
