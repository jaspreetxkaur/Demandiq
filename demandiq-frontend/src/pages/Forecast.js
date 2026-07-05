import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Forecast() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [csvData, setCsvData] = useState(null);

  const API_URL = process.env.REACT_APP_API_BASE_URL;
  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    return { headers, rows };
  };

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setResult(null);

    // Read client-side for table display
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setCsvData(parsed);
    };
    reader.readAsText(selectedFile);

    // Send to backend
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${apiUrl}/api/forecast/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch (err) {
      setError('Failed to communicate with forecasting backend. Ensure the server is online.');
    } finally {
      setLoading(false);
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

  const exportPredictedCSV = () => {
    if (!csvData || !result || !result.predictions) return;
    let csvContent = '';
    const headers = [...csvData.headers, 'predicted_sales'];
    csvContent += headers.join(',') + '\n';

    csvData.rows.forEach((row, i) => {
      const prediction = result.predictions[i] !== undefined ? result.predictions[i] : '0';
      const values = csvData.headers.map(h => row[h]);
      values.push(prediction);
      csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demandiq_predictions_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Prepare chart data
  const chartData = result?.predictions?.map((val, idx) => ({
    name: `Row ${idx + 1}`,
    Sales: val,
    Baseline: result.what_if?.baseline ? Math.round(result.what_if.baseline / result.predictions.length) : val
  })) || [];

  return (
    <Layout activeNav="Forecast">
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 30px', animation: 'fadeUp 0.5s ease' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px 0' }}>Bulk Batch Forecasting</h1>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Upload multi-row time-series datasets to run batch models and generate full-scale projections.
            </p>
          </div>
          {!result && (
            <button onClick={downloadSampleTemplate} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'transparent'; }}>
              📥 Download Sample CSV Template
            </button>
          )}
        </div>

        {error && (
          <div style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '12px 16px', lineHeight: 1.6 }}>
            ⚠️ <b>Upload Error:</b> {error}
          </div>
        )}

        {!result ? (
          /* INITIAL STATE: Drag & Drop Dropzone */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '40px 0' }}>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) await handleFileUpload(droppedFile);
              }}
              onClick={() => document.getElementById('bulk-csv-input').click()}
              style={{
                width: '100%',
                maxWidth: '680px',
                border: '2px dashed rgba(255,255,255,0.12)',
                borderRadius: '16px',
                padding: '60px 40px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
            >
              <input type="file" id="bulk-csv-input" accept=".csv" style={{ display: 'none' }}
                onChange={async (e) => {
                  const selectedFile = e.target.files[0];
                  if (selectedFile) await handleFileUpload(selectedFile);
                }}
              />
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                {loading ? 'Processing dataset...' : 'Upload your Time-Series Dataset'}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
                Drag and drop your store forecasting CSV file here, or click to browse.<br />
                Files must match the required columns schema.
              </p>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Parsing rows & running LightGBM pipeline...</span>
                </div>
              ) : (
                <span style={{ background: '#fff', color: '#000', padding: '12px 28px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, boxShadow: '0 4px 14px rgba(255,255,255,0.05)' }}>
                  Select CSV File
                </span>
              )}
            </div>

            {/* Steps guidelines */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', width: '100%', maxWidth: '680px', marginTop: '16px' }}>
              {[
                { step: '1', title: 'Prepare Data', desc: 'Download our template. Supply store numbers, holiday indicators, and oil price logs.' },
                { step: '2', title: 'Batch Upload', desc: 'Drop the file to trigger concurrent predictions and aggregate SHAP values.' },
                { step: '3', title: 'Export Insights', desc: 'Review anomaly flags, inspect predictions inline, and download predicted CSV.' }
              ].map(item => (
                <div key={item.step} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifySelf: 'flex-start', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{item.step}</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '4px 0 0 0' }}>{item.title}</h4>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* RESULTS STATE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>File: <b>{file.name}</b> ({csvData?.rows?.length} records)</span>
                <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }}></span>
                <span style={{ fontSize: '12.5px', color: result.anomaly.is_anomaly ? '#ef4444' : '#22c55e', background: result.anomaly.is_anomaly ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${result.anomaly.is_anomaly ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}`, padding: '3px 10px', borderRadius: '100px', fontWeight: 500 }}>
                  {result.anomaly.is_anomaly ? '⚠️ Anomalies Detected' : '✅ No Anomalies'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={exportPredictedCSV} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  📤 Export Predicted CSV
                </button>
                <button onClick={() => { setResult(null); setFile(null); setCsvData(null); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear Upload
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { title: 'Total Projected Sales', val: result.predicted_sales.toLocaleString(), sub: 'units across all periods', color: '#fff', border: 'rgba(255,255,255,0.06)' },
                { title: 'Processed Records', val: csvData?.rows?.length || 0, sub: 'individual rows parsed', color: '#fff', border: 'rgba(255,255,255,0.06)' },
                { title: 'Baseline Sales', val: result.what_if?.baseline?.toLocaleString() || '—', sub: 'without promo/holiday', color: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.06)' },
                { title: 'Promo Uplift', val: result.what_if?.promotion_only && result.what_if?.baseline ? `+${(((result.what_if.promotion_only - result.what_if.baseline) / result.what_if.baseline) * 100).toFixed(1)}%` : '—', sub: 'estimated promo boost', color: '#22c55e', border: 'rgba(34,197,94,0.15)' }
              ].map((card, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${card.border}`, borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{card.title}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: card.color, marginBottom: '4px' }}>{card.val}</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.25)' }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart Section */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 20px 0' }}>
                Batch Projections Chart
              </h3>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="Sales" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Baseline" stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Details Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              
              {/* Recommendations */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px 0' }}>
                  💡 Logistical Advice & Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.advice?.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 14px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{tip.split(' ')[0]}</span>
                      <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{tip.split(' ').slice(1).join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explainer */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px 0' }}>
                    🧠 Batch Summary Explanation
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, borderLeft: '2px solid #22c55e', paddingLeft: '12px', margin: 0 }}>
                    {result.explanation}
                  </p>
                </div>
                
                {/* Feature importance list */}
                <div>
                  <h4 style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, margin: '0 0 10px 0' }}>
                    Consolidated SHAP Driver Influences
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.shap_drivers?.map((driver, idx) => (
                      <div key={idx} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{driver.feature.replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: 600, color: driver.impact >= 0 ? '#22c55e' : '#ef4444' }}>
                          {driver.impact >= 0 ? '+' : ''}{driver.impact} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Table Spreadsheet Section */}
            {csvData && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px 0' }}>
                  Dataset Predictions Preview
                </h3>
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px', color: 'rgba(255,255,255,0.7)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Row #</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Store</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Product Family</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Month</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Promotion</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>Holiday</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#22c55e', textAlign: 'right' }}>Predicted Sales (Units)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.rows.map((row, index) => {
                        const predVal = result.predictions[index];
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.3)' }}>{index + 1}</td>
                            <td style={{ padding: '10px 16px' }}>{row.store_nbr || '—'}</td>
                            <td style={{ padding: '10px 16px', fontWeight: 500 }}>{row.family || '—'}</td>
                            <td style={{ padding: '10px 16px' }}>{row.month || '—'}</td>
                            <td style={{ padding: '10px 16px' }}>
                              {row.onpromotion === '1' || row.onpromotion === 1 ? (
                                <span style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>Promo</span>
                              ) : 'None'}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {row.is_holiday === '1' || row.is_holiday === 1 ? (
                                <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>Holiday</span>
                              ) : 'No'}
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: 700, color: '#fff', textAlign: 'right' }}>
                              {predVal !== undefined ? predVal.toLocaleString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </Layout>
  );
}
