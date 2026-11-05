import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Plus, Trash2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function SettingsPage({ onSettingsSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  const [balanceStatus, setBalanceStatus] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const [services, setServices] = useState([
    { id: Date.now(), actionType: 'views', name: 'Default Views', serviceId: '' }
  ]);

  const CATEGORIES = ['views', 'likes', 'comments', 'shares', 'saves', 'reshares'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      if (res.data.settings) {
        setApiUrl(res.data.settings.apiUrl || '');
        setApiKey(res.data.settings.apiKey || '');
        if (res.data.settings.apiUrl && res.data.settings.apiKey) {
          checkBalance();
        }
      }
      
      if (res.data.services && res.data.services.length > 0) {
        setServices(res.data.services.map(s => ({ ...s, id: Math.random() })));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
    setLoading(false);
  };

  const checkBalance = async () => {
    setCheckingBalance(true);
    setBalanceStatus(null);
    try {
      const res = await axios.get('/api/user/balance');
      setBalanceStatus(res.data);
    } catch (err) {
      setBalanceStatus({ error: err.response?.data?.error || 'Failed to connect to provider' });
    } finally {
      setCheckingBalance(false);
    }
  };

  const addService = () => {
    setServices([...services, { id: Date.now(), actionType: 'views', name: '', serviceId: '' }]);
  };

  const removeService = (id) => {
    setServices(services.filter(s => s.id !== id));
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Clean up empty services
    const cleanServices = services.filter(s => s.name.trim() !== '' && s.serviceId.trim() !== '');

    try {
      await axios.post('/api/settings', {
        apiUrl,
        apiKey,
        services: cleanServices
      });
      alert('Settings saved successfully!');
      fetchSettings();
      checkBalance();
      if (onSettingsSaved) onSettingsSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spin" size={32} /></div>;
  }

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">
          <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
          Configuration
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Connect your SMM Panel API and define your reusable service profiles.
        </p>
      </div>
      
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: '2.5rem', background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>API Connection</h3>
            <button
              type="button"
              onClick={checkBalance}
              disabled={checkingBalance || !apiUrl || !apiKey}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {checkingBalance ? <Loader2 size={13} className="spin" /> : <Wallet size={13} />}
              {checkingBalance ? 'Checking...' : 'Test Balance'}
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>SMM Panel API URL</label>
            <input 
              type="url" 
              value={apiUrl} 
              onChange={(e) => setApiUrl(e.target.value)} 
              required 
              placeholder="https://smm-panel.com/api/v2"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              required 
              placeholder="Enter your SMM Panel API Key"
            />
          </div>

          {/* Live Balance Card */}
          {balanceStatus && balanceStatus.balance !== undefined && balanceStatus.balance !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '0.9rem'
            }}>
              <CheckCircle2 size={18} />
              <div>
                Connected successfully! Available Provider Balance: <strong>{balanceStatus.balance} {balanceStatus.currency}</strong>
              </div>
            </div>
          )}

          {balanceStatus && balanceStatus.error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} />
              <div>
                Connection Error: {balanceStatus.error}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Service Profiles</h3>
            <button type="button" onClick={addService} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={14} /> Add Service
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {services.map((service, index) => (
              <div key={service.id || index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                <select 
                  value={service.actionType} 
                  onChange={(e) => updateService(service.id, 'actionType', e.target.value)}
                  style={{ width: '120px', padding: '0.5rem' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
                
                <input 
                  type="text" 
                  placeholder="Service Name (e.g. HQ Views)" 
                  value={service.name} 
                  onChange={(e) => updateService(service.id, 'name', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem' }}
                  required
                />
                
                <input 
                  type="text" 
                  placeholder="Service ID" 
                  value={service.serviceId} 
                  onChange={(e) => updateService(service.id, 'serviceId', e.target.value)}
                  style={{ width: '100px', padding: '0.5rem' }}
                  required
                />

                <input 
                  type="number" 
                  step="0.0001"
                  placeholder="Rate/1k" 
                  value={service.rate !== undefined ? service.rate : ''} 
                  onChange={(e) => updateService(service.id, 'rate', e.target.value)}
                  style={{ width: '110px', padding: '0.5rem' }}
                  title="Cost per 1,000 units (e.g. 0.20 or 15)"
                />

                <button 
                  type="button" 
                  onClick={() => removeService(service.id)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem', color: 'var(--error)' }}
                  title="Remove Service"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
