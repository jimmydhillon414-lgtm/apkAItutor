// components/RoleplaySelector.jsx
import React, { useState } from 'react';

const SCENARIOS = [
  { id: 'business', title: '💼 Business Meeting', prompt: 'Act as a senior manager conducting a performance review.' },
  { id: 'travel', title: '✈️ Airport Check-in', prompt: 'Act as an airline gate agent handling baggage issues.' },
  { id: 'casual', title: '☕ Coffee Shop Chat', prompt: 'Act as a friendly barista chatting about local events.' }
];

export default function RoleplaySelector({ onSelectScenario }) {
  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ color: '#fff' }}>Choose a Practice Scenario</h3>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        {SCENARIOS.map(s => (
          <button 
            key={s.id} 
            onClick={() => onSelectScenario(s)}
            style={{ padding: '12px 16px', borderRadius: '12px', background: '#116466', color: '#FFCB9A', border: '1px solid #FFCB9A', cursor: 'pointer' }}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}
