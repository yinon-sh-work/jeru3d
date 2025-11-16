'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'

export interface LayerItem {
  id: string
  layerName: string
  symbolType: 'x-box' | 'triangle' | 'diagonal-hatch'
  lat: number
  lon: number
}

interface LayerEditorProps {
  onLayersChange: (layers: LayerItem[]) => void
}

export interface LayerEditorHandle {
  handleAddPoint: (lat: number, lon: number) => void
}

const LAYER_COLORS = [
  { name: 'Black', hex: '#000000', key: 'black' },
  { name: 'Red', hex: '#ff0000', key: 'red' },
  { name: 'Blue', hex: '#0000ff', key: 'blue' },
  { name: 'Magenta', hex: '#ff00ff', key: 'magenta' },
  { name: 'Green', hex: '#00aa00', key: 'green' },
]

const SYMBOL_TYPES = ['x-box', 'triangle', 'diagonal-hatch'] as const

const LayerEditor = forwardRef<LayerEditorHandle, LayerEditorProps>(
  ({ onLayersChange }, ref) => {
    const [layers, setLayers] = useState<LayerItem[]>([])
    const [selectedLayer, setSelectedLayer] = useState<string>('black')
    const [selectedSymbol, setSelectedSymbol] = useState<'x-box' | 'triangle' | 'diagonal-hatch'>('x-box')
    const [placingMode, setPlacingMode] = useState(false)
    const [open, setOpen] = useState(false)

    const handleDeletePoint = (id: string) => {
      const updatedLayers = layers.filter(l => l.id !== id)
      setLayers(updatedLayers)
      onLayersChange(updatedLayers)
    }

    useImperativeHandle(ref, () => ({
      handleAddPoint: (lat: number, lon: number) => {
        if (!placingMode) return

        const newItem: LayerItem = {
          id: `${Date.now()}-${Math.random()}`,
          layerName: selectedLayer,
          symbolType: selectedSymbol,
          lat,
          lon,
        }

        const updatedLayers = [...layers, newItem]
        setLayers(updatedLayers)
        onLayersChange(updatedLayers)
        setPlacingMode(false)
      }
    }), [placingMode, selectedLayer, selectedSymbol, layers, onLayersChange])

    const layerCounts = LAYER_COLORS.map(
      c => layers.filter(l => l.layerName === c.key).length
    )

  return (
    <>
      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="שכבות"
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            zIndex: 30,
            width: 52,
            height: 52,
            borderRadius: 26,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
            boxShadow: '0 6px 18px rgba(16,24,40,0.18)',
            border: '1px solid rgba(0,0,0,0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🗂
        </button>
      )}

      {/* Slide-over panel */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          width: 320,
          maxHeight: '70vh',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 12px 40px rgba(16,24,40,0.22)',
          borderRadius: 12,
          zIndex: 35,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: 10, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Layer Editor</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>
          </div>

          <div style={{ padding: 12, overflow: 'auto' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#666' }}>בחר שכבה</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {LAYER_COLORS.map((color, idx) => (
                  <button
                    key={color.key}
                    onClick={() => setSelectedLayer(color.key)}
                    style={{
                      padding: 8,
                      background: selectedLayer === color.key ? color.hex : '#f0f0f0',
                      borderRadius: 6,
                      color: selectedLayer === color.key ? '#fff' : '#333',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {color.name} ({layerCounts[idx]})
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#666' }}>Symbol</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SYMBOL_TYPES.map(symbol => (
                  <button key={symbol} onClick={() => setSelectedSymbol(symbol)} style={{ padding: 8, background: selectedSymbol === symbol ? '#007bff' : '#f0f0f0', color: selectedSymbol === symbol ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{symbol.replace('-', ' ')}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setPlacingMode(!placingMode)} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: placingMode ? '#28a745' : '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{placingMode ? '✓ Placing Mode ON - Click map' : '+ Add Point'}</button>

            <div style={{ marginTop: 12 }}>
              {layers.length === 0 ? (
                <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '18px 8px' }}>No points added yet</div>
              ) : (
                <div>
                  {LAYER_COLORS.map(color => {
                    const layerItems = layers.filter(l => l.layerName === color.key)
                    if (layerItems.length === 0) return null

                    return (
                      <div key={color.key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: '700', color: color.hex, marginBottom: 6 }}>{color.name}</div>
                        {layerItems.map(item => (
                          <div key={item.id} style={{ fontSize: 11, padding: 6, background: '#fff', borderLeft: `3px solid ${color.hex}`, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{item.symbolType} @ {item.lat.toFixed(3)}°, {item.lon.toFixed(3)}°</span>
                            <button onClick={() => handleDeletePoint(item.id)} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={() => { const json = JSON.stringify(layers); console.log('Export Layers:', json); alert('Layers exported to console') }} style={{ width: '100%', padding: 8, borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', cursor: 'pointer' }}>📋 Export Layers JSON</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
)

LayerEditor.displayName = 'LayerEditor'

export default LayerEditor
