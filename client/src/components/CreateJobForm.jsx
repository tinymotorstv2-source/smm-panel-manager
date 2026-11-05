import React, { useState, useEffect, useMemo } from 'react';
import { 
  Rocket, Loader2, Clock, ShieldCheck, ShieldAlert, Activity, 
  Wallet, AlertTriangle, Sparkles, CheckCircle2, DollarSign,
  Globe, Flame, Zap, Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const WhopTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1C1C1E', padding: '12px 16px', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <div style={{ color: '#888', marginBottom: '8px', fontWeight: 600 }}>{payload[0].payload.fullTime}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                <span style={{ color: '#ccc', textTransform: 'capitalize' }}>{entry.name}</span>
              </div>
              <span style={{ fontWeight: 'bold' }}>
                {(() => {
                  const realKey = 'real' + entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
                  const displayVal = entry.payload[realKey] !== undefined ? entry.payload[realKey] : entry.value;
                  return displayVal >= 1000 ? (displayVal / 1000).toFixed(1) + 'K' : displayVal;
                })()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function CreateJobForm({ onJobCreated }) {
  const [loading, setLoading] = useState(false);
  const [targetLink, setTargetLink] = useState('');
  const [availableServices, setAvailableServices] = useState([]);
  const [balanceInfo, setBalanceInfo] = useState(null);
  
  const [deadlineMode, setDeadlineMode] = useState('3');
  const [customDeadline, setCustomDeadline] = useState(1);
  
  const [actions, setActions] = useState({
    views: { enabled: true, quantity: 10000, targetRuns: '', serviceId: '' },
    likes: { enabled: true, quantity: 160, targetRuns: '', serviceId: '' },
    comments: { enabled: true, quantity: 5, targetRuns: '', serviceId: '' },
    shares: { enabled: true, quantity: 300, targetRuns: '', serviceId: '' },
    saves: { enabled: false, quantity: 50, targetRuns: '', serviceId: '' },
    reshares: { enabled: false, quantity: 50, targetRuns: '', serviceId: '' }
  });

  useEffect(() => {
    fetchServices();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await axios.get('/api/user/balance');
      setBalanceInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch balance in form', err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data.services) {
        setAvailableServices(res.data.services);
        
        const newActions = { ...actions };
        let changed = false;
        Object.keys(newActions).forEach(cat => {
          const catServices = res.data.services.filter(s => s.actionType === cat);
          if (catServices.length > 0 && !newActions[cat].serviceId) {
            newActions[cat].serviceId = catServices[0].serviceId;
            changed = true;
          }
        });
        if (changed) setActions(newActions);
      }
    } catch (err) {
      console.error('Failed to fetch services', err);
    }
  };

  // Platform detection for URL
  const detectedPlatform = useMemo(() => {
    if (!targetLink) return null;
    const l = targetLink.toLowerCase();
    if (l.includes('instagram.com')) return { name: 'Instagram Reel / Post', color: '#ec4899', icon: '📸' };
    if (l.includes('tiktok.com')) return { name: 'TikTok Video', color: '#06b6d4', icon: '🎵' };
    if (l.includes('youtube.com') || l.includes('youtu.be')) return { name: 'YouTube Video', color: '#ef4444', icon: '▶️' };
    if (l.includes('x.com') || l.includes('twitter.com')) return { name: 'X / Twitter Post', color: '#94a3b8', icon: '🐦' };
    return { name: 'Web Link', color: '#a855f7', icon: '🌐' };
  }, [targetLink]);

  // Compute Deadline in Hours
  const currentDeadlineHours = useMemo(() => {
    let hrs = parseFloat(deadlineMode);
    if (deadlineMode === 'custom') hrs = parseFloat(customDeadline) || 1;
    return hrs;
  }, [deadlineMode, customDeadline]);

  // Real-Time Cost Calculation Engine
  const costCalculation = useMemo(() => {
    let totalCost = 0;
    const breakdown = [];
    let hasAnyRate = false;

    Object.entries(actions).forEach(([type, data]) => {
      if (data.enabled && data.quantity > 0) {
        const s = availableServices.find(srv => String(srv.serviceId) === String(data.serviceId) && srv.actionType === type);
        const ratePer1k = s && s.rate !== undefined && s.rate !== null ? parseFloat(s.rate) : 0;
        if (ratePer1k > 0) hasAnyRate = true;

        const itemCost = (data.quantity / 1000) * ratePer1k;
        totalCost += itemCost;

        breakdown.push({
          type,
          name: s?.name || type,
          quantity: data.quantity,
          ratePer1k,
          cost: itemCost
        });
      }
    });

    const userBalance = balanceInfo && balanceInfo.balance !== undefined && balanceInfo.balance !== null 
      ? parseFloat(balanceInfo.balance) 
      : null;

    const currency = balanceInfo?.currency || 'USD';
    const isBalanceKnown = userBalance !== null && !isNaN(userBalance);
    const hasSufficientBalance = isBalanceKnown && hasAnyRate ? userBalance >= totalCost : true;
    const balanceAfter = isBalanceKnown ? userBalance - totalCost : null;
    const shortfall = isBalanceKnown && totalCost > userBalance ? (totalCost - userBalance) : 0;

    return {
      breakdown,
      totalCost,
      currency,
      userBalance,
      isBalanceKnown,
      hasAnyRate,
      hasSufficientBalance,
      balanceAfter,
      shortfall
    };
  }, [actions, availableServices, balanceInfo]);

  // Preset Campaign Packs
  const applyPreset = (presetName) => {
    if (presetName === 'starter') {
      setDeadlineMode('3');
      setActions(prev => ({
        ...prev,
        views: { ...prev.views, enabled: true, quantity: 10000 },
        likes: { ...prev.likes, enabled: true, quantity: 160 },
        comments: { ...prev.comments, enabled: true, quantity: 5 },
        shares: { ...prev.shares, enabled: true, quantity: 300 },
        saves: { ...prev.saves, enabled: false },
        reshares: { ...prev.reshares, enabled: false }
      }));
    } else if (presetName === 'growth') {
      setDeadlineMode('6');
      setActions(prev => ({
        ...prev,
        views: { ...prev.views, enabled: true, quantity: 25000 },
        likes: { ...prev.likes, enabled: true, quantity: 400 },
        comments: { ...prev.comments, enabled: true, quantity: 15 },
        shares: { ...prev.shares, enabled: true, quantity: 750 },
        saves: { ...prev.saves, enabled: false },
        reshares: { ...prev.reshares, enabled: false }
      }));
    } else if (presetName === 'viral') {
      setDeadlineMode('12');
      setActions(prev => ({
        ...prev,
        views: { ...prev.views, enabled: true, quantity: 50000 },
        likes: { ...prev.likes, enabled: true, quantity: 800 },
        comments: { ...prev.comments, enabled: true, quantity: 30 },
        shares: { ...prev.shares, enabled: true, quantity: 1500 },
        saves: { ...prev.saves, enabled: false },
        reshares: { ...prev.reshares, enabled: false }
      }));
    }
  };

  // Generate Projected Graph Data
  const graphData = useMemo(() => {
    const data = [];
    const steps = 30;
    
    const seed = 42; 
    let randomVal = seed;
    const rand = () => {
      randomVal = (randomVal * 16807) % 2147483647;
      return (randomVal - 1) / 2147483646;
    };

    const now = new Date();

    const viewsDeltas = [], likesDeltas = [], commentsDeltas = [], sharesDeltas = [], savesDeltas = [];
    let sumViews = 0, sumLikes = 0, sumComments = 0, sumShares = 0, sumSaves = 0;
    
    for(let i=1; i<=steps; i++) {
        const progress = i / steps;
        const prevProgress = (i-1) / steps;
        const theoreticalDelta = Math.pow(progress, 3.0) - Math.pow(prevProgress, 3.0);
        
        let v = Math.max(0.001, theoreticalDelta * (1 + (rand() * 0.8 - 0.4))); 
        let l = Math.max(0.001, theoreticalDelta * (1 + (rand() * 1.0 - 0.5)));
        let c = Math.max(0.001, theoreticalDelta * (1 + (rand() * 1.2 - 0.6)));
        let sh = Math.max(0.001, theoreticalDelta * (1 + (rand() * 0.9 - 0.45)));
        let sa = Math.max(0.001, theoreticalDelta * (1 + (rand() * 0.9 - 0.45)));

        viewsDeltas.push(v); sumViews += v;
        likesDeltas.push(l); sumLikes += l;
        commentsDeltas.push(c); sumComments += c;
        sharesDeltas.push(sh); sumShares += sh;
        savesDeltas.push(sa); sumSaves += sa;
    }
    
    const viewsMultiplier = actions.views.enabled ? actions.views.quantity / sumViews : 0;
    const likesMultiplier = actions.likes.enabled ? actions.likes.quantity / sumLikes : 0;
    const commentsMultiplier = actions.comments?.enabled ? actions.comments.quantity / sumComments : 0;
    const sharesMultiplier = actions.shares.enabled ? actions.shares.quantity / sumShares : 0;
    const savesMultiplier = actions.saves.enabled ? actions.saves.quantity / sumSaves : 0;

    let curViews = 0, curLikes = 0, curComments = 0, curShares = 0, curSaves = 0;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const futureTime = new Date(now.getTime() + (progress * currentDeadlineHours * 60 * 60 * 1000));
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      const dayName = dayNames[futureTime.getDay()];
      const month = monthNames[futureTime.getMonth()];
      const date = futureTime.getDate();
      
      let hours = futureTime.getHours();
      const minutes = futureTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      
      const tooltipTime = `${dayName}, ${month} ${date}, ${hours}:${formattedMinutes} ${ampm}`;
      const axisTime = `${month} ${date}`;
      
      const point = { time: axisTime, fullTime: tooltipTime };
      
      if (i > 0) {
        curViews += viewsDeltas[i-1] * viewsMultiplier;
        curLikes += likesDeltas[i-1] * likesMultiplier;
        curComments += commentsDeltas[i-1] * commentsMultiplier;
        curShares += sharesDeltas[i-1] * sharesMultiplier;
        curSaves += savesDeltas[i-1] * savesMultiplier;
      }
      
      if (actions.views.enabled) {
        point.views = Math.round(curViews);
        point.realViews = point.views;
      }
      if (actions.likes.enabled) {
        point.realLikes = Math.round(curLikes);
        point.likes = point.realLikes * 45;
      }
      if (actions.comments?.enabled) {
        point.realComments = Math.round(curComments);
        point.comments = point.realComments * 1000;
      }
      if (actions.shares.enabled) {
        point.realShares = Math.round(curShares);
        point.shares = point.realShares * 20;
      }
      if (actions.saves.enabled) {
        point.realSaves = Math.round(curSaves);
        point.saves = point.realSaves * 20;
      }
      
      data.push(point);
    }
    return data;
  }, [actions, currentDeadlineHours]);

  // Compute Botting Risk Percentage
  const safetyData = useMemo(() => {
    let risk = 0;
    const views = actions.views.enabled ? actions.views.quantity : 0;
    const likes = actions.likes.enabled ? actions.likes.quantity : 0;
    const shares = actions.shares.enabled ? actions.shares.quantity : 0;
    const messages = [];

    if (views > 0) {
      const ratio = likes / views;
      if (ratio > 0.022) {
        const diff = ratio - 0.022;
        const addedRisk = Math.floor((diff / 0.001) * 2);
        risk += addedRisk;
        if (addedRisk > 5) messages.push(`Likes ratio (${(ratio*100).toFixed(1)}%) is above the safe 2.2% threshold.`);
      } else if (likes > 0 && ratio < 0.01) {
        const diff = 0.01 - ratio;
        const addedRisk = Math.floor((diff / 0.001) * 1);
        risk += addedRisk;
        if (addedRisk > 5) messages.push(`Likes ratio (${(ratio*100).toFixed(1)}%) is suspiciously low (< 1.0%).`);
      }

      if (views >= 1000 && likes > 0) {
        if (!actions.shares.enabled) {
          risk += 15;
          messages.push("Missing shares on a viral post looks heavily botted.");
        } else {
          const shareRatio = shares / views;
          if (actions.shares.enabled && shareRatio > 0.05) {
            const addedRisk = Math.floor(((shareRatio - 0.05) / 0.001) * 1.5);
            risk += addedRisk;
            if (addedRisk > 5) messages.push("Shares are scaling too aggressively.");
          }
        }
      }

      const speed = views / currentDeadlineHours;
      if (speed > 5000) {
        const addedRisk = Math.floor((speed - 5000) / 1000);
        risk += addedRisk;
        if (addedRisk > 10) messages.push(`High delivery speed (${Math.round(speed).toLocaleString()}/hr) raises botting flags.`);
      }

      const targetRuns = actions.views.targetRuns ? parseInt(actions.views.targetRuns) : Math.max(1, Math.ceil(views / 1000));
      const viewsPerRun = views / targetRuns;
      if (viewsPerRun > 1000) {
        const addedRisk = Math.floor((viewsPerRun - 1000) / 500) * 2;
        risk += addedRisk;
        if (addedRisk > 5) messages.push(`Spamming too many views per run (${Math.round(viewsPerRun).toLocaleString()}). Split it up!`);
      }
    } else {
      risk = 100;
      messages.push("Needs Views to calculate organic risk.");
    }

    risk = Math.max(0, Math.min(100, risk));

    return {
      risk,
      messages,
      isSafe: risk <= 25,
      isWarning: risk > 25 && risk <= 60,
      isDanger: risk > 60
    };
  }, [actions, currentDeadlineHours]);

  const handleActionToggle = (actionKey) => {
    setActions(prev => ({
      ...prev,
      [actionKey]: {
        ...prev[actionKey],
        enabled: !prev[actionKey].enabled
      }
    }));
  };

  const handleDataChange = (actionKey, field, value) => {
    setActions(prev => ({
      ...prev,
      [actionKey]: {
        ...prev[actionKey],
        [field]: value === '' && field === 'targetRuns' ? '' : (field === 'serviceId' ? value : parseInt(value) || 0)
      }
    }));
  };

  const handleAutoCalculate = () => {
    const viewsQty = actions.views.quantity;
    if (viewsQty < 100) {
        alert("Please set at least 100 views first.");
        return;
    }
    
    const likesRatio = (Math.random() * (0.018 - 0.014) + 0.014);
    const sharesRatio = (Math.random() * (0.035 - 0.025) + 0.025);
    const commentsRatio = (Math.random() * (0.0008 - 0.0002) + 0.0002);

    setActions(prev => ({
        ...prev,
        likes: { ...prev.likes, enabled: true, quantity: Math.max(10, Math.floor(viewsQty * likesRatio)) },
        comments: { ...prev.comments, enabled: true, quantity: Math.max(2, Math.floor(viewsQty * commentsRatio)) },
        shares: { ...prev.shares, enabled: true, quantity: Math.max(15, Math.floor(viewsQty * sharesRatio)) },
        saves: { ...prev.saves, enabled: false },
        reshares: { ...prev.reshares, enabled: false }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Balance guard check
    if (!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate) {
      alert(`Insufficient Provider Balance! This order costs ${costCalculation.currency} ${costCalculation.totalCost.toFixed(2)}, but you only have ${costCalculation.currency} ${costCalculation.userBalance.toFixed(2)}. Please recharge your provider account.`);
      return;
    }

    setLoading(true);
    
    const selectedActions = Object.entries(actions)
      .filter(([_, data]) => data.enabled)
      .map(([type, data]) => ({ 
        type, 
        quantity: data.quantity,
        targetRuns: data.targetRuns === '' ? null : parseInt(data.targetRuns),
        serviceId: data.serviceId
      }));

    if (selectedActions.length === 0) {
      alert("Please select at least one engagement action.");
      setLoading(false);
      return;
    }

    for (const act of selectedActions) {
      if (!act.serviceId) {
        alert(`You must select a service for ${act.type}. If none are available, configure them in Settings.`);
        setLoading(false);
        return;
      }
    }

    if (currentDeadlineHours <= 0) {
      alert("Please enter a valid deadline greater than 0.");
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/jobs/batch', {
        targetLink,
        deadlineHours: currentDeadlineHours,
        actions: selectedActions
      });
      onJobCreated();
      setTargetLink('');
    } catch (err) {
      console.error('Error creating campaign', err);
      alert('Failed to launch campaign');
    }
    setLoading(false);
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem' }}>
      
      {/* Header */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>
            <Rocket size={24} style={{ color: 'var(--accent-primary)' }} />
            Launch Smart Organic Campaign
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Multi-action drip feed with real-time balance guard and algorithmic safety tuning.
          </p>
        </div>

        {/* Quick Packs Pill Group */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={() => applyPreset('starter')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: 'var(--radius-full)' }}
          >
            <Flame size={13} color="#f59e0b" /> Starter 10K
          </button>
          <button 
            type="button" 
            onClick={() => applyPreset('growth')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: 'var(--radius-full)' }}
          >
            <Zap size={13} color="#a855f7" /> Growth 25K
          </button>
          <button 
            type="button" 
            onClick={() => applyPreset('viral')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: 'var(--radius-full)' }}
          >
            <Award size={13} color="#38bdf8" /> Viral 50K
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        
        {/* Target URL Input with Platform Detector */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0, fontWeight: 700 }}>Target URL (Reel / Post / Video)</label>
            {detectedPlatform && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: detectedPlatform.color, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.3rem',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600
              }}>
                <span>{detectedPlatform.icon}</span> {detectedPlatform.name}
              </span>
            )}
          </div>
          <input 
            type="url" 
            value={targetLink} 
            onChange={(e) => setTargetLink(e.target.value)} 
            required 
            placeholder="https://instagram.com/reel/..."
            style={{ fontSize: '1rem', padding: '0.9rem 1.15rem' }}
          />
        </div>

        {/* Two-Column Grid: Config Form & Projection Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Left Side: Engagements Configuration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-crystal)', paddingBottom: '0.65rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#fff' }}>Engagements Matrix</h3>
              <button 
                type="button" 
                onClick={handleAutoCalculate} 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.4)' }}
              >
                <Sparkles size={14} /> 🪄 Auto-Calculate
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {Object.entries(actions).map(([key, data]) => {
                const catServices = availableServices.filter(s => s.actionType === key);
                const selectedSrv = availableServices.find(s => String(s.serviceId) === String(data.serviceId) && s.actionType === key);
                const rate = selectedSrv && selectedSrv.rate !== undefined ? selectedSrv.rate : null;
                const costForItem = data.enabled && rate ? ((data.quantity / 1000) * rate).toFixed(3) : null;

                return (
                  <div key={key} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.85rem', 
                    background: data.enabled ? 'rgba(22, 25, 42, 0.6)' : 'rgba(12, 14, 24, 0.4)', 
                    padding: '0.85rem 1rem', 
                    borderRadius: 'var(--radius-md)',
                    border: data.enabled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, width: '105px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={data.enabled} 
                        onChange={() => handleActionToggle(key)} 
                      />
                      <span style={{ textTransform: 'capitalize', color: data.enabled ? '#fff' : 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {key}
                      </span>
                    </label>
                    
                    <div style={{ flex: 1, display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {data.enabled ? (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {catServices.length > 0 ? (
                              <select 
                                value={data.serviceId} 
                                onChange={(e) => handleDataChange(key, 'serviceId', e.target.value)}
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', width: '100%' }}
                              >
                                {catServices.map(s => (
                                  <option key={s.id} value={s.serviceId}>
                                    {s.name} {s.rate ? `(@${s.rate}/1k)` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>No service in Settings!</span>
                            )}
                          </div>

                          <div style={{ width: '85px' }}>
                            <input 
                              type="number" 
                              value={data.quantity} 
                              onChange={(e) => handleDataChange(key, 'quantity', e.target.value)} 
                              min="1"
                              placeholder="Qty"
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem', fontFamily: 'JetBrains Mono, monospace' }}
                              title="Total Quantity"
                            />
                          </div>

                          <div style={{ width: '80px' }}>
                            <input 
                              type="number" 
                              value={data.targetRuns} 
                              onChange={(e) => handleDataChange(key, 'targetRuns', e.target.value)} 
                              min="1"
                              placeholder="Runs"
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem', fontFamily: 'JetBrains Mono, monospace' }}
                              title="Target Runs (Leave empty for smart auto-pacing)"
                            />
                          </div>

                          {/* Item Cost Tag */}
                          {costForItem && (
                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                              ~{costForItem}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '0.4rem 0' }}>Disabled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Projected Graph & Safety Score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Projected Curve */}
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-crystal)', paddingBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                <Activity size={16} color="var(--accent-primary)" /> Projected Organic Growth
              </h3>
              <div style={{ width: '100%', height: '350px', background: 'rgba(10, 12, 22, 0.75)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--border-crystal)', boxShadow: 'var(--crystal-shadow)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>Views</span>
                      <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{actions.views.enabled ? actions.views.quantity.toLocaleString() : '0'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>Likes</span>
                      <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{actions.likes.enabled ? actions.likes.quantity.toLocaleString() : '0'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>Comments</span>
                      <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{actions.comments?.enabled ? actions.comments.quantity.toLocaleString() : '0'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>Shares</span>
                      <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{actions.shares.enabled ? actions.shares.quantity.toLocaleString() : '0'}</span>
                    </div>
                  </div>
                  <div style={{ height: '3px', background: 'linear-gradient(to right, #B145E9 25%, #459CE9 50%, #45E98B 75%, #E98B45 100%)', borderRadius: '2px', opacity: 0.8 }}></div>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                    <XAxis dataKey="time" stroke="#666" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis 
                      stroke="#666" 
                      fontSize={11} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(1) + 'K' : val} 
                    />
                    <Tooltip cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '4 4' }} content={<WhopTooltip />} />
                    {actions.views.enabled && <Line type="linear" dataKey="views" stroke="#B145E9" strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {actions.likes.enabled && <Line type="linear" dataKey="likes" stroke="#459CE9" strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {actions.comments?.enabled && <Line type="linear" dataKey="comments" stroke="#45E98B" strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {actions.shares.enabled && <Line type="linear" dataKey="shares" stroke="#E98B45" strokeWidth={2} dot={false} isAnimationActive={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Anti-Botting Safety Score Card */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${safetyData.isSafe ? 'rgba(16, 185, 129, 0.35)' : safetyData.isWarning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {safetyData.isSafe ? (
                  <ShieldCheck size={24} style={{ color: 'var(--success)' }} />
                ) : (
                  <ShieldAlert size={24} style={{ color: safetyData.isWarning ? 'var(--warning)' : 'var(--error)' }} />
                )}
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Botting Detection Risk</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: safetyData.isSafe ? 'var(--success)' : safetyData.isWarning ? 'var(--warning)' : 'var(--error)' }}>
                    {safetyData.risk}% Risk
                  </div>
                </div>
              </div>
              
              {safetyData.messages.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', marginTop: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                  {safetyData.messages.map((msg, i) => (
                    <li key={i} style={{ marginBottom: '0.2rem' }}>{msg}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ marginTop: '0.6rem', color: '#94a3b8', fontSize: '0.825rem' }}>
                  Looks perfect! Non-linear organic distribution safely complies with algorithmic security.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Completion Deadline & Speed */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', borderBottom: '1px solid var(--border-crystal)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
            <Clock size={16} color="var(--accent-primary)" /> Delivery Timeline & Pacing
          </h3>
          
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <select 
                value={deadlineMode} 
                onChange={e => setDeadlineMode(e.target.value)}
                style={{ fontSize: '0.95rem', padding: '0.8rem' }}
              >
                <option value="1">1 Hour (Fast Viral Delivery)</option>
                <option value="3">3 Hours (Recommended Organic)</option>
                <option value="6">6 Hours (Smooth Wave)</option>
                <option value="12">12 Hours (Ultra-Safe Drip)</option>
                <option value="24">24 Hours (Full Day Cycle)</option>
                <option value="48">48 Hours (2-Day Campaign)</option>
                <option value="custom">Custom Hours...</option>
              </select>
            </div>
            {deadlineMode === 'custom' && (
              <div className="form-group" style={{ maxWidth: '300px' }}>
                <input 
                  type="number" 
                  value={customDeadline} 
                  onChange={e => setCustomDeadline(e.target.value)}
                  placeholder="Enter hours (e.g. 1.5)"
                  step="0.1"
                  min="0.1"
                  required
                  style={{ fontSize: '0.95rem', padding: '0.8rem' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* REAL-TIME COST & BALANCE CHECKOUT CARD */}
        <div style={{
          background: 'rgba(12, 14, 25, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={18} color="#34d399" />
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Pre-Order Cost & Balance Summary</h4>
            </div>
            {costCalculation.isBalanceKnown && (
              <span style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
                Available Balance: <strong style={{ color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{costCalculation.userBalance} {costCalculation.currency}</strong>
              </span>
            )}
          </div>

          {/* Breakdown Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {costCalculation.breakdown.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <span>
                  • <strong style={{ textTransform: 'capitalize', color: '#fff' }}>{item.type}</strong> ({item.quantity.toLocaleString()} units {item.ratePer1k > 0 ? `@ ${item.ratePer1k}/1k` : ''})
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: item.cost > 0 ? '#34d399' : 'var(--text-tertiary)' }}>
                  {item.cost > 0 ? `${costCalculation.currency} ${item.cost.toFixed(3)}` : 'Rate not set'}
                </span>
              </div>
            ))}
          </div>

          {/* Summary Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
            fontSize: '1rem'
          }}>
            <span style={{ fontWeight: 600, color: '#fff' }}>Total Estimated Order Cost:</span>
            <strong style={{ fontSize: '1.25rem', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
              {costCalculation.totalCost > 0 
                ? `${costCalculation.currency} ${costCalculation.totalCost.toFixed(2)}` 
                : 'Configure rates in Settings'}
            </strong>
          </div>

          {/* Balance Guard Alert if Insufficient */}
          {!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate && (
            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Insufficient Provider Balance!</strong> You need <strong>{costCalculation.currency} {costCalculation.totalCost.toFixed(2)}</strong>, but only have <strong>{costCalculation.currency} {costCalculation.userBalance.toFixed(2)}</strong> (Shortfall: {costCalculation.currency} {costCalculation.shortfall.toFixed(2)}). Please recharge your SMM provider account before submitting.
              </div>
            </div>
          )}

          {/* Sufficient Balance Confirmation */}
          {costCalculation.hasSufficientBalance && costCalculation.isBalanceKnown && costCalculation.totalCost > 0 && (
            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-sm)',
              color: '#34d399',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              <span>Funds verified! Remaining balance after execution: <strong>{costCalculation.currency} {costCalculation.balanceAfter.toFixed(2)}</strong></span>
            </div>
          )}
        </div>

        {/* Launch Button */}
        <div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || (!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate)} 
            style={{ 
              padding: '1.1rem', 
              fontSize: '1.1rem',
              fontWeight: 700,
              opacity: (!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate) ? 0.5 : 1,
              cursor: (!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={22} className="spin" /> : <Rocket size={22} />}
            {loading 
              ? 'Launching Campaign...' 
              : (!costCalculation.hasSufficientBalance && costCalculation.hasAnyRate)
                ? 'Insufficient Balance to Launch'
                : 'Confirm & Launch Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
