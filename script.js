console.log('script.js loaded');

// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// Backend-only rush form handler (POSTs multipart/form-data to /api/applications)
const BACKEND_URL = '/api/applications';
const rushForm = document.getElementById('rushForm');
const formMessage = document.getElementById('formMessage');

function setMessage(msg, isError = false) {
  if (!formMessage) return;
  formMessage.textContent = msg;
  formMessage.style.color = isError ? '#D62828' : '#0a7f3c';
}

if (rushForm) {
  rushForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const data = new FormData(form);
    try {
      setMessage('Submitting...');
      const resp = await fetch(BACKEND_URL, { method: 'POST', body: data });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || JSON.stringify(json));
      setMessage('Application submitted — thank you!');
      form.reset();
    } catch (err) {
      console.error(err);
      setMessage('Submission failed: ' + (err.message || String(err)), true);
    }
  });
}