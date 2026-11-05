import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, LayoutDashboard, PlusCircle, Settings as SettingsIcon, LogOut, User, Wallet, RefreshCw } from 'lucide-react';
import CreateJobForm from './components/CreateJobForm';
import JobDashboard from './components/JobDashboard';
import SettingsPage from './components/SettingsPage';
import AccessKeyLogin from './components/AccessKeyLogin';

const API_BASE = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_BASE;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  
  // SMM Provider Balance state
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Check saved access key on load
  useEffect(() => {
    const savedKey = localStorage.getItem('smm_access_key');
    if (savedKey) {
      axios.defaults.headers.common['x-access-key'] = savedKey;
      axios.post('/api/auth/verify', { accessKey: savedKey })
        .then(res => {
          if (res.data.valid) {
            setCurrentUser(res.data.user);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
    }

    // Axios interceptor for 401 (revoked key)
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('smm_access_key');
    localStorage.removeItem('smm_user');
    delete axios.defaults.headers.common['x-access-key'];
    setCurrentUser(null);
    setJobs([]);
    setBalanceInfo(null);
  };

  const fetchJobs = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get('/api/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  const fetchBalance = async () => {
    if (!currentUser) return;
    setBalanceLoading(true);
    try {
      const res = await axios.get('/api/user/balance');
      setBalanceInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch balance', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchJobs();
      fetchBalance();
      const interval = setInterval(() => {
        fetchJobs();
      }, 5000);
      const balanceInterval = setInterval(() => {
        fetchBalance();
      }, 30000); // refresh balance every 30s
      return () => {
        clearInterval(interval);
        clearInterval(balanceInterval);
      };
    }
  }, [currentUser]);

  if (isVerifying) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f15', color: '#888' }}>
        Verifying authorization...
      </div>
    );
  }

  if (!currentUser) {
    return <AccessKeyLogin onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="app-container animate-fade-in">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers className="text-accent" style={{ color: 'var(--accent-primary)' }} size={28} />
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>SMM Campaign Manager</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Organic Drip-Feed System
            </div>
          </div>
        </div>

        {/* Right Header: Balance Widget + User Badge & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* Live SMM Provider Balance Widget */}
          {balanceInfo && balanceInfo.configured && balanceInfo.balance !== undefined && balanceInfo.balance !== null ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.825rem',
              color: '#34d399',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.15)'
            }}>
              <Wallet size={15} color="#34d399" />
              <span style={{ color: '#a7f3d0' }}>Balance:</span>
              <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                {balanceInfo.balance} {balanceInfo.currency}
              </strong>
              <RefreshCw 
                size={12} 
                style={{ cursor: 'pointer', marginLeft: '0.2rem', opacity: 0.8 }} 
                className={balanceLoading ? 'spin' : ''} 
                onClick={fetchBalance}
                title="Refresh Provider Balance"
              />
            </div>
          ) : balanceInfo && balanceInfo.configured && balanceInfo.error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              color: '#f87171'
            }} title={balanceInfo.error}>
              <Wallet size={14} />
              <span>API Error</span>
              <RefreshCw size={11} style={{ cursor: 'pointer' }} onClick={fetchBalance} />
            </div>
          ) : null}

          {/* User Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-tertiary)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem'
          }}>
            <User size={14} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.label || 'Client'}</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>({currentUser.accessKey})</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            title="Switch Access Key"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-secondary)'
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <main className="main-layout">
        <aside className="sidebar">
          <div 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <PlusCircle size={18} />
            New Campaign
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            Settings
          </div>
        </aside>
        
        <section className="content-area">
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Active Campaigns
                  <span style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: 'var(--radius-full)', 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)' 
                  }}>
                    {jobs.length}
                  </span>
                </h2>
              </div>
              <JobDashboard jobs={jobs} onJobUpdated={fetchJobs} />
            </div>
          )}

          {activeTab === 'new' && (
            <CreateJobForm onJobCreated={() => {
              fetchJobs();
              fetchBalance();
              setActiveTab('dashboard');
            }} />
          )}

          {activeTab === 'settings' && (
            <SettingsPage onSettingsSaved={fetchBalance} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
