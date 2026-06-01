import React from 'react';

export default function LoadingSpinner({ text = 'Loading your cosmic blueprint...' }) {
  return (
    <div style={containerStyle}>
      <div style={spinnerStyle}></div>
      <p style={textStyle}>{text}</p>
    </div>
  );
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  textAlign: 'center',
  minHeight: '200px'
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '3px solid var(--border-color)',
  borderTop: '3px solid var(--gold)',
  borderRadius: '50%',
  animation: 'spin 1.2s linear infinite',
  marginBottom: '16px'
};

const textStyle = {
  color: 'var(--gold)',
  fontSize: '14.5px',
  fontWeight: '600',
  letterSpacing: '0.5px'
};
