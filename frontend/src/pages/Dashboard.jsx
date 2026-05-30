import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { getCandidates, getJobs, getAnalytics } from '../utils/api';
import { useToast } from '../context/ToastContext';

const AVATAR_COLORS = ['#c9a84c','#2a6be8','#1a8a5a','#e8462a','#9b59b6','#e67e22','#1abc9c','#e91e9c'];
function initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function scoreColor(s) { return s >= 85 ? 'var(--green)' : s >= 70 ? 'var(--gold-dark)' : 'var(--red)'; }
function fmtDuration(s) {
  if (!s) return '—';
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function StatusBadge({ status }) {
  const map = { completed: ['badge-green', '✓ Completed'], in_progress: ['badge-yellow', '● In Progress'], pending: ['badge-gray', '○ Pending'], abandoned: ['badge-red', '✕ Abandoned'] };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Candidates Tab ────────────────────────────────────────────
function CandidatesTab({ onSelectCandidate }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search)           params.search  = search;
      const data = await getCandidates(params);
      setCandidates(data.candidates || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally { setLoading(false); }
  }, [filter, search]); // eslint-disable-line

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const filters = [
    ['all', 'All'],
    ['completed', 'Completed'],
    ['in_progress', 'In Progress'],
    ['pending', 'Pending'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {filters.map(([val, label]) => (
          <button key={val} className={`tab ${filter === val ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '.8rem' }}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search-wrap">
            <span style={{ opacity: .45 }}>🔍</span>
            <input placeholder="Search candidates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>{candidates.length} results</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th><th>Position</th><th>AI Score</th>
                  <th>Status</th><th>Flags</th><th>Duration</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c._id} onClick={() => onSelectCandidate(c._id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div className="avatar" style={{ background: `${AVATAR_COLORS[i % AVATAR_COLORS.length]}20`, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '.88rem' }}>{c.name}</div>
                          <div style={{ fontSize: '.75rem', color: 'rgba(10,10,15,.4)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '.84rem', color: 'rgba(10,10,15,.6)' }}>{c.role}</td>
                    <td>
                      <div className="score-bar-wrap">
                        <div className="score-bar">
                          <div className="score-bar-fill" style={{ width: `${c.scores?.overall || 0}%`, background: scoreColor(c.scores?.overall || 0) }} />
                        </div>
                        <span className="score-text" style={{ color: scoreColor(c.scores?.overall || 0) }}>
                          {c.status === 'pending' ? '—' : c.scores?.overall || 0}
                        </span>
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.proctoringFlags > 0
                        ? <span className="badge badge-yellow">⚠ {c.proctoringFlags}</span>
                        : <span className="badge badge-green">✓ Clean</span>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.83rem' }}>{fmtDuration(c.interviewDuration)}</td>
                    <td style={{ fontSize: '.78rem', color: 'rgba(10,10,15,.4)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); onSelectCandidate(c._id); }}>
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'rgba(10,10,15,.35)' }}>No candidates found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const nav   = useNavigate();

  useEffect(() => {
    getJobs().then(d => setJobs(d.jobs || [])).catch(e => toast(e.message, 'error')).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
      {jobs.map(j => (
        <div key={j._id} className="card" style={{ cursor: 'pointer' }} onClick={() => toast('Opening job board…', 'info')}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{j.title}</div>
              <div style={{ fontSize: '.78rem', color: 'rgba(10,10,15,.4)' }}>Deadline: {j.deadline ? new Date(j.deadline).toLocaleDateString() : '—'}</div>
            </div>
            <span className={`badge ${j.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
              {j.status === 'active' ? '● Active' : 'Closed'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {[['Candidates', j.stats?.totalCandidates || 0], ['Completed', j.stats?.completedCount || 0]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(10,10,15,.4)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.79rem', marginBottom: 5 }}>
              <span>Avg Score</span><span style={{ fontWeight: 600 }}>{j.stats?.avgScore || 0}/100</span>
            </div>
            <div className="score-bar" style={{ height: 7 }}>
              <div className="score-bar-fill" style={{ width: `${j.stats?.avgScore || 0}%`, background: 'var(--gold)' }} />
            </div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }}>View Candidates →</button>
        </div>
      ))}
      <div className="card" style={{ border: '2px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', minHeight: 220 }}
        onClick={() => nav('/dashboard/create')}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
        <span style={{ fontSize: '2rem', opacity: .4 }}>+</span>
        <span style={{ fontSize: '.88rem', color: 'rgba(10,10,15,.4)', fontWeight: 500 }}>Create New Job</span>
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────
function AnalyticsTab() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    getAnalytics().then(setData).catch(e => toast(e.message, 'error')).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const metrics = [
    ['Total Interviews',  data?.total || 0,                '+12 this week',       true],
    ['Completion Rate',   `${data?.completionRate || 0}%`, '+3% vs last month',   true],
    ['Avg AI Score',      data?.avgScore || 0,             '−1.2 vs last month',  false],
    ['Flagged Sessions',  `${data?.flagged || 0}`,         '−2% vs last month',   true],
  ];

  const scoreDist = [['90–100 (Excellent)', 18, 'var(--green)'], ['75–89 (Good)', 42, 'var(--gold)'], ['60–74 (Fair)', 28, 'var(--accent2)'], ['< 60 (Poor)', 12, 'var(--red)']];
  const topRoles  = [['Product Manager', 88], ['UX Designer', 84], ['Frontend Eng', 82], ['Data Scientist', 76], ['DevOps', 71]];
  const weekly    = [22, 31, 18, 40, 27, 35, 48];
  const days      = ['Mo','Tu','We','Th','Fr','Sa','Su'];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18, marginBottom: 24 }}>
        {metrics.map(([label, val, change, up]) => (
          <div key={label} className="card">
            <div style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(10,10,15,.4)', marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 8 }}>{val}</div>
            <div style={{ fontSize: '.78rem', color: up ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {up ? '↑' : '↓'} {change}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 18 }}>Score Distribution</div>
          {scoreDist.map(([label, val, color]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 5 }}>
                <span>{label}</span><span style={{ fontWeight: 600 }}>{val}%</span>
              </div>
              <div className="score-bar" style={{ height: 9 }}>
                <div className="score-bar-fill" style={{ width: `${val}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 18 }}>Top Performing Roles</div>
          {topRoles.map(([label, val]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 5 }}>
                <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
              </div>
              <div className="score-bar" style={{ height: 9 }}>
                <div className="score-bar-fill" style={{ width: `${val}%`, background: 'var(--gold)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 18 }}>Weekly Interview Volume</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, paddingBottom: 6 }}>
          {weekly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'rgba(10,10,15,.4)' }}>{v}</span>
              <div style={{ width: '100%', background: i === 6 ? 'var(--gold)' : 'var(--ink)', borderRadius: '4px 4px 0 0', height: `${v / 48 * 100}%`, minHeight: 4, opacity: i === 6 ? 1 : 0.45 + i * 0.08, transition: 'height .8s ease' }} />
              <span style={{ fontSize: '.7rem', color: 'rgba(10,10,15,.35)' }}>{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Shell ───────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState('candidates');

  const TABS = [
    ['candidates', 'All Candidates'],
    ['jobs',       'Job Openings'],
    ['analytics',  'Analytics'],
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div className="main page-enter">
        <div className="page-header">
          <div>
            <div className="page-title">Recruiter Dashboard</div>
            <div className="page-sub">Manage interviews, review candidates, and track progress</div>
          </div>
          <button className="btn btn-gold" onClick={() => nav('/dashboard/create')}>+ Create Interview</button>
        </div>

        <div className="tabs" style={{ marginBottom: 28 }}>
          {TABS.map(([val, label]) => (
            <button key={val} className={`tab ${tab === val ? 'active' : ''}`} onClick={() => setTab(val)}>{label}</button>
          ))}
        </div>

        <div className="page-enter">
          {tab === 'candidates' && <CandidatesTab onSelectCandidate={(id) => nav(`/dashboard/candidate/${id}`)} />}
          {tab === 'jobs'       && <JobsTab />}
          {tab === 'analytics'  && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
}
