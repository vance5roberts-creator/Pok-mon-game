# Traditions Pre-School website

Simple, mobile-friendly site with online payments (Stripe Checkout).

## Run locally
```bash
cd traditions-preschool
STRIPE_SECRET_KEY=sk_test_... npm start
```
Open http://localhost:3000. Without a key, everything works except checkout.

## Set up payments
1. Create a free account at stripe.com.
2. Copy your **test** secret key (Developers → API keys) and set `STRIPE_SECRET_KEY`.
3. Test with card `4242 4242 4242 4242`, any future date, any CVC.
4. When ready, switch to the live key and set `BASE_URL` to your real domain.

Edit prices in `server.js` (`PRICES`, in cents) and the labels in `pay.html` / `admissions.html`.

## Make it yours
- Placeholder text, address, phone, email, tuition, and teachers are in the `.html` files. Search for `123 Main Street`, `555`, and `$850`.
- Gallery tiles in `gallery.html` are emoji placeholders. Replace each `<div class="tile">` with `<img src="photos/yourphoto.jpg" alt="...">`.
- Colors live at the top of `styles.css`.
- Form submissions are saved to `inquiries.log`. Hook up email when you're ready.

## Hosting
Needs a Node host (Render, Railway, Fly.io, etc.) because of the payment server. Set the env vars from `.env.example` there.
