'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import LayerEditor, { LayerItem, LayerEditorHandle } from './layer-editor'

interface MapSelectorProps {
  onSelectAOI: (aoi: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null) => void
  selectedAOI: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null
}

const PRESET_AREAS = [
  { name: 'Old City', minLon: 35.2281, minLat: 31.7761, maxLon: 35.2387, maxLat: 31.7841 },
  { name: 'Mount Scopus', minLon: 35.2406, minLat: 31.7753, maxLon: 35.2563, maxLat: 31.7879 },
  { name: 'City Center', minLon: 35.1890, minLat: 31.7650, maxLon: 35.2200, maxLat: 31.8000 },
  { name: 'Temple Mount', minLon: 35.2346, minLat: 31.7738, maxLon: 35.2371, maxLat: 31.7759 },
]

export default function MapSelector({ onSelectAOI, selectedAOI }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const layerEditorRef = useRef<LayerEditorHandle>(null)
  const [drawing, setDrawing] = useState(false)
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [layers, setLayers] = useState<LayerItem[]>([])
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || ''

  const handleLayersChange = (newLayers: LayerItem[]) => {
    setLayers(newLayers)
    // Update points on map
    updateLayerPointsOnMap(newLayers)
  }

  const updateLayerPointsOnMap = (layerList: LayerItem[]) => {
    if (!map.current) return

    const features: Record<string, unknown>[] = []
    const colorMap: Record<string, string> = {
      black: '#000000',
      red: '#FF0000',
      blue: '#0000FF',
      magenta: '#FF00FF',
      green: '#00AA00',
    }

    layerList.forEach(layer => {
      features.push({
        type: 'Feature',
        properties: {
          layerId: layer.id,
          layerName: layer.layerName,
          layerColor: colorMap[layer.layerName] || '#000',
          symbolType: layer.symbolType,
        },
        geometry: {
          type: 'Point',
          coordinates: [layer.lon, layer.lat],
        },
      })
    })

    const source = map.current.getSource('layer-points') as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features,
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      } as any)
    }
  }

  useEffect(() => {
    if (!mapContainer.current || !apiKey) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${apiKey}`,
      center: [35.2, 31.77], // Jerusalem center
      zoom: 12,
    })

    map.current.on('load', () => {
      // Add selection layer (initially empty)
      map.current?.addSource('selection', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.current?.addLayer({
        id: 'selection-fill',
        type: 'fill',
        source: 'selection',
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.3,
        },
      })

      map.current?.addLayer({
        id: 'selection-outline',
        type: 'line',
        source: 'selection',
        paint: {
          'line-color': '#088',
          'line-width': 2,
        },
      })

      // Add layer points source
      map.current?.addSource('layer-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Add circle layer for points
      map.current?.addLayer({
        id: 'layer-points-circle',
        type: 'circle',
        source: 'layer-points',
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'layerColor'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      // Add symbol labels
      map.current?.addLayer({
        id: 'layer-points-label',
        type: 'symbol',
        source: 'layer-points',
        layout: {
          'text-field': ['get', 'symbolType'],
          'text-size': 12,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#fff',
        },
      })
    })

    // Mouse down: start drawing or add point
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    map.current?.on('mousedown', (e: any) => {
      if (e.originalEvent?.button !== 0) return // Left click only
      setDrawing(true)
      setStartCoords([e.lngLat.lng, e.lngLat.lat])
    })

    // Mouse move: update rectangle while drawing
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    map.current?.on('mousemove', (e: any) => {
      if (!drawing || !startCoords) return

      const endCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const minLon = Math.min(startCoords[0], endCoords[0])
      const maxLon = Math.max(startCoords[0], endCoords[0])
      const minLat = Math.min(startCoords[1], endCoords[1])
      const maxLat = Math.max(startCoords[1], endCoords[1])

      const rectangle = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [minLon, minLat],
                  [maxLon, minLat],
                  [maxLon, maxLat],
                  [minLon, maxLat],
                  [minLon, minLat],
                ],
              ],
            },
          },
        ],
      }

      if (map.current?.getSource('selection')) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        ;(map.current.getSource('selection') as unknown as maplibregl.GeoJSONSource).setData(rectangle as unknown as any)
      }
    })

    // Mouse up: finalize selection or add point
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    map.current?.on('mouseup', (e: any) => {
      if (!drawing || !startCoords) return
      setDrawing(false)

      const endCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const minLon = Math.min(startCoords[0], endCoords[0])
      const maxLon = Math.max(startCoords[0], endCoords[0])
      const minLat = Math.min(startCoords[1], endCoords[1])
      const maxLat = Math.max(startCoords[1], endCoords[1])

      // Check if this is a small click (point placement) vs drag (AOI selection)
      const isSmallClick = Math.abs(maxLon - minLon) < 0.0005 && Math.abs(maxLat - minLat) < 0.0005

      if (isSmallClick) {
        // Add point to layer editor
        if (layerEditorRef.current) {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          layerEditorRef.current.handleAddPoint(e.lngLat.lat, e.lngLat.lng)
        }
      } else {
        // Validate AOI (must be at least 0.01° x 0.01°)
        if (Math.abs(maxLon - minLon) < 0.01 || Math.abs(maxLat - minLat) < 0.01) {
          alert('Selection too small. Please select a larger area.')
          return
        }

        onSelectAOI({ minLon, minLat, maxLon, maxLat })
      }

      setStartCoords(null)
    })

    return () => {
      map.current?.remove()
    }
  }, [apiKey, drawing, startCoords, onSelectAOI])

  // Update map display when selectedAOI changes
  useEffect(() => {
    if (!map.current || !selectedAOI) return

    const rectangle = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [selectedAOI.minLon, selectedAOI.minLat],
                [selectedAOI.maxLon, selectedAOI.minLat],
                [selectedAOI.maxLon, selectedAOI.maxLat],
                [selectedAOI.minLon, selectedAOI.maxLat],
                [selectedAOI.minLon, selectedAOI.minLat],
              ],
            ],
          },
        },
      ],
    }

    if (map.current?.getSource('selection')) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      ;(map.current.getSource('selection') as unknown as maplibregl.GeoJSONSource).setData(rectangle as unknown as any)
    }

    // Fit map to selected AOI
    map.current?.fitBounds(
      [
        [selectedAOI.minLon, selectedAOI.minLat],
        [selectedAOI.maxLon, selectedAOI.maxLat],
      ],
      { padding: 40 }
    )
  }, [selectedAOI])

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        cursor: drawing ? 'crosshair' : 'grab',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: '#fff',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          zIndex: 20,
          maxWidth: '280px',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#333', fontWeight: 'bold' }}>
          📍 בחר אזור במהירות:
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {PRESET_AREAS.map(area => (
            <button
              key={area.name}
              onClick={() => onSelectAOI(area)}
              style={{
                padding: '8px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#0056b3'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#007bff'
              }}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#fff',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#666',
          boxShadow: '0 2px 4px rgba(0,0,0,.2)',
          zIndex: 10,
        }}
      >
        <div>🔍 גלול לזום</div>
        <div>📌 גרור כדי לבחור אזור</div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#999' }}>
          או לחץ על כפתור למעלה
        </div>
      </div>
      <LayerEditor ref={layerEditorRef} onLayersChange={handleLayersChange} />
    </div>
  )
}
