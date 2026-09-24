// components/ImmersiveBackground.jsx
import React from 'react';

const THEMES = {
  business: { bg: '#0D1B2A', accent: '#415A77' },
  travel: { bg: '#1B263B', accent: '#778DA9' },
  casual: { bg: '#2C1B18', accent: '#D87A5E' }
};

export default function ImmersiveBackground({ themeKey = 'casual', children }) {
  const currentTheme = THEMES[themeKey] || THEMES.casual;

  return (
    <div style={{ backgroundColor: currentTheme.bg, minHeight: '100vh', transition: 'background 0.5s ease' }}>
      <div style={{ borderBottom: `3px solid ${currentTheme.accent}`, padding: '8px 16px' }}>
        <span style={{ fontSize: '12px', color: currentTheme.accent, fontWeight: 'bold', textTransform: 'uppercase' }}>
          Immersive Mode: {themeKey}
        </span>
      </div>
      {children}
    </div>
  );
}
