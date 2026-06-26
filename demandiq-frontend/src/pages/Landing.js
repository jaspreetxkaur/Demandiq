
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';



function FeatureCard({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#111' : '#080808',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: '12px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '220px',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.25s ease',
        cursor: 'default',
      }}
    >
      <div style={{fontSize:'26px',marginBottom:'16px'}}>{icon}</div>
      <h3 style={{fontSize:'15px',fontWeight:600,color:'#fff',marginBottom:'10px',letterSpacing:'-0.2px'}}>{title}</h3>
      <p style={{fontSize:'13px',color:'rgba(255,255,255,0.35)',lineHeight:1.7}}>{desc}</p>
    </div>
  );
}

function Btn({ children, onClick, primary, small }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary ? (hovered ? 'rgba(255,255,255,0.88)' : '#fff') : 'transparent',
        border: primary ? 'none' : `1px solid ${hovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
        color: primary ? '#000' : (hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)'),
        padding: small ? '6px 14px' : '10px 22px',
        borderRadius: '7px',
        fontSize: small ? '12.5px' : '13.5px',
        fontWeight: primary ? 600 : 400,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: primary && hovered ? '0 8px 20px rgba(255,255,255,0.1)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}

export default function Landing() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const points = 60;
    const actual = Array.from({length: points}, (_,i) =>
      400 + Math.sin(i*0.18)*120 + Math.sin(i*0.4)*40 + Math.random()*30
    );
    const forecast = actual.map((v,i) =>
      i < points-15 ? null : v + (Math.random()-0.5)*60
    );

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.012;

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = (H/8)*i;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const x = (W/12)*i;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }

      const maxV = Math.max(...actual)+60;
      const minV = Math.min(...actual)-60;
      const scaleX = W/(points-1);
      const scaleY = (H-60)/(maxV-minV);
      const toX = i => i*scaleX;
      const toY = v => H-30-(v-minV)*scaleY;
      const progress = Math.min(1, t/3);
      const vp = Math.floor(progress*points);

      if (vp > 1) {
        const grad = ctx.createLinearGradient(0,0,0,H);
        grad.addColorStop(0,'rgba(255,255,255,0.06)');
        grad.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(toX(0),H);
        for (let i=0;i<vp;i++) ctx.lineTo(toX(i),toY(actual[i]));
        ctx.lineTo(toX(vp-1),H);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();

        ctx.beginPath();
        ctx.moveTo(toX(0),toY(actual[0]));
        for (let i=1;i<vp;i++) ctx.lineTo(toX(i),toY(actual[i]));
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5; ctx.stroke();
      }

      const fStart = points-15;
      if (vp > fStart) {
        ctx.beginPath();
        ctx.setLineDash([4,4]);
        ctx.moveTo(toX(fStart),toY(actual[fStart]));
        for (let i=fStart;i<vp;i++) {
          if (forecast[i]!==null) ctx.lineTo(toX(i),toY(forecast[i]));
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.setLineDash([]);
      }

      if (vp>1 && vp<points) {
        const i = vp-1;
        const pulse = Math.sin(t*4)*0.3+1;
        const glow = ctx.createRadialGradient(toX(i),toY(actual[i]),0,toX(i),toY(actual[i]),12);
        glow.addColorStop(0,'rgba(255,255,255,0.3)');
        glow.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(toX(i),toY(actual[i]),12,0,Math.PI*2);
        ctx.fillStyle = glow; ctx.fill();
        ctx.beginPath(); ctx.arc(toX(i),toY(actual[i]),4*pulse,0,Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].forEach((m,i) => {
        ctx.fillText(m, toX(i*5), H-8);
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px Inter';
      ctx.fillText('— Actual Sales', 12, 20);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillText('- - AI Forecast', 12, 36);

      animId = requestAnimationFrame(draw);
    }
    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const tr = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: `all 0.7s ${delay}s cubic-bezier(0.16,1,0.3,1)`
  });

  return (
    <div style={{background:'#080808',minHeight:'100vh',color:'#fff',fontFamily:'"Inter",-apple-system,sans-serif'}}>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',height:'56px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(8,8,8,0.85)',backdropFilter:'blur(16px)'}}>
      <Logo size={22} textSize={15} />
        <div style={{display:'flex',gap:'28px'}}>
          {['Product','Features','Pricing','Docs'].map(l=>(
            <span key={l} style={{color:'rgba(255,255,255,0.35)',fontSize:'13px',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <Btn small onClick={()=>navigate('/login')}>Log in</Btn>
          <Btn small primary onClick={()=>navigate('/signup')}>Get started</Btn>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:'100vh',display:'flex',alignItems:'center',padding:'80px 48px 60px',gap:'60px'}}>
        <div style={{flex:'0 0 44%',display:'flex',flexDirection:'column'}}>
          <div style={{...tr(0.1),display:'inline-flex',alignItems:'center',gap:'6px',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.35)',fontSize:'10.5px',padding:'4px 11px',borderRadius:'100px',marginBottom:'32px',width:'fit-content'}}>
            <span style={{width:'4px',height:'4px',background:'rgba(255,255,255,0.35)',borderRadius:'50%',display:'inline-block'}}></span>
            AI-native demand intelligence
          </div>
          <div style={{overflow:'hidden',marginBottom:'4px'}}>
            <h1 style={{fontSize:'clamp(36px,4vw,56px)',fontWeight:800,lineHeight:1.05,letterSpacing:'-2.5px',color:'#fff',transform:visible?'translateY(0)':'translateY(100%)',transition:'transform 0.8s 0.2s cubic-bezier(0.16,1,0.3,1)',margin:0}}>Forecast demand.</h1>
          </div>
          <div style={{overflow:'hidden',marginBottom:'4px'}}>
            <h1 style={{fontSize:'clamp(36px,4vw,56px)',fontWeight:800,lineHeight:1.05,letterSpacing:'-2.5px',color:'#fff',transform:visible?'translateY(0)':'translateY(100%)',transition:'transform 0.8s 0.32s cubic-bezier(0.16,1,0.3,1)',margin:0}}>Understand it.</h1>
          </div>
          <div style={{overflow:'hidden',marginBottom:'28px'}}>
            <h1 style={{fontSize:'clamp(36px,4vw,56px)',fontWeight:800,lineHeight:1.05,letterSpacing:'-2.5px',color:'rgba(255,255,255,0.22)',transform:visible?'translateY(0)':'translateY(100%)',transition:'transform 0.8s 0.44s cubic-bezier(0.16,1,0.3,1)',margin:0}}>Act on it.</h1>
          </div>
          <p style={{...tr(0.55),fontSize:'15px',color:'rgba(255,255,255,0.38)',lineHeight:1.8,maxWidth:'360px',marginBottom:'36px'}}>
            Give your retail team the precision of a data science department — without hiring one. Predict, explain, simulate.
          </p>
          <div style={{...tr(0.68),display:'flex',gap:'10px',marginBottom:'56px'}}>
            <Btn primary onClick={()=>navigate('/signup')}>Start for free</Btn>
            <Btn onClick={()=>navigate('/dashboard')}>Live demo →</Btn>
          </div>
          <div style={{...tr(0.8),display:'flex',gap:'36px',paddingTop:'36px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            {[['96%','Forecast accuracy'],['3M+','Training records'],['54','Store networks']].map(([v,l])=>(
              <div key={l}>
                <div style={{fontSize:'20px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px'}}>{v}</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'3px'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT CHART */}
        <div style={{flex:1}}>
          <div style={{...tr(0.4),background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',gap:'6px'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'rgba(255,77,77,0.6)'}}></div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'rgba(255,189,46,0.6)'}}></div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'rgba(40,200,64,0.6)'}}></div>
              </div>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.18)'}}>demandiq.app / forecast</span>
              <div style={{width:'60px'}}></div>
            </div>
            <div style={{padding:'24px 20px 16px'}}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.22)',marginBottom:'4px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Sales Forecast — Store 1 · Beverages</div>
              <div style={{fontSize:'24px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'16px'}}>2,272 <span style={{fontSize:'13px',fontWeight:400,color:'rgba(255,255,255,0.28)'}}>units predicted</span></div>
              <canvas ref={canvasRef} style={{width:'100%',height:'200px',display:'block'}} />
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:'20px'}}>
              {[['↑ 2.4%','Holiday effect'],['↑ 1.5%','Promotion'],['✓ Normal','Demand range']].map(([v,l])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <span style={{fontSize:'12px',fontWeight:600,color:'rgba(255,255,255,0.55)'}}>{v}</span>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.18)'}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'80px 48px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{fontSize:'10.5px',color:'rgba(255,255,255,0.25)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'14px'}}>What DemandIQ does</div>
        <h2 style={{fontSize:'clamp(22px,2.8vw,34px)',fontWeight:700,letterSpacing:'-1px',lineHeight:1.1,color:'#fff',marginBottom:'48px'}}>
          Prediction is step one.<br/>
          <span style={{color:'rgba(255,255,255,0.25)'}}>Explanation is the product.</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          {[
            ['📈','Sales Forecasting','LightGBM trained on 3M+ real retail records. 7–28 day predictions per store and product.'],
            ['🧠','Plain-English Explanations','SHAP values converted to natural language. Not just numbers — reasons.'],
            ['🚨','Anomaly Detection','Automatic alerts when demand deviates beyond normal bounds. Know before stockouts.'],
            ['🎛️','What-If Simulator','Adjust promotion, toggle holidays. See forecast impact before committing budget.'],
            ['🏪','Multi-Store Support','54 stores, 33 product families — all unified in one dashboard.'],
            ['📊','Feature Impact Charts','See exactly which signals drive sales — visualised as SHAP importance charts.'],
          ].map(([icon,title,desc],i) => (
            <FeatureCard key={i} icon={icon} title={title} desc={desc} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 48px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <h2 style={{fontSize:'clamp(22px,2.8vw,38px)',fontWeight:700,letterSpacing:'-1px',marginBottom:'12px',color:'#fff'}}>Your next forecast<br/>is one login away.</h2>
        <p style={{color:'rgba(255,255,255,0.28)',fontSize:'14px',marginBottom:'28px',maxWidth:'400px',lineHeight:1.7}}>No data science degree required. Select a store, pick a product, get a forecast with full explanation.</p>
        <Btn primary onClick={()=>navigate('/signup')}>Get started free</Btn>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'24px 48px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,0.15)'}}>© 2025 DemandIQ</div>
        <div style={{display:'flex',gap:'20px'}}>
          {['Privacy','Terms','GitHub','Contact'].map(l=><span key={l} style={{fontSize:'12px',color:'rgba(255,255,255,0.15)',cursor:'pointer'}}>{l}</span>)}
        </div>
      </footer>
    </div>
  );
}