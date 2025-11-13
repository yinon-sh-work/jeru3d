import Link from 'next/link'

export default function Page(){
  return (
    <main style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column'}}>
      <h1>Jeru3D - Jerusalem 3D AR Viewer</h1>
      <Link href="/ar" style={{padding:'10px 20px',backgroundColor:'#007bff',color:'white',textDecoration:'none',borderRadius:'5px',marginTop:'20px'}}>
        Open AR View
      </Link>
    </main>
  )
}
