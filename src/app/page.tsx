'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const MapSelector = dynamic(() => import('@/components/map-selector'), { ssr: false })

export default function Page() {
  const [selectedAOI, setSelectedAOI] = useState<{ minLon: number; minLat: number; maxLon: number; maxLat: number } | null>(null)

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.1)' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#333' }}>🌍 Jeru3D - ת‍ת‍צוגה תלת‑ממדית של ירושלים ב‑AR</h1>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          בחר אזור במפה (גרור כדי לצייר או לחץ על כפתור מהיר), ואז צפה בו בAR
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapSelector onSelectAOI={setSelectedAOI} selectedAOI={selectedAOI} />
      </div>
      {selectedAOI && (
        <div style={{ padding: '15px', background: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ color: '#333' }}>
            <strong>✓ נבחר:</strong> {selectedAOI.minLat.toFixed(4)}°–{selectedAOI.maxLat.toFixed(4)}°N, {selectedAOI.minLon.toFixed(4)}°–{selectedAOI.maxLon.toFixed(4)}°E
          </div>
          <a
            href={`/ar?minLon=${selectedAOI.minLon}&minLat=${selectedAOI.minLat}&maxLon=${selectedAOI.maxLon}&maxLat=${selectedAOI.maxLat}`}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.background = '#218838'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.background = '#28a745'
            }}
          >
            👁️ צפה ב‑AR 🚀
          </a>
        </div>
      )}
    </main>
  )
}
