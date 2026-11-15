// Traditions Pre-School: tiny dependency-free server (Node 18+).
// Serves the static site and creates Stripe Checkout sessions.
// Config via environment variables (see .env.example). Never commit real keys.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;          // sk_test_... / sk_live_...
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Prices in cents. Edit these to match your real tuition.
const PRICES = {
  tuition:      { name: 'Monthly Tuition',  cents: 85000 },
  registration: { name: 'Registration Fee', cents: 15000 },
  deposit:      { name: 'Enrollment Deposit', cents: 20000 },
};

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon' };

const readJson = req => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
});
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function checkout(req, res) {
  if (!STRIPE_KEY) return send(res, 503, { error: 'Payments are not configured yet. Please contact the school.' });
  const d = await readJson(req);
  let item = PRICES[d.type];
  if (d.type === 'other') {
    const cents = Math.round(parseFloat(d.amount) * 100);
    if (!(cents >= 100 && cents <= 500000)) return send(res, 400, { error: 'Enter an amount between $1 and $5,000.' });
    item = { name: (d.note || 'School Fee').slice(0, 100), cents };
  }
  if (!item) return send(res, 400, { error: 'Unknown payment type.' });

  const p = new URLSearchParams({
    mode: 'payment',
    success_url: `${BASE_URL}/pay-success.html`,
    cancel_url: `${BASE_URL}/pay.html`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(item.cents),
    'line_items[0][price_data][product_data][name]': `${item.name}${d.child ? ' (' + String(d.child).slice(0, 60) + ')' : ''}`,
    'metadata[child]': String(d.child || '').slice(0, 100),
    'metadata[note]': String(d.note || '').slice(0, 200),
  });
  if (d.email) p.set('customer_email', String(d.email).slice(0, 200));

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p,
  });
  const s = await r.json();
  if (!r.ok) return send(res, 502, { error: 'Could not start checkout. Please try again.' });
  send(res, 200, { url: s.url });
}

async function inquiry(req, res) {
  const d = await readJson(req);
  // Simple log-to-file. Swap for email (e.g. a mail API) when you're ready.
  fs.appendFileSync(path.join(__dirname, 'inquiries.log'), JSON.stringify({ at: new Date().toISOString(), ...d }) + '\n');
  send(res, 200, { ok: true });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, BASE_URL);
    if (req.method === 'POST' && url.pathname === '/api/checkout') return await checkout(req, res);
    if (req.method === 'POST' && url.pathname === '/api/inquiry') return await inquiry(req, res);

    let file = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const full = path.normalize(path.join(__dirname, file));
    const ext = path.extname(full);
    // Only serve known public file types from this folder (never server.js, .env, logs).
    if (!full.startsWith(__dirname + path.sep) || !MIME[ext] || path.basename(full) === 'server.js' || !fs.existsSync(full)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] });
    fs.createReadStream(full).pipe(res);
  } catch (e) { send(res, 500, { error: 'Server error' }); }
}).listen(PORT, () => console.log(`Traditions Pre-School running at http://localhost:${PORT}` + (STRIPE_KEY ? '' : '  (Stripe not configured)')));
