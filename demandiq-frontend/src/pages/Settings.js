import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
const API_URL = process.env.REACT_APP_API_BASE_URL;

export default function Settings() {
  const [profile, setProfile] = useState({
    name: 'Jaspreet Kaur',
    email: 'jaspreet@example.com',
    company: 'DemandIQ Retail Corp'
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
const [passwordLoading, setPasswordLoading] = useState(false);
const [passwordResult, setPasswordResult] = useState(null);

const handleChangePassword = async () => {
  setPasswordResult(null);
  if (!passwords.current || !passwords.new || !passwords.confirm) {
    setPasswordResult({ success: false, message: 'Please fill all password fields.' });
    return;
  }
  if (passwords.new.length < 8) {
    setPasswordResult({ success: false, message: 'New password must be at least 8 characters.' });
    return;
  }
  if (passwords.new !== passwords.confirm) {
    setPasswordResult({ success: false, message: 'New passwords do not match.' });
    return;
  }
  setPasswordLoading(true);
  try {
    const user = JSON.parse(localStorage.getItem('demandiq_user') || '{}');
    await axios.post(`${API_URL}/auth/change-password`, {
      email: user.email,
      current_password: passwords.current,
      new_password: passwords.new
    });
    setPasswordResult({ success: true, message: 'Password changed successfully!' });
    setPasswords({ current: '', new: '', confirm: '' });
  } catch (err) {
    setPasswordResult({ success: false, message: err.response?.data?.detail || 'Failed to change password.' });
  }
  setPasswordLoading(false);
};

  const [apiUrl, setApiUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [notifications, setNotifications] = useState({
    email_anomalies: true,
    slack_alerts: false,
    weekly_reports: true
  });

  useEffect(() => {
    const savedUrl =
      localStorage.getItem('demandiq_api_url') ||
      process.env.REACT_APP_API_BASE_URL;
  
    setApiUrl(savedUrl);
  }, []);

  const handleSaveApiUrl = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Test URL with a quick health check
      const res = await axios.get(`${apiUrl}/health`, { timeout: 4000 });
      localStorage.setItem('demandiq_api_url', apiUrl);
      setTestResult({
        success: true,
        message: `Successfully connected! Active Model: ${res.data.model || 'Unknown'} (v${res.data.version || '1.0'})`
      });
      // Force layout update by dispatching a storage event
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection failed. Make sure your FastAPI server is running at ${apiUrl}`
      });
    } finally {
      setTesting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const headers = 'store_nbr,family,onpromotion,is_holiday,oil_price,month,day_of_week,week_of_year,quarter,is_weekend\n';
    const sampleRows = [
      '1,BEVERAGES,1,0,93.14,6,2,24,2,0',
      '1,BEVERAGES,0,1,92.50,6,3,24,2,0',
      '2,GROCERY I,1,0,93.14,6,2,24,2,0',
      '2,GROCERY I,0,0,93.14,6,3,24,2,0',
      '3,BEAUTY,0,0,91.00,6,4,24,2,0'
    ].join('\n');
    const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demandiq_forecast_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Layout activeNav="Settings">
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 30px', animation: 'fadeUp 0.5s ease' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px 0' }}>Configuration & Settings</h1>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Manage API credentials, configure database connections, and update alert preference profiles.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
          
          {/* Left Column: API & Integration & Templates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* API Config Panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
                🔗 Model API Connection
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>FastAPI Base Endpoint URL</label>
                <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Pings this URL to retrieve LightGBM predictions and health telemetry.</span>
              </div>

              <button onClick={handleSaveApiUrl} disabled={testing}
                style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {testing ? 'Testing connection...' : '⚡ Save & Test Connection'}
              </button>

              {testResult && (
                <div style={{
                  marginTop: '16px', fontSize: '12px', borderRadius: '8px', padding: '12px 14px', lineHeight: 1.5,
                  background: testResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`,
                  color: testResult.success ? '#22c55e' : '#ef4444'
                }}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </div>
              )}
            </div>

            {/* Resources / Templates */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px 0' }}>
                📥 Developer Resources
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Download standard sample CSV formats to upload correctly aligned dataset fields.
              </p>
              
              <button onClick={downloadSampleTemplate}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'transparent'; }}>
                Download CSV Sample Template
              </button>
            </div>

          </div>

          {/* Right Column: Profile & Notifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Profile Panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
                👤 User Profile
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Full Name</label>
                  <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Email Address</label>
                  <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Organization</label>
                  <input type="text" value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
            </div>
            {/* Change Password Panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
                🔒 Change Password
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Current Password</label>
                  <input type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="••••••••"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>New Password</label>
                  <input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="Min. 8 characters"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Confirm New Password</label>
                  <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Repeat new password"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              <button onClick={handleChangePassword} disabled={passwordLoading}
                style={{ marginTop: '16px', background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', opacity: passwordLoading ? 0.7 : 1 }}>
                {passwordLoading ? 'Updating...' : '🔒 Update Password'}
              </button>

              {passwordResult && (
                <div style={{
                  marginTop: '16px', fontSize: '12px', borderRadius: '8px', padding: '12px 14px', lineHeight: 1.5,
                  background: passwordResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${passwordResult.success ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`,
                  color: passwordResult.success ? '#22c55e' : '#ef4444'
                }}>
                  {passwordResult.success ? '✅' : '❌'} {passwordResult.message}
                </div>
              )}
            </div>

            {/* Notification Preferences */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>
                🚨 Alerts & Notifications
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Email Anomaly Alerts', desc: 'Notify jaspreet@example.com when high-severity demand spikes are simulated.', key: 'email_anomalies' },
                  { label: 'Slack Webhook Notifications', desc: 'Forward critical logistics alerts direct to the warehouse Slack channel.', key: 'slack_alerts' },
                  { label: 'Weekly Summary Reports', desc: 'Receive aggregated forecast performance accuracy reports every Sunday.', key: 'weekly_reports' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '3px' }}>{item.label}</span>
                      <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)' }}>{item.desc}</span>
                    </div>
                    <div onClick={() => toggleNotification(item.key)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px',
                        background: notifications[item.key] ? '#22c55e' : 'rgba(255,255,255,0.1)',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0
                      }}>
                      <div style={{
                        position: 'absolute', top: '3px', left: notifications[item.key] ? '21px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                        transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
}
