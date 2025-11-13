import { Suspense } from 'react'
import ARView from './three-ar'

export const metadata = {
  title: 'Jeru3D - AR View'
}

export default function ARPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <ARView />
    </Suspense>
  )
}
