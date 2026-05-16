# Where Were We

Geography guessing games — type names, watch the map fill in. Pure client-side, deployed to GitHub Pages.

## Live

After deploying: <https://mahdilamb.github.io/where-were-we/>

## Run locally

```sh
npm install
npm run dev
```

## Add a new game

1. Drop a YAML file in `public/games/<slug>.yaml`:

   ```yaml
   name: My Game
   description: What players are finding.
   mapType: street       # street | dark | satellite | topo
   geographyType: point  # point | polyline | polygon
   center: [51.5, -0.12]
   zoom: 12
   items:
     - name: Big Ben
       aliases: [elizabeth tower]
       point: [51.5007, -0.1246]
     # for polyline items use `line: [[lat,lng], ...]`
     # for polygon items use `polygon: [[lat,lng], ...]`
   ```

2. Add it to `public/games/index.yaml`.

That's it. The game engine picks the geometry up from the file's `geographyType`.

## URL hash format

Progress lives in the URL hash so it survives reloads and shares:

```
#/<slug>/<startUnixSec>/<base64-bitset-of-found-indices>
```

- `startUnixSec` is captured the first time you open a game — the timer counts from there.
- The bitset is URL-safe base64 of one bit per item (in YAML order).
- Copying the URL preserves both the elapsed time and progress.

## Stack

- Vite + TypeScript
- Leaflet (OpenStreetMap / CARTO / Esri / OpenTopoMap tiles)
- js-yaml
- GitHub Actions → GitHub Pages
