'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LayerItem } from '@/components/layer-editor'

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
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: '#f5f5f5' }}>
        <div style={{ padding: '12px 16px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#333' }}>Jeru3D</h1>
            <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '11px' }}>הפוך שטח למודל תלת-מימד</p>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MapSelector onSelectAOI={setSelectedAOI} selectedAOI={selectedAOI} onLayersChange={handleLayersChange} />
        </div>
        {selectedAOI && (
          <div style={{ padding: '12px 16px', background: '#fff', boxShadow: '0 -1px 3px rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#333', fontSize: 12 }}>
              <strong>✓ נבחר:</strong> {selectedAOI.minLat.toFixed(4)}°–{selectedAOI.maxLat.toFixed(4)}°N, {selectedAOI.minLon.toFixed(4)}°–{selectedAOI.maxLon.toFixed(4)}°E
              {layers.length > 0 && <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>+ {layers.length} שכבות</div>}
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
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.background = '#218838' }}
              onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.background = '#28a745' }}
            >
              👁️ צפה ב‑AR
            </a>
          </div>
        )}
      </main>
  )
}
