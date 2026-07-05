import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';


const FAMILIES = ['AUTOMOTIVE','BABY CARE','BEAUTY','BEVERAGES','BOOKS','BREAD/BAKERY','CLEANING','CLOTHING','DAIRY','DELI','EGGS','FROZEN FOODS','GROCERY I','GROCERY II','HARDWARE','HOME AND KITCHEN I','HOME AND KITCHEN II','HOME CARE','LADIESWEAR','LAWN AND GARDEN','LIQUOR,WINE,BEER','MAGAZINES','MEATS','PERSONAL CARE','PET SUPPLIES','POULTRY','PREPARED FOODS','PRODUCE','SCHOOL AND OFFICE SUPPLIES','SEAFOOD','SEASONAL','PLAYERS AND ELECTRONICS','LINGERIE'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Simulator() {
  const [form, setForm] = useState({
    store_nbr: 1,
    family: 'BEVERAGES',
    month: 6,
    oil_price: 93.14,
    onpromotion: 0,
    is_holiday: 0,
    is_weekend: 0,
    day_of_week: 2,
    week_of_year: 24,
    quarter: 2
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scenarios, setScenarios] = useState({
    baseline: 0,
    promo_only: 0,
    holiday_only: 0,
    custom: 0
  });

  const API_URL = localStorage.getItem('demandiq_api_url') || process.env.REACT_APP_API_BASE_URL ;

  const runSimulation = useCallback(async (currentForm) => {
    setLoading(true);
    setError(null);
    try {
      // Create payloads for the 4 scenarios
      const basePayload = { ...currentForm, onpromotion: 0, is_holiday: 0, is_weekend: 0 };
      const promoPayload = { ...currentForm, onpromotion: 1, is_holiday: 0, is_weekend: 0 };
      const holPayload = { ...currentForm, onpromotion: 0, is_holiday: 1, is_weekend: 0 };
      const customPayload = { ...currentForm };

      const [rBase, rPromo, rHol, rCustom] = await Promise.all([
        axios.post(`${API_URL}/predict`, basePayload),
        axios.post(`${API_URL}/predict`, promoPayload),
        axios.post(`${API_URL}/predict`, holPayload),
        axios.post(`${API_URL}/predict`, customPayload)
      ]);

      setScenarios({
        baseline: rBase.data.predicted_sales,
        promo_only: rPromo.data.predicted_sales,
        holiday_only: rHol.data.predicted_sales,
        custom: rCustom.data.predicted_sales
      });
    } catch (err) {
      setError('Simulation model unavailable. Check your backend status in Settings.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Debounced run simulation or run on input change
  useEffect(() => {
    runSimulation(form);
  }, [form, runSimulation]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getPercentShift = (val, base) => {
    if (!base) return '0%';
    const pct = ((val - base) / base) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  // Prepare chart data
  const chartData = [
    { name: 'Baseline', Sales: scenarios.baseline, color: 'rgba(255,255,255,0.25)' },
    { name: 'Promotion Only', Sales: scenarios.promo_only, color: '#22c55e' },
    { name: 'Holiday Only', Sales: scenarios.holiday_only, color: '#f59e0b' },
    { name: 'Custom Scenario', Sales: scenarios.custom, color: '#a855f7' }
  ];

  return (
    <Layout activeNav="Simulator">
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 30px', animation: 'fadeUp 0.5s ease' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px 0' }}>Demand Simulator</h1>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Run "what-if" business scenarios in real time. Adjust sliders to simulate pricing promotions, macroeconomic fluctuations, and calendar effects.
          </p>
        </div>

        {error && (
          <div style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '12px 16px', lineHeight: 1.6 }}>
            ⚠️ <b>Simulator Error:</b> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Simulation Controls Sidebar */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              🛠️ Scenario Variables
            </h3>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>Store Number</label>
                <input type="number" min="1" max="54" value={form.store_nbr}
                  onChange={e => updateField('store_nbr', parseInt(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>Product Family</label>
                <select value={form.family} onChange={e => updateField('family', e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: 'rgba(255,255,255,0.8)', outline: 'none', fontFamily: 'inherit' }}>
                  {FAMILIES.map(f => <option key={f} value={f} style={{ background: '#111' }}>{f}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>Month</label>
                <select value={form.month} onChange={e => updateField('month', parseInt(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', color: 'rgba(255,255,255,0.8)', outline: 'none', fontFamily: 'inherit' }}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1} style={{ background: '#111' }}>{m}</option>)}
                </select>
              </div>

              {/* Oil Price Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Oil Price Index</label>
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>${form.oil_price} / bbl</span>
                </div>
                <input type="range" min="10" max="150" step="0.5" value={form.oil_price}
                  onChange={e => updateField('oil_price', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }} />
              </div>

              {/* Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                {[
                  { label: '🔥 Promo Run Active', key: 'onpromotion' },
                  { label: '🎉 Calendar Holiday', key: 'is_holiday' },
                  { label: '🗓️ Weekend Focus', key: 'is_weekend' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                    <div onClick={() => updateField(item.key, form[item.key] === 1 ? 0 : 1)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px',
                        background: form[item.key] === 1 ? '#22c55e' : 'rgba(255,255,255,0.1)',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0
                      }}>
                      <div style={{
                        position: 'absolute', top: '3px', left: form[item.key] === 1 ? '21px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                        transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Interactive Simulation Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Chart Area */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                  📊 Scenario Yield Comparison (Sales Volume)
                </h3>
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Simulating...</span>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="Sales" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { name: 'Baseline', val: scenarios.baseline.toLocaleString(), shift: 'Baseline', color: 'rgba(255,255,255,0.4)', bg: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent)' },
                { name: 'Promo Boost', val: scenarios.promo_only.toLocaleString(), shift: getPercentShift(scenarios.promo_only, scenarios.baseline), color: '#22c55e', bg: 'linear-gradient(180deg, rgba(34,197,94,0.05), transparent)' },
                { name: 'Holiday Effect', val: scenarios.holiday_only.toLocaleString(), shift: getPercentShift(scenarios.holiday_only, scenarios.baseline), color: '#f59e0b', bg: 'linear-gradient(180deg, rgba(245,158,11,0.05), transparent)' },
                { name: 'Custom Scenario', val: scenarios.custom.toLocaleString(), shift: getPercentShift(scenarios.custom, scenarios.baseline), color: '#a855f7', bg: 'linear-gradient(180deg, rgba(168,85,247,0.05), transparent)' }
              ].map((card, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: card.color }}></div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{card.name}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{card.val}</div>
                  <div style={{ fontSize: '11px', color: card.color, fontWeight: 600 }}>{card.shift === 'Baseline' ? 'Default baseline' : `${card.shift} swing`}</div>
                </div>
              ))}
            </div>

            {/* Strategic Advice Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 12px 0' }}>
                💡 Simulation Impact & Logistics Strategy
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {scenarios.custom > scenarios.baseline * 1.15 ? (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, borderLeft: '2px solid #22c55e', paddingLeft: '12px' }}>
                    📈 <b>High Demand Yield Strategy:</b> Custom variables trigger a high demand surge (+{getPercentShift(scenarios.custom, scenarios.baseline)}). We recommend raising logistics safety stocks by 15-20% and requesting additional transport runs for <b>{form.family}</b> to avoid shelf outs.
                  </div>
                ) : scenarios.custom < scenarios.baseline * 0.85 ? (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, borderLeft: '2px solid #ef4444', paddingLeft: '12px' }}>
                    📉 <b>Surplus Risk Strategy:</b> Custom inputs show a demand dip ({getPercentShift(scenarios.custom, scenarios.baseline)}). To prevent excess holding costs or waste in perishable lines, decrease order sizes and review supplier lead times for Store {form.store_nbr}.
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '12px' }}>
                    ✅ <b>Inventory Stability Strategy:</b> Simulated variables match baseline guidelines. Standard safety stock policies should apply. Monitor oil price indexes regularly as they indirectly impact logistics overhead.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '4px 12px' }}>
                    Month: {MONTHS[form.month - 1]}
                  </span>
                  <span style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '4px 12px' }}>
                    Store: #{form.store_nbr}
                  </span>
                  <span style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '4px 12px' }}>
                    Oil: ${form.oil_price}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
