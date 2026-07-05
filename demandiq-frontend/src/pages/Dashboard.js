import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';


const FAMILIES = ['AUTOMOTIVE','BABY CARE','BEAUTY','BEVERAGES','BOOKS','BREAD/BAKERY','CLEANING','CLOTHING','DAIRY','DELI','EGGS','FROZEN FOODS','GROCERY I','GROCERY II','HARDWARE','HOME AND KITCHEN I','HOME AND KITCHEN II','HOME CARE','LADIESWEAR','LAWN AND GARDEN','LIQUOR,WINE,BEER','MAGAZINES','MEATS','PERSONAL CARE','PET SUPPLIES','POULTRY','PREPARED FOODS','PRODUCE','SCHOOL AND OFFICE SUPPLIES','SEAFOOD','SEASONAL','PLAYERS AND ELECTRONICS','LINGERIE'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const numberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeForecastPayload(values) {
  return {
    ...values,
    store_nbr: clamp(Math.round(numberOrDefault(values.store_nbr, 1)), 1, 54),
    family: FAMILIES.includes(values.family) ? values.family : 'BEVERAGES',
    onpromotion: values.onpromotion ? 1 : 0,
    is_holiday: values.is_holiday ? 1 : 0,
    oil_price: Math.max(0, numberOrDefault(values.oil_price, 0)),
    month: clamp(Math.round(numberOrDefault(values.month, 1)), 1, 12),
    day_of_week: clamp(Math.round(numberOrDefault(values.day_of_week, 0)), 0, 6),
    week_of_year: clamp(Math.round(numberOrDefault(values.week_of_year, 1)), 1, 53),
    quarter: clamp(Math.round(numberOrDefault(values.quarter, 1)), 1, 4),
    is_weekend: values.is_weekend ? 1 : 0,
  };
}

const getPercentChange = (value, baseline) => {
  const currentValue = Number(value);
  const baselineValue = Number(baseline);
  if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue) || baselineValue === 0) return null;
  return ((currentValue - baselineValue) / baselineValue) * 100;
};

const formatPercentChange = (value) => {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

function Toggle({ value, onChange }) {
  return (
    <div onClick={()=>onChange(!value)} style={{width:'42px',height:'24px',borderRadius:'12px',background:value?'#22c55e':'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'all 0.3s',flexShrink:0,boxShadow:value?'0 0 12px rgba(34,197,94,0.3)':'none'}}>
      <div style={{position:'absolute',top:'3px',left:value?'21px':'3px',width:'18px',height:'18px',borderRadius:'50%',background:'#fff',transition:'all 0.3s',boxShadow:'0 2px 4px rgba(0,0,0,0.3)'}}></div>
    </div>
  );
}

function AnimatedChart({ predicted, baseline, dataPoints }) {
  const canvasRef = useRef(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const baseVal = baseline || 400;
    let data = dataPoints && dataPoints.length > 0
      ? [...dataPoints]
      : MONTHS.map((_,i) => baseVal + Math.sin(i*0.5)*80 + Math.random()*40);
    
    if (!dataPoints || dataPoints.length === 0) {
      data[data.length-1] = predicted;
    }

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0,0,W,H);
      t += 0.015;
      const progress = Math.min(1, t/2);
      const vp = Math.floor(progress * data.length);
      const maxV = Math.max(...data)+60, minV = Math.min(...data)-60;
      const toX = i => (i/Math.max(1, data.length-1))*W;
      const toY = v => H-20-(v-minV)/Math.max(0.1, maxV-minV)*(H-40);
      ctx.strokeStyle='rgba(255,255,255,0.04)';
      ctx.lineWidth=1;
      for(let i=0;i<5;i++){
        const y=(H/5)*i;
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
      }
      if(vp>1){
        const grad = ctx.createLinearGradient(0,0,0,H);
        grad.addColorStop(0,'rgba(34,197,94,0.15)');
        grad.addColorStop(1,'rgba(34,197,94,0)');
        ctx.beginPath();
        ctx.moveTo(toX(0),H);
        for(let i=0;i<vp;i++) ctx.lineTo(toX(i),toY(data[i]));
        ctx.lineTo(toX(vp-1),H);
        ctx.closePath();
        ctx.fillStyle=grad;ctx.fill();
        ctx.beginPath();
        ctx.moveTo(toX(0),toY(data[0]));
        for(let i=1;i<vp;i++) ctx.lineTo(toX(i),toY(data[i]));
        ctx.strokeStyle='rgba(34,197,94,0.8)';
        ctx.lineWidth=2;ctx.stroke();
        if(vp>=data.length){
          const px=toX(data.length-1), py=toY(data[data.length-1]);
          const pulse=Math.sin(t*3)*0.3+1;
          const glow=ctx.createRadialGradient(px,py,0,px,py,16);
          glow.addColorStop(0,'rgba(34,197,94,0.4)');
          glow.addColorStop(1,'rgba(34,197,94,0)');
          ctx.beginPath();ctx.arc(px,py,16,0,Math.PI*2);
          ctx.fillStyle=glow;ctx.fill();
          ctx.beginPath();ctx.arc(px,py,5*pulse,0,Math.PI*2);
          ctx.fillStyle='#22c55e';ctx.fill();
        }
      }
      ctx.fillStyle='rgba(255,255,255,0.2)';
      ctx.font='10px Inter';ctx.textAlign='center';
      const step = Math.max(1, Math.floor(data.length / 12));
      for(let i=0; i<data.length; i+=step) {
        const m = MONTHS[i % 12];
        ctx.fillText(m, toX(i), H-4);
      }
      animId=requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize',resize);
    return()=>{ cancelAnimationFrame(animId); window.removeEventListener('resize',resize); };
  },[predicted,baseline,dataPoints]);
  return <canvas ref={canvasRef} style={{width:'100%',height:'200px',display:'block'}}/>;
}

function ShapBar({ feature, impact, max }) {
  const [w, setW] = useState(0);
  useEffect(()=>{ setTimeout(()=>setW(Math.abs(impact)/max*100), 100); },[impact,max]);
  const pos = impact>=0;
  return (
    <div style={{display:'grid',gridTemplateColumns:'130px 1fr 65px',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
      <div style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textAlign:'right',textTransform:'capitalize'}}>{feature.replace(/_/g,' ')}</div>
      <div style={{height:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${w}%`,background:pos?'linear-gradient(90deg,rgba(34,197,94,0.6),rgba(34,197,94,0.3))':'linear-gradient(90deg,rgba(239,68,68,0.6),rgba(239,68,68,0.3))',borderRadius:'3px',transition:'width 1.2s cubic-bezier(0.16,1,0.3,1)'}}></div>
      </div>
      <div style={{fontSize:'12px',fontWeight:600,color:pos?'#22c55e':'#ef4444'}}>{pos?'+':''}{impact}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color, gradient, icon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{background:hovered?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'18px 20px',transition:'all 0.2s',transform:hovered?'translateY(-2px)':'translateY(0)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:gradient||'rgba(255,255,255,0.1)'}}></div>
      <div style={{fontSize:'18px',marginBottom:'8px'}}>{icon}</div>
      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:'6px'}}>{label}</div>
      <div style={{fontSize:'22px',fontWeight:700,color:color||'#fff',letterSpacing:'-0.5px',marginBottom:'4px'}}>{value}</div>
      <div style={{fontSize:'11.5px',color:'rgba(255,255,255,0.25)'}}>{sub}</div>
    </div>
  );
}

function GenBtn({ onClick, loading }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?'rgba(255,255,255,0.92)':'#fff',color:'#000',border:'none',padding:'14px 48px',borderRadius:'10px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transform:h?'translateY(-2px)':'translateY(0)',boxShadow:h?'0 12px 32px rgba(255,255,255,0.15)':'0 4px 12px rgba(255,255,255,0.08)',transition:'all 0.2s',opacity:loading?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',letterSpacing:'-0.2px',minWidth:'220px'}}>
      {loading?<>
        <div style={{width:'16px',height:'16px',border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}></div>
        Generating...
      </>:'⚡ Generate Forecast'}
    </button>
  );
}

export default function Dashboard() {
  const [form, setForm] = useState({store_nbr:1,family:'BEVERAGES',onpromotion:0,is_holiday:0,oil_price:93.14,month:6,day_of_week:2,week_of_year:24,quarter:2,is_weekend:0});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getApiUrl = () => localStorage.getItem('demandiq_api_url') || process.env.REACT_APP_API_BASE_URL ;

  const predict = async () => {
    const payload = normalizeForecastPayload(form);
    setForm(payload);
    setLoading(true);
    setError(null);
    const activeUrl = getApiUrl();
    try {
      const res = await axios.post(`${activeUrl}/predict`, payload);
      setResult(res.data);
    } catch(e) {
      setError(`Backend unavailable at ${activeUrl}. Run the API server and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);
    const activeUrl = getApiUrl();
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${activeUrl}/api/forecast/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch(e) {
      setError('Backend upload failed. Make sure the backend server is running and accepts CSV uploads.');
    } finally {
      setLoading(false);
    }
  };

  const maxShap = result?Math.max(...(result.shap_drivers||[]).map(d=>Math.abs(d.impact))):1;

  return (
    <Layout activeNav="Dashboard">
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {!result ? (
          /* CENTERED CONFIGURE STATE */
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 20px'}}>
            <div style={{width:'100%',maxWidth:'560px',animation:'fadeUp 0.6s ease'}}>
              <div style={{textAlign:'center',marginBottom:'40px'}}>
                <div style={{fontSize:'32px',marginBottom:'12px'}}>📈</div>
                <h1 style={{fontSize:'24px',fontWeight:800,color:'#fff',letterSpacing:'-0.8px',marginBottom:'8px'}}>Demand Forecast</h1>
                <p style={{fontSize:'14px',color:'rgba(255,255,255,0.35)',lineHeight:1.7}}>Configure your store and scenario below, then generate an AI-powered forecast with SHAP explanations.</p>
              </div>

              {/* Config Card */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'28px'}}>
                {/* CSV Upload Dropzone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) await handleFileUpload(file);
                  }}
                  style={{
                    border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.01)',
                    cursor: 'pointer',
                    marginBottom: '24px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'; }}
                  onClick={() => document.getElementById('csv-file-input').click()}
                >
                  <input 
                    type="file" 
                    id="csv-file-input" 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) await handleFileUpload(file);
                    }}
                  />
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>📁</div>
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                    Upload time-series CSV data
                  </span>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '6px', marginBottom: 0 }}>
                    Drag and drop your file here, or click to browse.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 24px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px' }}>or configure manually</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                  <div>
                    <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Store Number</label>
                    <input type="number" min="1" max="54" value={form.store_nbr}
                      onChange={e=>setForm({...form,store_nbr:parseInt(e.target.value)})}
                      style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',color:'#fff',outline:'none',fontFamily:'inherit'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Month</label>
                    <select value={form.month} onChange={e=>setForm({...form,month:parseInt(e.target.value)})}
                      style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none',fontFamily:'inherit'}}>
                      {MONTHS.map((m,i)=>(
                        <option key={m} value={i+1} style={{background:'#111'}}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{marginBottom:'16px'}}>
                  <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Product Family</label>
                  <select value={form.family} onChange={e=>setForm({...form,family:e.target.value})}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none',fontFamily:'inherit'}}>
                    {FAMILIES.map(f=><option key={f} value={f} style={{background:'#111'}}>{f}</option>)}
                  </select>
                </div>

                <div style={{marginBottom:'20px'}}>
                  <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'7px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Oil Price (USD)</label>
                  <input type="number" step="0.01" value={form.oil_price}
                    onChange={e=>setForm({...form,oil_price:parseFloat(e.target.value)})}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',color:'#fff',outline:'none',fontFamily:'inherit'}}/>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'24px'}}>
                  {[['Promotion','onpromotion'],['Holiday','is_holiday'],['Weekend','is_weekend']].map(([label,key])=>(
                    <div key={key} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
                      <span style={{fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>{label}</span>
                      <Toggle value={form[key]===1} onChange={v=>setForm({...form,[key]:v?1:0})}/>
                    </div>
                  ))}
                </div>

                <div style={{display:'flex',justifyContent:'center'}}>
                  <GenBtn onClick={predict} loading={loading}/>
                </div>
                {error&&<div style={{marginTop:'12px',fontSize:'12px',color:'rgba(239,68,68,0.75)',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)',borderRadius:'7px',padding:'10px 12px',lineHeight:1.5,textAlign:'center'}}>{error}</div>}
              </div>
            </div>
          </div>
        ) : (
          /* RESULTS STATE — Split Layout */
          <div style={{flex:1,display:'flex',overflow:'hidden',animation:'fadeUp 0.5s ease'}}>

            {/* Left Config Panel */}
            <div style={{width:'260px',flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.06)',padding:'20px 18px',overflowY:'auto',background:'#060606'}}>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'14px'}}>Configure</div>

              {/* CSV Re-upload Dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) await handleFileUpload(file);
                }}
                style={{
                  border: '1px dashed rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '12px 10px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'; }}
                onClick={() => document.getElementById('csv-file-input-sidebar').click()}
              >
                <input 
                  type="file" 
                  id="csv-file-input-sidebar" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) await handleFileUpload(file);
                  }}
                />
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>📁</div>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                  Upload new CSV
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 16px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
              </div>

              <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'6px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Store</label>
              <input type="number" min="1" max="54" value={form.store_nbr}
                onChange={e=>setForm({...form,store_nbr:parseInt(e.target.value)})}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'#fff',outline:'none',fontFamily:'inherit',marginBottom:'12px'}}/>

              <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'6px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Product</label>
              <select value={form.family} onChange={e=>setForm({...form,family:e.target.value})}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'rgba(255,255,255,0.8)',outline:'none',fontFamily:'inherit',marginBottom:'12px'}}>
                {FAMILIES.map(f=><option key={f} value={f} style={{background:'#111'}}>{f}</option>)}
              </select>

              <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'6px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Oil Price</label>
              <input type="number" step="0.01" value={form.oil_price}
                onChange={e=>setForm({...form,oil_price:parseFloat(e.target.value)})}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'#fff',outline:'none',fontFamily:'inherit',marginBottom:'16px'}}/>

              <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'6px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Month</label>
              <select value={form.month} onChange={e=>setForm({...form,month:parseInt(e.target.value)})}
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'rgba(255,255,255,0.8)',outline:'none',fontFamily:'inherit',marginBottom:'16px'}}>
                {MONTHS.map((m,i)=>(
                  <option key={m} value={i+1} style={{background:'#111'}}>{m}</option>
                ))}
              </select>

              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px'}}>
                {[['Promotion','onpromotion'],['Holiday','is_holiday'],['Weekend','is_weekend']].map(([label,key])=>(
                  <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:'12.5px',color:'rgba(255,255,255,0.45)'}}>{label}</span>
                    <Toggle value={form[key]===1} onChange={v=>setForm({...form,[key]:v?1:0})}/>
                  </div>
                ))}
              </div>

              <button onClick={predict} style={{width:'100%',background:'#fff',color:'#000',border:'none',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:loading?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                {loading?<><div style={{width:'12px',height:'12px',border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}></div>Running...</>:'⚡ Regenerate'}
              </button>

              <button onClick={()=>setResult(null)} style={{width:'100%',background:'transparent',color:'rgba(255,255,255,0.3)',border:'1px solid rgba(255,255,255,0.07)',padding:'8px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',marginTop:'8px'}}>
                ← New Forecast
              </button>
            </div>

            {/* Right Results */}
            <div style={{flex:1,overflowY:'auto',padding:'36px 28px 24px'}}>
              {/* Big Number */}
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:'8px'}}>
                  Store {form.store_nbr} · {form.family} · {MONTHS[form.month-1]}
                </div>
                <div style={{display:'flex',alignItems:'flex-end',gap:'12px',marginBottom:'12px'}}>
                  <div style={{fontSize:'56px',fontWeight:800,letterSpacing:'-3px',lineHeight:1,background:'linear-gradient(135deg,#fff,rgba(255,255,255,0.6))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                    {result.predicted_sales.toLocaleString()}
                  </div>
                  <div style={{fontSize:'16px',color:'rgba(255,255,255,0.25)',paddingBottom:'8px'}}>units predicted</div>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'6px',background:result.anomaly.is_anomaly?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',border:`1px solid ${result.anomaly.is_anomaly?'rgba(239,68,68,0.25)':'rgba(34,197,94,0.25)'}`,borderRadius:'100px',padding:'5px 14px',fontSize:'12px',color:result.anomaly.is_anomaly?'#ef4444':'#22c55e',fontWeight:500}}>
                    {result.anomaly.is_anomaly?'⚠️ Anomaly':'✅ Normal'}
                  </span>
                  {result.what_if?.promotion_only&&result.what_if?.baseline&&(
                    <span style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'100px',padding:'5px 12px',fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>
                      Promo <b style={{color:'#22c55e'}}>{formatPercentChange(getPercentChange(result.what_if.promotion_only, result.what_if.baseline))}</b>
                    </span>
                  )}
                  {result.what_if?.holiday_only&&result.what_if?.baseline&&(
                    <span style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'100px',padding:'5px 12px',fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>
                      Holiday <b style={{color:'#f59e0b'}}>{formatPercentChange(getPercentChange(result.what_if.holiday_only, result.what_if.baseline))}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Chart */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1px',textTransform:'uppercase'}}>12-Month Sales Trend</div>
                  <div style={{display:'flex',gap:'14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <div style={{width:'18px',height:'2px',background:'rgba(34,197,94,0.7)',borderRadius:'1px'}}></div>
                      <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>Trend</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22c55e'}}></div>
                      <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>Predicted</span>
                    </div>
                  </div>
                </div>
                <AnimatedChart predicted={result.predicted_sales} baseline={result.what_if?.baseline} dataPoints={result.predictions}/>
              </div>

              {/* KPI Cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
                <KpiCard icon="📦" label="Predicted" value={result.predicted_sales.toLocaleString()} sub="units forecast" gradient="linear-gradient(90deg,#22c55e,#16a34a)"/>
                <KpiCard icon="📊" label="Baseline" value={result.what_if?.baseline?.toLocaleString()||'—'} sub="no promo/holiday" gradient="linear-gradient(90deg,rgba(255,255,255,0.3),rgba(255,255,255,0.05))"/>
                <KpiCard icon="🎯" label="With Promo" value={result.what_if?.promotion_only&&result.what_if?.baseline?formatPercentChange(getPercentChange(result.what_if.promotion_only, result.what_if.baseline)):'—'} sub="promotion active" color="#22c55e" gradient="linear-gradient(90deg,#22c55e,transparent)"/>
                <KpiCard icon="🎉" label="With Holiday" value={result.what_if?.holiday_only&&result.what_if?.baseline?formatPercentChange(getPercentChange(result.what_if.holiday_only, result.what_if.baseline)):'—'} sub="holiday effect" color="#f59e0b" gradient="linear-gradient(90deg,#f59e0b,transparent)"/>
              </div>

              {/* Bottom Row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px'}}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'12px'}}>🧠 AI Explanation</div>
                  <p style={{fontSize:'13.5px',color:'rgba(255,255,255,0.5)',lineHeight:1.8,borderLeft:'2px solid rgba(34,197,94,0.3)',paddingLeft:'12px',margin:0}}>
                    {result.explanation}
                  </p>
                </div>
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px'}}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'12px'}}>🎛️ What-If Scenarios</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                    {Object.entries(result.what_if).map(([key,val])=>{
                      const base=result.what_if.baseline;
                      const diff=getPercentChange(val, base);
                      const isBase=key==='baseline';
                      const pos=diff !== null && diff>=0;
                      return(
                        <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:isBase?'rgba(255,255,255,0.04)':'transparent',border:`1px solid ${isBase?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)'}`,borderRadius:'8px'}}>
                          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',textTransform:'capitalize'}}>{key.replace(/_/g,' ')}</span>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{val.toLocaleString()}</span>
                            {!isBase&&diff !== null&&<span style={{fontSize:'11px',color:pos?'#22c55e':'#ef4444',background:pos?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',padding:'2px 7px',borderRadius:'100px',fontWeight:500}}>{formatPercentChange(diff)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SHAP */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px'}}>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'16px'}}>📊 SHAP Feature Importance</div>
                {(result.shap_drivers||[]).map(({feature,impact})=>(
                  <ShapBar key={feature} feature={feature} impact={impact} max={maxShap}/>
                ))}
              </div>

              {/* Actionable Advice */}
              {result.advice && result.advice.length > 0 && (
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px',marginTop:'14px'}}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'14px'}}>💡 Actionable Recommendations</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {result.advice.map((tip, i) => (
                      <div key={i} style={{display:'flex',gap:'12px',alignItems:'flex-start',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'12px 14px'}}>
                        <span style={{fontSize:'18px',flexShrink:0}}>{tip.split(' ')[0]}</span>
                        <span style={{fontSize:'13.5px',color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>{tip.split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        )}
      </div>
    </Layout>
  );
}
