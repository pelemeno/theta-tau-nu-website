import React, { useState } from 'react'

export default function Rush(){
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true); setMsg(null);
    const fd = new FormData(e.target);
    try {
      const res = await fetch('/api/applications', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j && j.error ? j.error : 'Failed')
      setMsg('Submitted — thank you');
      e.target.reset();
    } catch (err){
      setMsg('Error: ' + (err.message || err));
    } finally { setLoading(false) }
  }

  return (
    <section className="rush-page">
      <h1 className="main-title">Rush Theta Tau</h1>
      <form id="rushForm" className="rush-form" onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="year">Year</label>
          <select id="year" name="year" required>
            <option value="">Select Year</option>
            <option value="Freshman">Freshman</option>
            <option value="Sophomore">Sophomore</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="major">Major</label>
          <input type="text" id="major" name="major" required />
        </div>
        <div className="form-group">
          <label htmlFor="gpa">GPA</label>
          <input type="number" id="gpa" name="gpa" min="0" max="4" step="0.01" placeholder="e.g. 3.75" required />
        </div>
        <div className="form-group">
          <label htmlFor="resume">Upload Resume (PDF)</label>
          <input type="file" id="resume" name="resume" accept=".pdf" />
        </div>
        <div className="form-group">
          <label htmlFor="linkedin">LinkedIn Profile</label>
          <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/yourprofile" />
        </div>
        <div className="form-group">
          <label htmlFor="why">Why do you want to join Theta Tau?</label>
          <textarea id="why" name="why" rows="4"></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="referral">How did you hear about us?</label>
          <input type="text" id="referral" name="referral" />
        </div>
        <div id="formMessage" aria-live="polite" style={{minHeight:'1.2rem'}}>{msg}</div>
        <button type="submit" className="rush-btn" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
      </form>
    </section>
  )
}
