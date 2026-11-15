// Mobile menu
const btn = document.querySelector('.menu-btn');
const list = document.querySelector('.nav ul');
if (btn && list) btn.addEventListener('click', () => {
  const open = list.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
});

// Inquiry / contact forms: posts to the server; falls back to a friendly message.
document.querySelectorAll('form[data-endpoint]').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = form.querySelector('.status');
    status.className = 'status';
    status.textContent = 'Sending…';
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      if (!res.ok) throw new Error();
      form.reset();
      status.className = 'status ok';
      status.textContent = 'Thank you! We will be in touch very soon.';
    } catch {
      status.className = 'status err';
      status.textContent = 'Sorry, something went wrong. Please call or email us instead.';
    }
  });
});

// Payments: ask the server for a Stripe Checkout session, then redirect.
const payForm = document.getElementById('pay-form');
if (payForm) {
  const typeSel = payForm.querySelector('[name=type]');
  const amountWrap = document.getElementById('amount-wrap');
  const sync = () => { amountWrap.style.display = typeSel.value === 'other' ? 'block' : 'none'; };
  typeSel.addEventListener('change', sync); sync();

  payForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = payForm.querySelector('.status');
    status.className = 'status';
    status.textContent = 'Taking you to secure checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(payForm)))
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout unavailable');
      location.href = data.url;
    } catch (err) {
      status.className = 'status err';
      status.textContent = err.message === 'Failed to fetch'
        ? 'Payments are not connected yet. Please contact the school.' : err.message;
    }
  });
}
