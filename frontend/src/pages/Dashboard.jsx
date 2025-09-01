import React from 'react'
import axios from 'axios'

export default function Dashboard(){
  const [msg, setMsg] = React.useState('')
  React.useEffect(()=>{
    axios.get('http://localhost:8000/health').then(r=>setMsg('API OK'))
  },[])

  return (
    <div>
      <h2>Live Dashboard</h2>
      <p>{msg}</p>
      <p>Placeholders: sensor cards, map, visualization selector will go here.</p>
    </div>
  )
}