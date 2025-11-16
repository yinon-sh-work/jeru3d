"use client"
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import * as THREE from 'three'
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
declare global {
  interface Navigator {
    xr?: Record<string, unknown>
  }
}
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-expect-error
import { ARButton } from 'three/addons/webxr/ARButton.js'
import { metersPerDegree } from '@/lib/tile'
import type { LayerItem } from '@/components/layer-editor'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

type AOI = { minLon:number, minLat:number, maxLon:number, maxLat:number }

export default function ARView(){
  const container = useRef<HTMLDivElement|null>(null)
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY as string
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(!apiKey ? '⚠️ MapTiler API key not configured' : '')
  const [aoi, setAOI] = useState<AOI | null>(null)
  // Layers are loaded for potential future use; currently not used directly in this view

  // Parse AOI from URL params
  useEffect(() => {
    const minLon = parseFloat(searchParams.get('minLon') || '')
    const minLat = parseFloat(searchParams.get('minLat') || '')
    const maxLon = parseFloat(searchParams.get('maxLon') || '')
    const maxLat = parseFloat(searchParams.get('maxLat') || '')

    if (!isNaN(minLon) && !isNaN(minLat) && !isNaN(maxLon) && !isNaN(maxLat)) {
      setAOI({ minLon, minLat, maxLon, maxLat })
    }

    // Load layers from sessionStorage (kept for future rendering of markers in AR)
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('jeru3d_layers')
        if (stored) {
          // parse and keep for debugging or future use
          const _loaded = JSON.parse(stored) as LayerItem[]
          // reference variable to satisfy lint rules (kept for future use)
          void _loaded
        }
      } catch (e) {
        console.error('Failed to load layers from sessionStorage:', e)
      }
    }
  }, [searchParams])

  useEffect(()=>{
    if (!container.current) return
    // global client-side error listener to surface issues into the UI
    const onError = (ev: ErrorEvent) => {
      try {
        console.error('Client-side error in AR page:', ev.error || ev.message)
        setStatus('Application error: ' + (ev.error?.message || ev.message))
      } catch {
        // ignore
      }
    }
    window.addEventListener('error', onError)
    if (!apiKey) {
      container.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:20px;color:#f00;">MapTiler API key is required. Add NEXT_PUBLIC_MAPTILER_KEY to your .env.local</div>'
      return () => { window.removeEventListener('error', onError) }
    }
    // Wrap initialization in try/catch so any synchronous error surfaces to the status
    try {
      const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 200)
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.xr.enabled = true
    container.current.appendChild(renderer.domElement)

      let btn: HTMLElement | null = null

      // Check for WebXR support and create button
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const xr = (navigator as any).xr as Record<string, unknown> | undefined
        if (xr) {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (xr as any).isSessionSupported('immersive-ar').then((supported: boolean) => {
          if (supported) {
            try {
              btn = ARButton.createButton(renderer, { requiredFeatures:['hit-test'] })
              if (btn && container.current && !container.current.querySelector('button')) {
                container.current.appendChild(btn)
              }
            } catch (e) {
              console.error('Failed to create AR button:', e)
              setStatus('⚠️ AR mode not available on this device')
            }
          } else {
            setStatus('⚠️ AR not supported on this device. Using standard 3D view.')
          }
        }).catch(err => {
          console.error('WebXR check failed:', err)
          setStatus('⚠️ AR not available. Using standard 3D view.')
        })
      } else {
        setStatus('⚠️ WebXR not supported on this device. Using standard 3D view.')
      }

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.0)
    scene.add(light)

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({ color: 0x00ff7f })
    )
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    const placed: THREE.Object3D[] = []
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let hitTestSource: any = null
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let localSpace: any = null

    const onSessionStart = () => {
      const session = renderer.xr.getSession()!
      session.requestReferenceSpace('viewer').then(space => {
        session.requestHitTestSource({ space }).then(source => { hitTestSource = source })
      })
      renderer.xr.setReferenceSpaceType('local')
      session.requestReferenceSpace('local').then(space=>{ localSpace = space })
      session.addEventListener('end', ()=>{ hitTestSource=null; localSpace=null })
    }
    renderer.xr.addEventListener('sessionstart', onSessionStart)

    // Build mesh from Terrain-RGB via Worker, then place on select
    const controller = renderer.xr.getController(0)
    controller.addEventListener('select', async ()=>{
      if (!reticle.visible || busy || !aoi) return
      try {
        setBusy(true); setStatus('Downloading terrain...')
        const mesh = await buildTerrainMeshFromTiles(apiKey, aoi, 12, 14)
        mesh.rotation.x = -Math.PI/2
        mesh.position.setFromMatrixPosition(reticle.matrix)
        scene.add(mesh); placed.push(mesh)
        setStatus('✓ Terrain loaded!')
        setTimeout(() => setStatus(''), 2000)
      } catch (e) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const err = e as any
        setStatus(err?.message || String(e))
      } finally { setBusy(false) }
    })
    scene.add(controller)
    // For non-AR devices we'll provide a 3D viewer fallback via an explicit button
    const show3DViewer = () => {
      if (!aoi) { setStatus('בחר אזור קודם, ואז פתח תצוגת 3D'); return }
      setStatus('Loading 3D view...')
      setBusy(true)
      buildTerrainMeshFromTiles(apiKey, aoi, 12, 14).then(mesh => {
        mesh.rotation.x = -Math.PI/2
        mesh.position.set(0, 0, 0)

        // create a simple overlay container for the 3D viewer
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.left = '0'
        overlay.style.top = '0'
        overlay.style.width = '100vw'
        overlay.style.height = '100vh'
        overlay.style.zIndex = '99999'
        overlay.style.background = '#111'
        document.body.appendChild(overlay)

        // viewer renderer
        const viewer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
        viewer.setSize(window.innerWidth, window.innerHeight)
        overlay.appendChild(viewer.domElement)

        const vScene = new THREE.Scene()
        const vCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000)
        vScene.add(new THREE.AmbientLight(0xffffff, 0.9))
        const sunlight = new THREE.DirectionalLight(0xffffff, 0.6)
        sunlight.position.set(1, 2, 3)
        vScene.add(sunlight)

        vScene.add(mesh)

        // center camera based on mesh bbox
        const bbox = new THREE.Box3().setFromObject(mesh)
        const size = bbox.getSize(new THREE.Vector3())
        const center = bbox.getCenter(new THREE.Vector3())
        vCamera.position.set(center.x, center.y + Math.max(size.x, size.z) * 0.8, center.z + Math.max(size.x, size.z) * 0.8)
        vCamera.lookAt(center)

        const controls = new OrbitControls(vCamera, viewer.domElement)
        controls.target.copy(center)
        controls.update()

        // add export button
        const btnExport = document.createElement('button')
        btnExport.textContent = 'Download GLB'
        btnExport.style.position = 'absolute'
        btnExport.style.right = '12px'
        btnExport.style.top = '12px'
        btnExport.style.zIndex = '100000'
        btnExport.style.padding = '8px 12px'
        btnExport.style.background = '#28a745'
        btnExport.style.color = '#fff'
        btnExport.style.border = 'none'
        btnExport.style.borderRadius = '6px'
        overlay.appendChild(btnExport)

        btnExport.onclick = () => {
          try {
            const exporter = new GLTFExporter()
            exporter.parse(mesh, (result) => {
              let blob: Blob
              if (result instanceof ArrayBuffer) {
                blob = new Blob([result], { type: 'model/gltf-binary' })
              } else {
                const json = JSON.stringify(result)
                blob = new Blob([json], { type: 'application/json' })
              }
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'terrain.glb'
              a.click()
            }, { binary: true })
          } catch (unknownErr) {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const err = unknownErr as any
            console.error('Export failed', err)
            alert('Export failed: ' + String(err))
          }
        }

        const btnClose = document.createElement('button')
        btnClose.textContent = 'Close'
        btnClose.style.position = 'absolute'
        btnClose.style.left = '12px'
        btnClose.style.top = '12px'
        btnClose.style.zIndex = '100000'
        btnClose.style.padding = '8px 12px'
        btnClose.style.background = '#444'
        btnClose.style.color = '#fff'
        btnClose.style.border = 'none'
        btnClose.style.borderRadius = '6px'
        overlay.appendChild(btnClose)
        btnClose.onclick = () => { window.removeEventListener('resize', onViewerResize); viewer.dispose(); document.body.removeChild(overlay); setStatus(''); }

        const onViewerResize = () => { vCamera.aspect = window.innerWidth / window.innerHeight; vCamera.updateProjectionMatrix(); viewer.setSize(window.innerWidth, window.innerHeight) }
        window.addEventListener('resize', onViewerResize)

        const animateViewer = () => { viewer.render(vScene, vCamera); requestAnimationFrame(animateViewer) }
        animateViewer()

        setStatus('✓ 3D view ready')
        setBusy(false)
      }).catch((unknownErr) => {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const err = unknownErr as any
        setStatus('Error loading terrain: ' + (err?.message || String(err)))
        setBusy(false)
      })
    }

    renderer.setAnimationLoop((time, frame)=>{
      if (frame && hitTestSource && localSpace){
        const results = frame.getHitTestResults(hitTestSource)
        if (results.length){
          const pose = results[0].getPose(localSpace)
          if (pose){ reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix) }
        } else { reticle.visible = false }
      }
      renderer.render(scene, camera)
    })

    // If AR is not supported, add an on-screen button for the 3D viewer fallback
    const add3DFallbackButton = () => {
      if (!container.current) return
      // avoid duplicate
      if (container.current.querySelector('.jeru3d-3d-btn')) return
      const fallbackBtn = document.createElement('button')
      fallbackBtn.className = 'jeru3d-3d-btn'
      fallbackBtn.textContent = 'פתח תצוגת 3D'
      fallbackBtn.style.position = 'absolute'
      fallbackBtn.style.right = '12px'
      fallbackBtn.style.bottom = '12px'
      fallbackBtn.style.zIndex = '9999'
      fallbackBtn.style.padding = '10px 14px'
      fallbackBtn.style.background = '#007bff'
      fallbackBtn.style.color = '#fff'
      fallbackBtn.style.border = 'none'
      fallbackBtn.style.borderRadius = '8px'
      fallbackBtn.onclick = (ev) => { ev.preventDefault(); show3DViewer() }
      container.current.appendChild(fallbackBtn)
    }

    // attach fallback button if no AR button was created after XR check
    setTimeout(() => {
      if (!container.current) return
      const hasAR = !!container.current.querySelector('button[title="Enter AR"]') || !!container.current.querySelector('button[aria-label*="AR"]')
      if (!hasAR) add3DFallbackButton()
    }, 1200)

      const onResize = ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }
      window.addEventListener('resize', onResize)

      const containerRef = container.current
      return ()=>{
        window.removeEventListener('resize', onResize)
        window.removeEventListener('error', onError)
        renderer.setAnimationLoop(null)
        renderer.dispose()
        containerRef?.replaceChildren()
      }
    } catch (err) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const e = err as any
      console.error('AR init error:', e)
      setStatus('Application error: ' + (e?.message || String(e)))
      window.removeEventListener('error', onError)
      return () => { /* nothing to cleanup */ }
    }
  }, [apiKey, busy, aoi])

  return <div ref={container} style={{width:'100vw', height:'100vh', background:'transparent'}}>
    <div style={{position:'absolute',top:12,left:12,background:'rgba(0,0,0,.6)',color:'#fff',padding:8,borderRadius:8,zIndex:20}}>
      <div>🌍 Jerusalem AR Terrain Viewer</div>
      {aoi ? (
        <div style={{marginTop:6,fontSize:12}}>
          Region: {aoi.minLat.toFixed(3)}° - {aoi.maxLat.toFixed(3)}°N, {aoi.minLon.toFixed(3)}° - {aoi.maxLon.toFixed(3)}°E
        </div>
      ) : (
        <div style={{marginTop:6,fontSize:12,color:'#faa'}}>No region selected</div>
      )}
    </div>
    {status && <div style={{position:'absolute',left:12,bottom:60, background:'rgba(0,0,0,.6)',color:'#fff',padding:8,borderRadius:8,zIndex:20}}>{status}</div>}
  </div>
}

async function buildTerrainMeshFromTiles(apiKey:string, aoi:AOI, zDem:number, zTex:number){
  return new Promise<THREE.Mesh>( (resolve, reject) => {
    const worker = new Worker('/workers/terrain-worker.js')
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    worker.onmessage = (ev: any) => {
      const { error, width, height, heights, textureBitmap } = ev.data || {}
      if (error){ reject(new Error(error)); worker.terminate(); return }
      try{
        const geom = new THREE.PlaneGeometry(1,1, width-1, height-1)
        // Set vertex positions (y = elevation meters; we'll scale later)
        const pos = geom.attributes.position as THREE.BufferAttribute
        const arr = pos.array as Float32Array
        // plane spans 1x1 initially. We'll set y as heights and scale X/Z after.
        for(let y=0; y<height; y++){
          for(let x=0; x<width; x++){
            const i = (y*width + x)
            const vi = i*3
            arr[vi+2] = (y/(height-1)) - 0.5 // z in [-0.5,0.5]
            arr[vi+0] = (x/(width-1)) - 0.5 // x
            arr[vi+1] = heights[i] // y = elevation meters
          }
        }
        pos.needsUpdate = true
        geom.computeVertexNormals()
        // Texture
                const tex = new THREE.CanvasTexture(textureBitmap as CanvasImageSource)
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
        const mat = new THREE.MeshStandardMaterial({ map: tex, wireframe: false })
        const mesh = new THREE.Mesh(geom, mat)
        // קנה מידה לשטח מטרי מקורב לפי מרכז AOI
        const midLat = (aoi.minLat+aoi.maxLat)/2
        const { mPerDegLat, mPerDegLon } = metersPerDegree(midLat)
        const dxDeg = (aoi.maxLon - aoi.minLon)
        const dyDeg = (aoi.maxLat - aoi.minLat)
        const sizeX = dxDeg * mPerDegLon
        const sizeY = dyDeg * mPerDegLat
        mesh.scale.set(sizeX, 1.0, sizeY) // X=מטרים מזרח-מערב, Y=גובה, Z=צפון-דרום
        return resolve(mesh)
      }catch(err){ reject(err) }
      finally{ worker.terminate() }
    }
    worker.postMessage({ apiKey, aoi, zDem, zTex, step: 2 })
  })
}
