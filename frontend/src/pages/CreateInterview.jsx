import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import Modal from '../components/Modal';
import { createJob } from '../utils/api';
import { useToast } from '../context/ToastContext';

const DEFAULT_QUESTIONS = [
  'Tell me about yourself and your most impactful project.',
  'Describe a time you solved a complex technical problem under tight deadlines.',
  'How do you handle disagreements with team members about technical direction?',
];
const AI_QUESTIONS = [
  'Describe a situation where you had to learn a new technology under pressure.',
  'How do you balance technical debt against shipping new features?',
  'Tell me about a time you had to give difficult feedback to a peer.',
  'What metrics do you use to measure your own engineering effectiveness?',
  "Describe your process for reviewing a colleague's code.",
];
let aiIdx = 0;

export default function CreateInterview() {
  const nav   = useNavigate();
  const toast = useToast();

  const [form, setForm]         = useState({ title: '', department: 'Engineering', level: 'senior', description: '', deadline: '' });
  const [questions, setQuestions] = useState([...DEFAULT_QUESTIONS]);
  const [newQ, setNewQ]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [createdLink, setCreatedLink] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addQuestion = () => {
    if (!newQ.trim()) return;
    setQuestions(q => [...q, newQ.trim()]);
    setNewQ('');
  };

  const addAIQuestion = () => {
    setQuestions(q => [...q, AI_QUESTIONS[aiIdx % AI_QUESTIONS.length]]);
    aiIdx++;
    toast('✨ AI question added', 'success');
  };

  const removeQuestion = (i) => setQuestions(q => q.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast('Job title is required', 'error'); return; }
    if (questions.length === 0) { toast('Add at least one question', 'error'); return; }
    setLoading(true);
    try {
      const data = await createJob({
        ...form,
        questions: questions.map((text, i) => ({ text, order: i + 1, timeLimit: 180 })),
      });
      setCreatedLink(data.inviteLink);
      toast('Interview created!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {createdLink && (
        <Modal title="🎉 Interview Created!" subtitle={`Your interview for "${form.title}" is live.`}
          onClose={() => { setCreatedLink(null); nav('/dashboard'); }}
          actions={[
            { label: 'Copy Link',       className: 'btn-gold',    onClick: () => { navigator.clipboard?.writeText(`https://interview.ai/join/${createdLink}`).catch(()=>{}); toast('Link copied!','success'); } },
            { label: 'View Dashboard',  className: 'btn-outline', onClick: () => nav('/dashboard') },
          ]}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontFamily: 'monospace', fontSize: '.84rem', wordBreak: 'break-all', marginBottom: 8 }}>
            https://interview.ai/join/{createdLink}
          </div>
          <div style={{ fontSize: '.8rem', color: 'rgba(10,10,15,.4)' }}>Share this link with candidates. It expires on your set deadline.</div>
        </Modal>
      )}

      <div className="main page-enter">
        <div className="page-header">
          <div>
            <div className="page-title">Create Interview</div>
            <div className="page-sub">Set up a new automated screening interview</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => nav('/dashboard')}>← Dashboard</button>
        </div>

        <div style={{ maxWidth: 700 }}>
          <div className="form-group">
            <label className="form-label">Job Title <span>*</span></label>
            <input className="form-input" type="text" placeholder="e.g. Senior Frontend Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                {['Engineering','Product','Design','Data','Operations'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select className="form-select" value={form.level} onChange={e => set('level', e.target.value)}>
                <option value="junior">Junior (0–2 yrs)</option>
                <option value="mid">Mid (2–5 yrs)</option>
                <option value="senior">Senior (5+ yrs)</option>
                <option value="staff">Staff / Principal</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description</label>
            <textarea className="form-textarea" placeholder="Brief description of the role and requirements…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Response Time Limit</label>
              <select className="form-select">
                <option>2 minutes</option><option selected>3 minutes</option><option>5 minutes</option><option>No limit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Interview Deadline</label>
              <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: 26 }}>
            <label className="form-label">Interview Questions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12 }}>
              {questions.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', transition: 'var(--transition)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: '.86rem', lineHeight: 1.55 }}>{q}</div>
                  <span style={{ color: 'rgba(10,10,15,.3)', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px', transition: 'var(--transition)' }}
                    onClick={() => removeQuestion(i)}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,15,.3)'}>✕</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
              <input className="form-input" type="text" placeholder="Type a custom question…" value={newQ} onChange={e => setNewQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuestion()} style={{ flex: 1 }} />
              <button className="btn btn-outline" onClick={addQuestion}>+ Add</button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={addAIQuestion}>✨ Suggest AI Question</button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating…' : 'Create & Generate Link'}
            </button>
            <button className="btn btn-outline" onClick={() => nav('/dashboard')}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
