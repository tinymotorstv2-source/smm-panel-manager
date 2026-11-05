import React, { useState } from 'react';
import { Key, Shield, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function AccessKeyLogin({ onLoginSuccess }) {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/verify', {
        accessKey: accessKey.trim()
      });

      if (res.data.valid) {
        localStorage.setItem('smm_access_key', res.data.user.accessKey);
        localStorage.setItem('smm_user', JSON.stringify(res.data.user));
        axios.defaults.headers.common['x-access-key'] = res.data.user.accessKey;
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to authenticate. Please check your key.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 25%, #18192a 0%, #07070d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Crystal Glow Spheres */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        top: '15%',
        left: '20%',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
        bottom: '20%',
        right: '25%',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Crystal Cube Login Card */}
      <div className="card animate-fade-in" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '3rem 2.25rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 60px -10px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.25)',
        background: 'rgba(15, 17, 28, 0.75)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 12px 30px rgba(168, 85, 247, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}>
            <Shield size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Private Access Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter your personal Access Key to unlock your workspace.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            marginBottom: '1.75rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
              YOUR ACCESS KEY
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                placeholder="e.g. SMM-9A4B-88EF"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  fontSize: '1.05rem',
                  letterSpacing: '0.06em',
                  background: 'rgba(8, 10, 18, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '14px',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'monospace',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <Key size={20} color="#a855f7" style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={20} className="spin" /> : <Shield size={20} />}
            {loading ? 'Authenticating...' : 'Unlock Workspace'}
          </button>
        </form>

        <div style={{
          marginTop: '2.25rem',
          paddingTop: '1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            Don't have an Access Key? Keys are private and generated via our official Telegram bot.
          </p>
        </div>
      </div>
    </div>
  );
}
