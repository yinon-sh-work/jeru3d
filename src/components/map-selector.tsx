'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapSelectorProps {
  onSelectAOI: (aoi: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null) => void
  selectedAOI: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null
}

export default function MapSelector({ onSelectAOI, selectedAOI }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || ''

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
    })

    // Mouse down: start drawing
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

    // Mouse up: finalize selection
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    map.current?.on('mouseup', (e: any) => {
      if (!drawing || !startCoords) return
      setDrawing(false)

      const endCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const minLon = Math.min(startCoords[0], endCoords[0])
      const maxLon = Math.max(startCoords[0], endCoords[0])
      const minLat = Math.min(startCoords[1], endCoords[1])
      const maxLat = Math.max(startCoords[1], endCoords[1])

      // Validate AOI (must be at least 0.01° x 0.01°)
      if (Math.abs(maxLon - minLon) < 0.01 || Math.abs(maxLat - minLat) < 0.01) {
        alert('Selection too small. Please select a larger area.')
        return
      }

      onSelectAOI({ minLon, minLat, maxLon, maxLat })
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
        <div>Scroll to zoom</div>
        <div>Click & drag to select region</div>
      </div>
    </div>
  )
}
