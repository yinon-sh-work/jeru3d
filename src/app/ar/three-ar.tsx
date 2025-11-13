"use client"
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import * as THREE from 'three'
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-expect-error
import { ARButton } from 'three/addons/webxr/ARButton.js'
import { metersPerDegree } from '@/lib/tile'

type AOI = { minLon:number, minLat:number, maxLon:number, maxLat:number }

export default function ARView(){
  const container = useRef<HTMLDivElement|null>(null)
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY as string
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(!apiKey ? '⚠️ MapTiler API key not configured' : '')
  const [aoi, setAOI] = useState<AOI | null>(null)

  // Parse AOI from URL params
  useEffect(() => {
    const minLon = parseFloat(searchParams.get('minLon') || '')
    const minLat = parseFloat(searchParams.get('minLat') || '')
    const maxLon = parseFloat(searchParams.get('maxLon') || '')
    const maxLat = parseFloat(searchParams.get('maxLat') || '')

    if (!isNaN(minLon) && !isNaN(minLat) && !isNaN(maxLon) && !isNaN(maxLat)) {
      setAOI({ minLon, minLat, maxLon, maxLat })
    }
  }, [searchParams])

  useEffect(()=>{
    if (!container.current) return
    if (!apiKey) {
      container.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:20px;color:#f00;">MapTiler API key is required. Add NEXT_PUBLIC_MAPTILER_KEY to your .env.local</div>'
      return
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 200)
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.xr.enabled = true
    container.current.appendChild(renderer.domElement)

    const btn = ARButton.createButton(renderer, { requiredFeatures:['hit-test'] })
    container.current.appendChild(btn)

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

    function onSessionStart(){
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

    const onResize = ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }
    window.addEventListener('resize', onResize)

    const containerRef = container.current
    return ()=>{ window.removeEventListener('resize', onResize); renderer.setAnimationLoop(null); renderer.dispose(); containerRef?.replaceChildren() }
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
