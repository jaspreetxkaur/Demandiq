import React from 'react';

export default function Logo({ size = 22, showText = true, textSize = 15 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox="0 0 36 36">
        <rect x="2" y="0" width="32" height="32" rx="8" fill="#fff" />
        <rect x="9" y="18" width="5" height="9" rx="1.5" fill="#080808" />
        <rect x="16" y="13" width="5" height="14" rx="1.5" fill="#080808" />
        <rect x="23" y="8" width="5" height="19" rx="1.5" fill="#080808" />
      </svg>
      {showText && (
        <span style={{ fontSize: `${textSize}px`, fontWeight: 700, color: '#fff' }}>
          DemandIQ
        </span>
      )}
    </div>
  );
}