
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from './Logo';

const navItems = [
  ['📊', 'Dashboard', '/dashboard'],
  ['🔮', 'Forecast', '/forecast'],
  ['🚨', 'Alerts', '/alerts'],
  ['🎛️', 'Simulator', '/simulator'],
  ['⚙️', 'Settings', '/settings']
];

export default function Layout({ children, activeNav }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('loading');

  const apiUrl = localStorage.getItem('demandiq_api_url') || process.env.REACT_APP_API_BASE_URL ;

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        await axios.get(`${apiUrl}/health`, { timeout: 3000 });
        if (active) setApiStatus('connected');
      } catch (err) {
        if (active) setApiStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apiUrl]);

  const apiTone = {
    loading: { label: 'Checking API', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
    connected: { label: 'API Connected', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
    offline: { label: 'API Offline', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' },
  }[apiStatus] || { label: 'Checking API', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'Inter,sans-serif', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        
        /* Custom scrollbar styling for premium look */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.01);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>

      {/* TOPBAR */}
      <div style={{ height: '56px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ width: '18px', height: '1.5px', background: sidebarOpen ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }}></div>
            <div style={{ width: '18px', height: '1.5px', background: sidebarOpen ? 'transparent' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}></div>
            <div style={{ width: '18px', height: '1.5px', background: sidebarOpen ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }}></div>
          </button>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo size={22} textSize={15} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: apiTone.color, background: apiTone.bg, border: `1px solid ${apiTone.border}`, padding: '4px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: apiTone.color }}></div>
            {apiTone.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>J</div>
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)' }}>Jaspreet</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* SIDEBAR DRAWER */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: '220px',
          background: '#060606',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 12px',
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', padding: '0 10px' }}>Navigation</div>
          {navItems.map(([icon, label, path]) => {
            const isActive = activeNav === label;
            return (
              <div key={label} onClick={() => { navigate(path); setSidebarOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', borderLeft: isActive ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent', marginBottom: '2px', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.35)' }}>{label}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 'auto', padding: '16px 10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => navigate('/')} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', padding: '8px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Home</button>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}></div>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
