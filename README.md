# Monaco Custom Designs

A static website for Monaco Custom Designs, a laser engraving workshop specializing in custom wood, stone, and acrylic pieces. Modern layout with an Italian-inspired visual theme (terracotta, olive, cream, gold).

## Structure

- `index.html` — page markup and content
- `css/styles.css` — all styling (CSS custom properties at the top for easy color/font swaps)
- `js/main.js` — mobile nav toggle, scroll-reveal animations, contact form handling

## Running locally

Just open `index.html` in a browser, or serve the folder with any static file server.

## Notes

- The contact form is front-end only right now (it shows a confirmation message but doesn't send anywhere). Wire it up to a service like Formspree, Netlify Forms, or your own backend before going live.
- Material/gallery visuals are built with pure CSS gradients (no image files needed) — swap in real photos of engraved pieces whenever you have them, using the same card/figure markup.
