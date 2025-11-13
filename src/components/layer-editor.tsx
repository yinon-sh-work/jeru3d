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

    const handleDeletePoint = (id: string) => {
      const updatedLayers = layers.filter(l => l.id !== id)
      setLayers(updatedLayers)
      onLayersChange(updatedLayers)
    }

    const handleAddPoint = (lat: number, lon: number) => {
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

    useImperativeHandle(ref, () => ({
      handleAddPoint,
    }), [handleAddPoint])

    const layerCounts = LAYER_COLORS.map(
      c => layers.filter(l => l.layerName === c.key).length
    )

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: '320px',
      maxHeight: '400px',
      background: '#fff',
      boxShadow: '0 -2px 8px rgba(0,0,0,.2)',
      borderRadius: '8px 8px 0 0',
      zIndex: 15,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Layer Editor</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Select Layer:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {LAYER_COLORS.map((color, idx) => (
              <button
                key={color.key}
                onClick={() => setSelectedLayer(color.key)}
                style={{
                  padding: '8px',
                  background: selectedLayer === color.key ? color.hex : '#f0f0f0',
                  border: `2px ${selectedLayer === color.key ? 'solid' : 'solid'} ${color.hex}`,
                  color: selectedLayer === color.key ? '#fff' : '#333',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: selectedLayer === color.key ? 'bold' : 'normal',
                }}
              >
                {color.name} ({layerCounts[idx]})
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Symbol Type:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {SYMBOL_TYPES.map(symbol => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                style={{
                  padding: '8px',
                  background: selectedSymbol === symbol ? '#007bff' : '#f0f0f0',
                  color: selectedSymbol === symbol ? '#fff' : '#333',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: selectedSymbol === symbol ? 'bold' : 'normal',
                }}
              >
                {symbol.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setPlacingMode(!placingMode)}
          style={{
            width: '100%',
            padding: '10px',
            background: placingMode ? '#28a745' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {placingMode ? '✓ Placing Mode ON - Click map' : '+ Add Point'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {layers.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '20px 10px' }}>
            No points added yet
          </div>
        ) : (
          <div>
            {LAYER_COLORS.map(color => {
              const layerItems = layers.filter(l => l.layerName === color.key)
              if (layerItems.length === 0) return null

              return (
                <div key={color.key} style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: color.hex,
                    marginBottom: '4px',
                  }}>
                    {color.name}
                  </div>
                  {layerItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        fontSize: '11px',
                        padding: '6px',
                        background: '#f9f9f9',
                        borderLeft: `3px solid ${color.hex}`,
                        marginBottom: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {item.symbolType} @ {item.lat.toFixed(3)}°, {item.lon.toFixed(3)}°
                      </span>
                      <button
                        onClick={() => handleDeletePoint(item.id)}
                        style={{
                          background: '#ff4444',
                          color: '#fff',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Export to pass to AR */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid #ddd',
        background: '#f5f5f5',
      }}>
        <button
          onClick={() => {
            const json = JSON.stringify(layers)
            console.log('Export Layers:', json)
            alert('Layers exported to console')
          }}
          style={{
            width: '100%',
            padding: '8px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          📋 Export Layers JSON
        </button>
      </div>
    </div>
  )
}
)

LayerEditor.displayName = 'LayerEditor'

export default LayerEditor
