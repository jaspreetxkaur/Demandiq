import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_BASE_URL;

function Input({ label, type, placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:'16px'}}>
      <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.8px',textTransform:'uppercase'}}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:'100%',background:'rgba(255,255,255,0.04)',border:`1px solid ${focused?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:'8px',padding:'11px 14px',fontSize:'14px',color:'#fff',outline:'none',fontFamily:'Inter,sans-serif',transition:'border-color 0.2s'}}
      />
    </div>
  );
}

function Btn({ children, onClick, loading }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:'100%',background:h?'rgba(255,255,255,0.88)':'#fff',color:'#000',border:'none',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transform:h?'translateY(-1px)':'translateY(0)',boxShadow:h?'0 6px 18px rgba(255,255,255,0.1)':'none',transition:'all 0.2s',opacity:loading?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
      {children}
    </button>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOtp = async () => {
    setError(''); setSuccess('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError(''); setSuccess('');
    if (otp.length < 4) { setError('Please enter the OTP.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        email, otp, new_password: newPassword
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP or reset failed.');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#080808',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',fontFamily:'Inter,sans-serif'}}>

      <div onClick={()=>navigate('/')} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'40px',cursor:'pointer'}}>
        <div style={{width:'22px',height:'22px',background:'#fff',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#000',fontWeight:900}}>D</div>
        <span style={{fontSize:'15px',fontWeight:700,color:'#fff'}}>DemandIQ</span>
      </div>

      <div style={{width:'100%',maxWidth:'380px'}}>

        {step === 1 ? (
          <>
            <div style={{width:'44px',height:'44px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'24px'}}>🔑</div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'8px'}}>Forgot password?</h1>
            <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.3)',marginBottom:'28px',lineHeight:1.6}}>Enter your email and we'll send you an OTP to reset your password.</p>

            <Input label="Email" type="email" placeholder="you@company.com"
              value={email} onChange={e=>setEmail(e.target.value)} />

            {error && <div style={{fontSize:'12.5px',color:'rgba(239,68,68,0.85)',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'7px',padding:'10px 12px',marginBottom:'14px',lineHeight:1.5}}>{error}</div>}

            <Btn onClick={handleSendOtp} loading={loading}>{loading?'Sending...':'Send OTP'}</Btn>

            <p style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.22)',marginTop:'20px',cursor:'pointer'}} onClick={()=>navigate('/login')}>
              ← Back to login
            </p>
          </>
        ) : (
          <>
            <div style={{width:'44px',height:'44px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'24px'}}>📧</div>
            <h1 style={{fontSize:'22px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'8px'}}>Reset your password</h1>
            <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.3)',marginBottom:'28px'}}>Enter the OTP sent to <span style={{color:'rgba(255,255,255,0.6)'}}>{email}</span> and your new password.</p>

            <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'8px',letterSpacing:'0.8px',textTransform:'uppercase'}}>Enter OTP</label>
            <input
              placeholder="------" maxLength={6} value={otp}
              onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',padding:'14px',fontSize:'24px',color:'#fff',outline:'none',fontFamily:'Inter,sans-serif',textAlign:'center',letterSpacing:'8px',marginBottom:'16px'}}
            />

            <Input label="New Password" type="password" placeholder="Min. 8 characters"
              value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
            <Input label="Confirm Password" type="password" placeholder="Repeat password"
              value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />

            {error && <div style={{fontSize:'12.5px',color:'rgba(239,68,68,0.85)',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'7px',padding:'10px 12px',marginBottom:'14px',lineHeight:1.5}}>{error}</div>}
            {success && <div style={{fontSize:'12.5px',color:'rgba(34,197,94,0.85)',background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.15)',borderRadius:'7px',padding:'10px 12px',marginBottom:'14px',lineHeight:1.5}}>{success}</div>}

            <Btn onClick={handleResetPassword} loading={loading}>{loading?'Resetting...':'Reset Password'}</Btn>

            <p style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.22)',marginTop:'20px',cursor:'pointer'}} onClick={()=>{setStep(1);setError('');}}>
              ← Try different email
            </p>
          </>
        )}
      </div>
    </div>
  );
}