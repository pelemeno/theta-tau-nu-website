import React, { useEffect, useState } from 'react'

export default function Admin(){
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)

  useEffect(()=>{ fetchApps() },[])
  const [openInline, setOpenInline] = useState(() => { try { return localStorage.getItem('admin_open_inline') === 'true' } catch(e){ return false } });

  useEffect(()=>{ try{ localStorage.setItem('admin_open_inline', openInline) }catch(e){} },[openInline])
  async function fetchApps(){
    try {
      const res = await fetch('/api/admin/applications');
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setRows(j);
    } catch (e){ setErr(e.message || String(e)) }
  }

  async function getResume(id, inline=false){
    try {
      const q = inline ? '?disposition=inline' : '?disposition=attachment'
      const res = await fetch(`/api/admin/application/${id}/resume${q}`);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      window.open(j.url, '_blank');
    } catch (e){ alert('Error: '+(e.message||e)) }
  }

  return (
    <section>
      <h2>Admin</h2>
      <div style={{margin:'12px 0'}}>
        <label style={{fontWeight:500}}><input type="checkbox" checked={openInline} onChange={e=>setOpenInline(e.target.checked)} /> Open resumes inline (view in browser)</label>
      </div>
      {err && <pre style={{color:'red'}}>{err}</pre>}
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Resume</th><th>Submitted</th></tr></thead>
        <tbody>
          {rows.map(r=> (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.email}</td>
              <td>
                {r.resume_path && <>
                  <button onClick={()=>getResume(r.id,false)}>Download</button>
                  <button onClick={()=>getResume(r.id,openInline)} style={{marginLeft:8}}>View</button>
                </>}
              </td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
