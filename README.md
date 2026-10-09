# Weekly Plan

Colorful weekly planner (PWA). No build step — these files are the app.

## Run it locally
From this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000 in Chrome/Edge. (Opening `index.html` by double-click works for the app itself, but the offline/install parts need a web address.)

## Put it online (GitHub Pages)
1. Create a GitHub repo (e.g. `weekly-plan`) and push the contents of this folder (not the whole hub).
2. Repo → Settings → Pages → deploy from branch `main`, folder `/ (root)`.
3. Open the `https://<user>.github.io/weekly-plan/` address on the iPad/MacBook:
   - iPad Safari: Share → **Add to Home Screen**.
   - Mac Safari: File → **Add to Dock**. Chrome/Edge: install icon in the address bar.

All paths are relative, so it works under a sub-path like `/weekly-plan/`.

## Files
| File | What it does |
|---|---|
| `index.html` | page skeleton + install/iPad settings |
| `style.css` | colors, layout, responsive rules |
| `app.js` | all the behavior (weeks, tasks, events, themes, storage) |
| `manifest.webmanifest` | name, icon, colors used when installed |
| `sw.js` | service worker: caches the app so it opens offline |
| `icons/` | home-screen icons |
