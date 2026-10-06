// maplibre-gl v6 ships its web worker as an ES module that webpack can't bundle, so serve
// the worker (and the shared chunk it imports) as static files and point maplibre at them.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `public/maplibre/${f}`);
}
