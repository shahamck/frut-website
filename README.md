# FRŪT — website

One-page site for FRŪT (@frut.ind), the real-fruit popsicle brand from Ahmedabad. Layout direction based on the EISLAB ice-cream site; brand, copy and photography from FRŪT's Instagram.

## Run locally

```bash
python3 -m http.server 8646
```

Then open http://localhost:8646.

## Structure

- `index.html` — page markup
- `styles.css` — layout, brand tokens and the motion section
- `main.js` — menu, flavour slider, scroll/intro animations
- `assets/logo.svg` — traced FRŪT wordmark (recolour with CSS mask)
- `assets/img/` — web-sized photos

Bump the `?v=` number on the CSS/JS links in `index.html` after editing them so browsers don't serve a cached copy.

## To confirm with the client

- Flavour list and descriptions
- Newsletter form needs a sign-up service (currently front-end only)
