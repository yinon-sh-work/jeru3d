'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LayerItem } from '@/components/layer-editor'
import DeviceFrame from '@/components/device-frame'

const MapSelector = dynamic(() => import('@/components/map-selector'), { ssr: false })

export default function Page() {
  const [selectedAOI, setSelectedAOI] = useState<{ minLon: number; minLat: number; maxLon: number; maxLat: number } | null>(null)
  const [layers, setLayers] = useState<LayerItem[]>([])

  const handleLayersChange = (newLayers: LayerItem[]) => {
    setLayers(newLayers)
    // Store layers in sessionStorage so AR view can access them
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jeru3d_layers', JSON.stringify(newLayers))
    }
  }

  const generateARLink = () => {
    if (!selectedAOI) return '#'
    const link = `/ar?minLon=${selectedAOI.minLon}&minLat=${selectedAOI.minLat}&maxLon=${selectedAOI.maxLon}&maxLat=${selectedAOI.maxLat}`
    if (layers.length > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem('jeru3d_layers', JSON.stringify(layers))
    }
    return link
  }

  return (
    <DeviceFrame>
      <main style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#f5f5f5' }}>
        <div style={{ padding: '16px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.06)' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>🌍 Jeru3D - תצוגת AR</h1>
          <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>
            בחר אזור במפה (גרור כדי לצייר או לחץ על כפתור מהיר), ואז צפה בו ב‑AR
          </p>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MapSelector onSelectAOI={setSelectedAOI} selectedAOI={selectedAOI} onLayersChange={handleLayersChange} />
        </div>
        {selectedAOI && (
          <div style={{ padding: '12px', background: '#fff', boxShadow: '0 -2px 4px rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: '#333', fontSize: 12 }}>
              <strong>✓ נבחר:</strong> {selectedAOI.minLat.toFixed(4)}°–{selectedAOI.maxLat.toFixed(4)}°N
              <br />{selectedAOI.minLon.toFixed(4)}°–{selectedAOI.maxLon.toFixed(4)}°E
              {layers.length > 0 && <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>+ {layers.length} נקודות בשכבות</div>}
            </div>
            <a
              href={generateARLink()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontSize: 13,
              }}
              onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.background = '#218838' }}
              onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.background = '#28a745' }}
            >
              👁️ צפה ב‑AR
            </a>
          </div>
        )}
      </main>
    </DeviceFrame>
  )
}
