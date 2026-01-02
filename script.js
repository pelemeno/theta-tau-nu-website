console.log('script.js loaded');

// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth"
      });
    }
  });
});

// Submit handler for the rush form: posts FormData to the Apps Script web app
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  const form = document.querySelector('.rush-form');
  console.log('Form found:', form);
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyWvYAt8xPANFZmF0k3g435GRRU7hSTtJM3rYAkJLXOuOWKIvytweIljpfE9YafwoJV/exec';
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    console.log('Form submit event fired');
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);
    console.log('FormData created, fields:', Array.from(formData.entries()));

    try {
      console.log('Fetching to:', WEB_APP_URL);
      const resp = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        // Apps Script web apps support CORS for deployed web apps
      });
      console.log('Response received, status:', resp.status);

      // Attempt to parse JSON response; Apps Script returns JSON text.
      let json = {};
      try { json = await resp.json(); console.log('Parsed JSON:', json); } catch (err) { console.log('Failed to parse JSON:', err); /* ignore parse errors */ }

      if (resp.ok && (json.status === 'success' || json.success === true || resp.status === 200)) {
        console.log('Success, resetting form');
        alert('Application submitted — thank you!');
        form.reset();
      } else {
        const msg = json.message || json.error || 'Submission failed';
        console.log('Submission failed:', msg);
        throw new Error(msg);
      }
    } catch (err) {
      console.error('Form submit error', err);
      alert('Error submitting form: ' + (err.message || err));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
});
