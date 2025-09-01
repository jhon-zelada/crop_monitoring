import React from 'react'
import Dashboard from './pages/Dashboard'
import Images from './pages/Images'

export default function App(){
  const [view, setView] = React.useState('dashboard')
  return (
    <div style={{display:'flex',height:'100vh'}}>
      <nav style={{width:220, background:'#0f172a', color:'#fff', padding:16}}>
        <h3>Crop Monitor</h3>
        <ul>
          <li onClick={()=>setView('dashboard')}>Dashboard</li>
          <li onClick={()=>setView('images')}>Images</li>
        </ul>
      </nav>
      <main style={{flex:1, padding:20}}>
        {view==='dashboard' && <Dashboard />}
        {view==='images' && <Images />}
      </main>
    </div>
  )
}