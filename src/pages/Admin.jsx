import React, { useEffect, useState } from 'react'

export default function Admin(){
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ fetchApps() },[])
  const [openInline, setOpenInline] = useState(() => { try { return localStorage.getItem('admin_open_inline') === 'true' } catch(e){ return false } });

  useEffect(()=>{ try{ localStorage.setItem('admin_open_inline', openInline) }catch(e){} },[openInline])
  async function fetchApps(){
    try {
      const res = await fetch('/api/admin/applications');
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setRows(j);
    } catch (e){ setErr(e.message || String(e)) } finally { setLoading(false) }
  }

  async function getResume(id){
    // Open a blank window synchronously to avoid popup blocking, then navigate it when URL available
    const win = window.open('', '_blank');
    if (!win) {
      alert('Popup blocked. Please allow popups for this site.');
      return;
    }
    try {
      const q = openInline ? '?disposition=inline' : '?disposition=attachment'
      const res = await fetch(`/api/admin/application/${id}/resume${q}`);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      win.location.href = j.url;
    } catch (e){
      try { win.close(); } catch(_) {}
      alert('Error: '+(e.message||e))
    }
  }

  return (
    <main className="admin-container">
      <h1>Rush Applications (Admin)</h1>
      <p>Use your browser's basic auth prompt to login.</p>
      <div style={{margin:'12px 0'}}>
        <label style={{fontWeight:500}}><input type="checkbox" checked={openInline} onChange={e=>setOpenInline(e.target.checked)} /> Open resumes inline (view in browser)</label>
      </div>
      {err && <pre style={{color:'red'}}>{err}</pre>}
      <div id="list">
        {loading && 'Loading…'}
        {!loading && rows.length === 0 && <p>No applications yet.</p>}
        {!loading && rows.length > 0 && (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['ID','Name','Email','Year','Major','GPA','LinkedIn','Why','Referral','Resume','Submitted'].map(h=> (
                  <th key={h} style={{borderBottom:'1px solid #ddd', padding:8, textAlign:'left'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id}>
                  <td style={{padding:8}}>{r.id}</td>
                  <td style={{padding:8}}>{r.name}</td>
                  <td style={{padding:8}}>{r.email}</td>
                  <td style={{padding:8}}>{r.year}</td>
                  <td style={{padding:8}}>{r.major}</td>
                  <td style={{padding:8}}>{r.gpa}</td>
                  <td style={{padding:8}}>{r.linkedin ? <a href={r.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> : ''}</td>
                  <td style={{padding:8}}>{r.why}</td>
                  <td style={{padding:8}}>{r.referral}</td>
                  <td style={{padding:8}}>{r.resume_path ? <button onClick={()=>getResume(r.id)}>Get Resume</button> : ''}</td>
                  <td style={{padding:8}}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
