import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
const API_URL = process.env.REACT_APP_API_BASE_URL;

function Input({ label, type, placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.8px',textTransform:'uppercase'}}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:'100%',background:'rgba(255,255,255,0.04)',border:`1px solid ${focused?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'11px 14px',fontSize:'14px',color:'#fff',outline:'none',fontFamily:'Inter,sans-serif',transition:'border-color 0.2s'}}
      />
    </div>
  );
}

function Btn({ children, onClick, loading, ghost }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:'100%', padding:'12px', borderRadius:'8px', fontSize:'14px',
        fontWeight: ghost?400:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
        background: ghost?'transparent':(h?'rgba(255,255,255,0.88)':'#fff'),
        color: ghost?(h?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.45)'):'#000',
        border: ghost?`1px solid ${h?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.08)'}`:'none',
        transform: h?'translateY(-1px)':'translateY(0)',
        boxShadow: !ghost&&h?'0 6px 18px rgba(255,255,255,0.1)':'none',
        opacity: loading?0.7:1,
        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
      }}>
      {children}
    </button>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({name:'',business:'',email:'',password:'',confirm:'',type:''});
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/google-login`, {
        credential: response.credential,
        business_name: form.business || '',
        business_type: form.type || ''
      });
      localStorage.setItem('demandiq_token', res.data.token);
      localStorage.setItem('demandiq_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, form.business, form.type]);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-div'),
          { theme: 'filled_black', size: 'large', width: 360, shape: 'rectangular', text: 'continue_with' }
        );
      } else {
        setTimeout(initGoogle, 100);
      }
    };
    initGoogle();
  }, [handleGoogleResponse]);

  const handleLogin = () => {
    setFlipping(true);
    setTimeout(()=>{ navigate('/login'); },400);
  };

  const handleSubmit = async () => {
    setError('');
    if(!form.name||!form.email||!form.password){ setError('Please fill all required fields.'); return; }
    if(form.password!==form.confirm){ setError('Passwords do not match.'); return; }
    if(form.password.length<8){ setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
        business_name: form.business,
        business_type: form.type
      });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError('');
    if(otp.length<4){ setError('Please enter the OTP.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, {
        email: form.email,
        otp: otp,
        purpose: 'signup'
      });
      localStorage.setItem('demandiq_token', res.data.token);
      localStorage.setItem('demandiq_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP.');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, {
        email: form.email,
        purpose: 'signup'
      });
      setError('');
      alert('OTP resent successfully!');
    } catch (err) {
      setError('Failed to resend OTP.');
    }
  };

  const steps = ['Account','Verify'];

  return (
    <div style={{
      minHeight:'100vh', background:'#080808', display:'flex', flexDirection:'column',
      fontFamily:'Inter,sans-serif',
      opacity: flipping?0:1, transform: flipping?'scale(0.97)':'scale(1)',
      transition:'all 0.4s ease'
    }}>
      <div style={{flex:1,display:'flex'}}>

        {/* LEFT — Branding */}
        <div style={{
          flex:'0 0 46%',
          background:'linear-gradient(160deg,#0e0e0e 0%,#080808 100%)',
          borderRight:'1px solid rgba(255,255,255,0.07)',
          display:'flex', flexDirection:'column', justifyContent:'space-between',
          padding:'48px 52px', position:'relative', overflow:'hidden',
        }}>
          <div style={{position:'absolute',bottom:'-60px',right:'-60px',width:'280px',height:'280px',background:'radial-gradient(circle,rgba(255,255,255,0.035) 0%,transparent 65%)',pointerEvents:'none'}}></div>

          <div onClick={()=>navigate('/')} style={{cursor:'pointer'}}>
              <Logo size={22} textSize={15} />
            </div>

          <div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'18px',opacity:visible?1:0,transition:'opacity 0.6s 0.1s'}}>Join DemandIQ</div>
            <h2 style={{fontSize:'clamp(30px,3vw,42px)',fontWeight:800,color:'#fff',letterSpacing:'-1.5px',lineHeight:1.1,marginBottom:'18px',opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(20px)',transition:'all 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)'}}>
              Hey, welcome.<br/>Let's grow<br/>together.
            </h2>
            <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.3)',lineHeight:1.75,maxWidth:'260px',opacity:visible?1:0,transition:'opacity 0.6s 0.4s'}}>
              Join thousands of retail teams using DemandIQ to make smarter, faster inventory decisions.
            </p>
          </div>

          <div style={{opacity:visible?1:0,transition:'opacity 0.6s 0.55s'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'12px',paddingTop:'32px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              {[
                ['⚡','AI-powered sales forecasting'],
                ['🧠','Plain-English SHAP explanations'],
                ['🎛️','What-If scenario simulator'],
                ['🚨','Real-time anomaly alerts'],
              ].map(([icon,text])=>(
                <div key={text} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'14px'}}>{icon}</span>
                  <span style={{fontSize:'12.5px',color:'rgba(255,255,255,0.35)'}}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 56px',background:'#080808'}}>
          <div style={{width:'100%',maxWidth:'360px',opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(16px)',transition:'all 0.7s 0.3s cubic-bezier(0.16,1,0.3,1)'}}>

            <div style={{display:'flex',gap:'8px',marginBottom:'32px'}}>
              {steps.map((s,i)=>(
                <div key={s} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',background:i+1<=step?'#fff':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:i+1<=step?'#000':'rgba(255,255,255,0.3)',transition:'all 0.3s'}}>{i+1}</div>
                  <span style={{fontSize:'11px',color:i+1<=step?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.2)',transition:'all 0.3s'}}>{s}</span>
                  {i<steps.length-1&&<div style={{width:'24px',height:'1px',background:'rgba(255,255,255,0.1)',marginLeft:'4px'}}></div>}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <>
                <h1 style={{fontSize:'22px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'6px'}}>Create your account</h1>
                <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.28)',marginBottom:'24px'}}>Start forecasting demand in minutes.</p>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <Input label="Full Name" type="text" placeholder="Jaspreet Singh"
                    value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                  <Input label="Business" type="text" placeholder="Acme Retail"
                    value={form.business} onChange={e=>setForm({...form,business:e.target.value})} />
                </div>

                <Input label="Email" type="email" placeholder="you@company.com"
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />

                <div style={{marginBottom:'14px'}}>
                  <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.8px',textTransform:'uppercase'}}>Business Type</label>
                  <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'11px 14px',fontSize:'14px',color:form.type?'#fff':'rgba(255,255,255,0.35)',outline:'none',fontFamily:'Inter,sans-serif'}}>
                    <option value="">Select type</option>
                    {['Small Retail','Large Retail','E-commerce','Enterprise'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <Input label="Password" type="password" placeholder="Min. 8 chars"
                    value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
                  <Input label="Confirm" type="password" placeholder="Repeat"
                    value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />
                </div>

                {error && <div style={{fontSize:'12.5px',color:'rgba(239,68,68,0.85)',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'7px',padding:'10px 12px',marginBottom:'14px',lineHeight:1.5}}>{error}</div>}

                <Btn onClick={handleSubmit} loading={loading}>{loading?'Sending OTP...':'Continue →'}</Btn>

                <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'14px 0'}}>
                  <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.06)'}}></div>
                  <span style={{fontSize:'12px',color:'rgba(255,255,255,0.18)'}}>or</span>
                  <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.06)'}}></div>
                </div>

                <div id="google-signin-div" style={{width:'100%',display:'flex',justifyContent:'center',marginTop:'4px'}}></div>

                <p style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.22)',marginTop:'20px'}}>
                  Already have an account?{' '}
                  <span onClick={handleLogin} style={{color:'rgba(255,255,255,0.65)',cursor:'pointer',fontWeight:500}}>Sign in</span>
                </p>
              </>
            ) : (
              <>
                <div style={{width:'44px',height:'44px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'24px'}}>📧</div>
                <h1 style={{fontSize:'22px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'6px'}}>Verify your email</h1>
                <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.28)',marginBottom:'8px'}}>We sent a 6-digit OTP to</p>
                <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.65)',fontWeight:500,marginBottom:'32px'}}>{form.email}</p>

                <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'10px',letterSpacing:'0.8px',textTransform:'uppercase'}}>Enter OTP</label>
                <input
                  placeholder="------" maxLength={6} value={otp}
                  onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}
                  style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',padding:'14px',fontSize:'24px',color:'#fff',outline:'none',fontFamily:'Inter,sans-serif',textAlign:'center',letterSpacing:'8px',marginBottom:'8px'}}
                />
                {error && <div style={{fontSize:'12.5px',color:'rgba(239,68,68,0.85)',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'7px',padding:'10px 12px',marginBottom:'14px',lineHeight:1.5}}>{error}</div>}
                <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)',marginBottom:'24px',textAlign:'center'}}>
                  Didn't receive it?{' '}
                  <span onClick={handleResendOtp} style={{color:'rgba(255,255,255,0.5)',cursor:'pointer'}}>Resend OTP</span>
                </p>

                <Btn onClick={handleVerifyOtp} loading={loading}>{loading?'Verifying...':'Verify & Get Started'}</Btn>

                <p style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.22)',marginTop:'20px',cursor:'pointer'}} onClick={()=>{setStep(1);setError('');}}>
                  ← Back
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',padding:'16px 52px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.15)'}}>© 2025 DemandIQ</span>
        <div style={{display:'flex',gap:'20px'}}>
          {['Privacy','Terms','Contact'].map(l=>(
            <span key={l} style={{fontSize:'11px',color:'rgba(255,255,255,0.15)',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}