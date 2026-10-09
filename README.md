# Hedgehog

Colorful weekly planner (PWA). No build step — these files are the app.

## Run it locally
From this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000 in Chrome/Edge. (Opening `index.html` by double-click works for the app itself, but the offline/install parts need a web address.)

## Install on a Mac
- Safari: open the link → File → **Add to Dock**.
- Chrome/Edge: install icon in the address bar.

After the first visit the app is cached and works **offline**. Data is stored in the browser on that Mac (use **Customize → Save backup** now and then).

## Put it online (GitHub Pages)
Push the contents of this folder (not the whole hub) to a GitHub repo and enable Pages (Settings → Pages → `main` / root). All paths are relative, so it works under a sub-path.

## Files
| File | What it does |
|---|---|
| `index.html` | page skeleton + dialogs |
| `style.css` | colors, layout, responsive + print (PDF) rules |
| `app.js` | all the behavior (weeks, tasks, events, repeats, habits, export, backup) |
| `manifest.webmanifest` | name, icon, colors used when installed |
| `sw.js` | service worker: caches the app so it opens offline |
| `icons/` | app icons |
