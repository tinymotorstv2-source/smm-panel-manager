import React, { useState, useMemo } from 'react';
import { 
  Activity, Pause, Play, Clock, CheckCircle2, AlertCircle, Edit2, 
  Calendar, Zap, ExternalLink, Layers, Search, Eye, Heart, 
  MessageSquare, Share2, Bookmark, CheckCircle, TrendingUp, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

export default function JobDashboard({ jobs, onJobUpdated }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleJobStatus = async (id) => {
    try {
      await axios.post(`/api/jobs/${id}/toggle`);
      onJobUpdated();
    } catch (err) {
      console.error('Error toggling job', err);
    }
  };

  // Compute Overall Analytics
  const analytics = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return { total: 0, running: 0, completed: 0, paused: 0, sent: 0, target: 0, progress: 0 };
    }

    const running = jobs.filter(j => j.status === 'running').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const paused = jobs.filter(j => j.status === 'paused').length;
    const sent = jobs.reduce((acc, j) => acc + (j.totalSent || 0), 0);
    const target = jobs.reduce((acc, j) => acc + (j.totalQuantity || 0), 0);
    const progress = target > 0 ? Math.round((sent / target) * 100) : 0;

    return { total: jobs.length, running, completed, paused, sent, target, progress };
  }, [jobs]);

  // Filter and Search logic
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
      const matchesSearch = !searchQuery || 
        j.targetLink.toLowerCase().includes(searchQuery.toLowerCase()) || 
        j.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(j.serviceId).includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [jobs, filterStatus, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 4 Crystal Analytic Cubes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Cube 1: Active Campaigns */}
        <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Campaigns
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} color="#818cf8" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              {analytics.running}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              / {analytics.total} total
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            {analytics.completed} completed • {analytics.paused} paused
          </div>
        </div>

        {/* Cube 2: Delivered Engagements */}
        <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Delivered
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color="#34d399" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              {analytics.sent.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
              {analytics.progress}%
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Target: {analytics.target.toLocaleString()} units
          </div>
        </div>

        {/* Cube 3: Real-Time Delivery Pulse */}
        <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Velocity
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#f472b6" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              {analytics.running > 0 ? 'Active' : 'Standby'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Organic randomized drip intervals
          </div>
        </div>

        {/* Cube 4: Botting Shield Status */}
        <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Algorithm Safety
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} color="#22d3ee" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>
              Protected
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Non-linear curve & anti-flag delays
          </div>
        </div>
      </div>

      {/* Search Bar & Filter Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(15, 17, 28, 0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-crystal)',
        borderRadius: 'var(--radius-md)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search campaigns, links, services..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.5rem 0.75rem 0.5rem 2.4rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'running', 'paused', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                background: filterStatus === status ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                border: filterStatus === status ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                color: filterStatus === status ? '#fff' : 'var(--text-secondary)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease'
              }}
            >
              {status} ({status === 'all' ? jobs.length : jobs.filter(j => j.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      {filteredJobs.length === 0 ? (
        <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3.5rem 1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Campaigns Found</h3>
          <p style={{ fontSize: '0.875rem' }}>
            {jobs.length === 0 ? "You haven't launched any campaigns yet. Start one from the New Campaign tab!" : "No campaigns match your current search or filter."}
          </p>
        </div>
      ) : (
        <div className="job-list">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onToggle={() => toggleJobStatus(job.id)} onJobUpdated={onJobUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onToggle, onJobUpdated }) {
  const [runs, setRuns] = useState([]);
  const [showRuns, setShowRuns] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [newTimeOffset, setNewTimeOffset] = useState(2); 

  const fetchRuns = async () => {
    if (!showRuns) {
      setLoadingRuns(true);
      try {
        const res = await axios.get(`/api/jobs/${job.id}/runs`);
        setRuns(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRuns(false);
      }
    }
    setShowRuns(!showRuns);
  };

  const handleEditTime = async () => {
    try {
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + newTimeOffset);
      await axios.post(`/api/jobs/${job.id}/time`, { nextRunAt: nextRun.toISOString() });
      setEditingTime(false);
      onJobUpdated();
    } catch (err) {
      alert("Failed to update time");
    }
  };

  const progressPercentage = Math.min(100, (job.totalSent / job.totalQuantity) * 100);
  const remaining = Math.max(0, job.totalQuantity - job.totalSent);

  // Remaining time calculation
  const deadlineRemainingText = useMemo(() => {
    if (job.status === 'completed') return 'Completed';
    const now = new Date();
    const deadline = new Date(job.deadlineAt);
    const diffMs = deadline - now;
    if (diffMs <= 0) return 'Deadline Reached';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  }, [job.deadlineAt, job.status]);

  const getActionIcon = () => {
    switch (job.actionType) {
      case 'views': return <Eye size={13} color="#c084fc" />;
      case 'likes': return <Heart size={13} color="#60a5fa" />;
      case 'comments': return <MessageSquare size={13} color="#4ade80" />;
      case 'shares': return <Share2 size={13} color="#fb923c" />;
      case 'saves': return <Bookmark size={13} color="#f472b6" />;
      default: return <Activity size={13} color="#c084fc" />;
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case 'running': 
        return <span className="status-badge status-running"><Activity size={12} className="spin" /> Running</span>;
      case 'completed': 
        return <span className="status-badge status-completed"><CheckCircle size={12} /> Completed</span>;
      case 'paused': 
        return <span className="status-badge status-paused"><Pause size={12} /> Paused</span>;
      default: return null;
    }
  };

  return (
    <div className="card job-card animate-fade-in" style={{ padding: '1.75rem' }}>
      
      {/* Top Header */}
      <div className="job-header" style={{ marginBottom: '1.25rem' }}>
        <div className="job-meta" style={{ flex: 1, minWidth: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Action Pill */}
            <span style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textTransform: 'uppercase', 
              fontWeight: 700, 
              fontSize: '0.75rem', 
              letterSpacing: '0.05em',
              color: '#fff'
            }}>
              {getActionIcon()}
              {job.actionType}
            </span>

            {/* Campaign ID */}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              #JOB-{job.id}
            </span>

            {/* Status */}
            {getStatusBadge()}
          </div>

          {/* Target Link */}
          <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a 
              href={job.targetLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="job-link" 
              style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Open Target Post"
            >
              {job.targetLink}
              <ExternalLink size={13} color="var(--text-tertiary)" />
            </a>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            <span>Provider Service ID: <strong style={{ color: '#cbd5e1' }}>{job.serviceId}</strong></span>
            <span>Created: <strong style={{ color: '#cbd5e1' }}>{new Date(job.createdAt).toLocaleDateString()}</strong></span>
          </div>
        </div>
        
        {/* Play/Pause Control */}
        {job.status !== 'completed' && (
          <button 
            onClick={onToggle}
            className="btn btn-secondary" 
            style={{ 
              padding: '0.65rem', 
              borderRadius: '50%',
              background: job.status === 'running' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              borderColor: job.status === 'running' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
              color: job.status === 'running' ? '#fbbf24' : '#34d399'
            }}
            title={job.status === 'running' ? 'Pause Campaign' : 'Resume Campaign'}
          >
            {job.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}
      </div>

      {/* Progress Section */}
      <div className="progress-container" style={{ margin: '1.25rem 0' }}>
        <div className="progress-header" style={{ marginBottom: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong>{job.totalSent.toLocaleString()}</strong> sent of <strong>{job.totalQuantity.toLocaleString()}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({remaining.toLocaleString()} left)</span>
          </span>
          <span style={{ 
            fontFamily: 'JetBrains Mono, monospace', 
            fontWeight: 700, 
            color: progressPercentage === 100 ? '#10b981' : '#a855f7',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px'
          }}>
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar-bg" style={{ height: '8px' }}>
          <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      {/* 4 Detail Stats Cubes inside each card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        marginTop: '1.25rem',
        padding: '1rem',
        background: 'rgba(8, 10, 18, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 'var(--radius-md)'
      }}>
        {/* Stat 1: Deadline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={12} color="var(--accent-primary)" />
            Deadline & Timer
          </span>
          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
            {deadlineRemainingText}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Due: {new Date(job.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Stat 2: Chunks & Runs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={12} color="#38bdf8" />
            Runs Executed
          </span>
          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            {job.runCount || 0} {job.targetRuns ? `/ ${job.targetRuns}` : 'runs'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            {job.targetRuns ? 'Manual Chunking Mode' : 'Smart Dynamic Slicing'}
          </span>
        </div>

        {/* Stat 3: Next Scheduled Pulse */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={12} color="#fbbf24" />
            Next Pulse
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
              {job.nextRunAt && job.status === 'running' ? new Date(job.nextRunAt).toLocaleTimeString() : '-'}
            </span>
            
            {job.status === 'running' && !editingTime && (
              <button 
                onClick={() => setEditingTime(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }}
                title="Shift Next Run Time"
              >
                <Edit2 size={12} />
              </button>
            )}

            {editingTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#000', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #333' }}>
                <input 
                  type="number" 
                  value={newTimeOffset}
                  onChange={e => setNewTimeOffset(parseInt(e.target.value) || 0)}
                  style={{ width: '45px', padding: '2px', fontSize: '0.75rem', background: 'transparent', border: 'none' }}
                  min="0"
                /> 
                <span style={{ fontSize: '0.7rem', color: '#888' }}>min</span>
                <button onClick={handleEditTime} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '3px', padding: '1px 5px', fontSize: '0.7rem', cursor: 'pointer' }}>OK</button>
                <button onClick={() => setEditingTime(false)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            {job.status === 'running' ? 'Auto-queued background trigger' : 'Paused'}
          </span>
        </div>

        {/* Stat 4: Estimated Completion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={12} color="#34d399" />
            Estimated Speed
          </span>
          <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            {Math.round(job.totalQuantity / Math.max(1, (new Date(job.deadlineAt) - new Date(job.createdAt)) / (1000 * 60 * 60))).toLocaleString()} / hr
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Calculated target pacing
          </span>
        </div>
      </div>

      {/* Execution Logs Button & Drawer */}
      <div style={{ marginTop: '1.25rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={fetchRuns} 
          style={{ width: '100%', fontSize: '0.825rem', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Activity size={14} />
          {showRuns ? 'Hide Execution Logs' : `View Execution History (${job.runCount || 0} Dispatched Runs)`}
        </button>
      </div>

      {showRuns && (
        <div className="runs-list animate-fade-in" style={{ marginTop: '1rem' }}>
          {loadingRuns ? (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1.5rem' }}>
              Loading execution history...
            </p>
          ) : runs.length === 0 ? (
             <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1.5rem' }}>
               No execution runs dispatched yet. First run will trigger shortly!
             </p>
          ) : runs.map((run, index) => {
            let parsedResponse = null;
            try {
              parsedResponse = JSON.parse(run.response);
            } catch (e) {
              parsedResponse = run.response;
            }

            const orderId = parsedResponse?.order || parsedResponse?.order_id || null;

            return (
              <div key={run.id} className="run-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#cbd5e1'
                  }}>
                    #{runs.length - index}
                  </span>
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                      +{run.quantity.toLocaleString()} {job.actionType}
                    </div>
                    <div className="run-time" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(run.runAt).toLocaleTimeString()} • {new Date(run.runAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {orderId && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Provider Order: #{orderId}
                    </span>
                  )}
                  {run.status === 'success' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                      <CheckCircle2 size={15} /> Sent
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }} title={String(run.response)}>
                      <AlertCircle size={15} /> Error
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
