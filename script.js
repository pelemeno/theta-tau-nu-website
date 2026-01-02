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
  const form = document.querySelector('.rush-form');
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw5t6rlp7oO5K1qpj3-P9wXLGChFKQanMoZk1F-xyt68pqPs39e9zEElUoAjK4moVl8/exec';
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);

    try {
      const resp = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        // Apps Script web apps support CORS for deployed web apps
      });

      // Attempt to parse JSON response; Apps Script returns JSON text.
      let json = {};
      try { json = await resp.json(); } catch (err) { /* ignore parse errors */ }

      if (resp.ok && (json.status === 'success' || json.success === true || resp.status === 200)) {
        alert('Application submitted — thank you!');
        form.reset();
      } else {
        const msg = json.message || json.error || 'Submission failed';
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
