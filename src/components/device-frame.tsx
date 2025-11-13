'use client'

import React, { ReactNode } from 'react'

export default function DeviceFrame({ children }: { children: ReactNode }) {
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(180deg,#e6eef9 0%, #f7fbff 100%)',
    padding: '24px',
  }

  const deviceStyle: React.CSSProperties = {
    width: 390,
    height: 844,
    borderRadius: 48,
    boxShadow: '0 30px 60px rgba(16,24,40,0.25)',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transformOrigin: 'center',
  }

  const scaleDown: React.CSSProperties = {
    transform: 'scale(0.95)',
  }

  const statusBarStyle: React.CSSProperties = {
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: 12,
    color: '#111827',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
    backdropFilter: 'blur(6px)',
  }

  const notchStyle: React.CSSProperties = {
    position: 'absolute',
    top: 6,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 210,
    height: 34,
    background: '#111',
    borderRadius: '10px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    opacity: 0.95,
    zIndex: 30,
  }

  const homeIndicatorStyle: React.CSSProperties = {
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const homeBarStyle: React.CSSProperties = {
    width: 134,
    height: 6,
    borderRadius: 999,
    background: 'rgba(0,0,0,0.15)',
  }

  return (
    <div style={wrapperStyle}>
      <div style={{ ...deviceStyle, ...scaleDown }}>
        <div style={statusBarStyle}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div>9:41</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
            <div>🔋100%</div>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={notchStyle} />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
          </div>
        </div>

        <div style={homeIndicatorStyle}>
          <div style={homeBarStyle} />
        </div>
      </div>
    </div>
  )
}
