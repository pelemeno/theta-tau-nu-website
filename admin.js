async function fetchApps() {
  const container = document.getElementById('list');
  try {
    const resp = await fetch('/api/admin/applications');
    if (!resp.ok) throw new Error(await resp.text());
    const rows = await resp.json();
    if (!rows.length) {
      container.innerHTML = '<p>No applications yet.</p>';
      return;
    }
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    const header = document.createElement('tr');
    ['ID','Name','Email','Year','Major','GPA','LinkedIn','Why','Referral','Resume','Submitted'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.borderBottom = '1px solid #ddd';
      th.style.padding = '8px';
      header.appendChild(th);
    });
    table.appendChild(header);
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const makeCell = (txt) => { const td = document.createElement('td'); td.textContent = txt || ''; td.style.padding='8px'; return td; };
      tr.appendChild(makeCell(r.id));
      tr.appendChild(makeCell(r.name));
      tr.appendChild(makeCell(r.email));
      tr.appendChild(makeCell(r.year));
      tr.appendChild(makeCell(r.major));
      tr.appendChild(makeCell(r.gpa));
      const li = document.createElement('td'); li.style.padding='8px'; if (r.linkedin) { const a = document.createElement('a'); a.href = r.linkedin; a.target='_blank'; a.textContent='LinkedIn'; li.appendChild(a);} tr.appendChild(li);
      tr.appendChild(makeCell(r.why));
      tr.appendChild(makeCell(r.referral));
      const resumeTd = document.createElement('td'); resumeTd.style.padding='8px';
      if (r.resume_path) {
        const btn = document.createElement('button'); btn.textContent = 'Get Resume'; btn.onclick = async () => {
          btn.disabled = true; btn.textContent = 'Loading...';
          const res = await fetch(`/api/admin/application/${r.id}/resume`);
          if (!res.ok) { alert('Failed to get resume'); btn.disabled=false; btn.textContent='Get Resume'; return; }
          const j = await res.json();
          window.open(j.url, '_blank'); btn.disabled=false; btn.textContent='Get Resume';
        };
        resumeTd.appendChild(btn);
      }
      tr.appendChild(resumeTd);
      tr.appendChild(makeCell(new Date(r.created_at).toLocaleString()));
      table.appendChild(tr);
    });
    container.innerHTML = '';
    container.appendChild(table);
  } catch (err) {
    container.innerHTML = '<pre style="color:red">' + (err.message || String(err)) + '</pre>';
  }
}

fetchApps();
