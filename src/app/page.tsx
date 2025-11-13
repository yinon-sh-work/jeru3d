'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const MapSelector = dynamic(() => import('@/components/map-selector'), { ssr: false })

export default function Page() {
  const [selectedAOI, setSelectedAOI] = useState<{ minLon: number; minLat: number; maxLon: number; maxLat: number } | null>(null)

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.1)' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#333' }}>Jeru3D - Jerusalem 3D AR Viewer</h1>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          Select a region on the map (click and drag to draw), then view it in AR
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapSelector onSelectAOI={setSelectedAOI} selectedAOI={selectedAOI} />
      </div>
      {selectedAOI && (
        <div style={{ padding: '15px', background: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#333' }}>
            <strong>Selected:</strong> {selectedAOI.minLat.toFixed(3)}, {selectedAOI.minLon.toFixed(3)} → {selectedAOI.maxLat.toFixed(3)}, {selectedAOI.maxLon.toFixed(3)}
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
            }}
          >
            View in AR 🚀
          </a>
        </div>
      )}
    </main>
  )
}
