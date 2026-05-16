// Compact geohash encoder / decoder (no external dependency).
// Precision 8 → ~38 m accuracy — sufficient for all game items.

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const B32_INV: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) B32_INV[BASE32[i]] = i;

export function encode(lat: number, lng: number, precision = 8): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = "";
  let bits = 0, val = 0, total = 0;
  while (hash.length < precision) {
    if (total % 2 === 0) {
      // longitude bit
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { val = (val << 1) | 1; minLng = mid; }
      else { val = val << 1; maxLng = mid; }
    } else {
      // latitude bit
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { val = (val << 1) | 1; minLat = mid; }
      else { val = val << 1; maxLat = mid; }
    }
    bits++;
    total++;
    if (bits === 5) {
      hash += BASE32[val];
      bits = 0;
      val = 0;
    }
  }
  return hash;
}

export function decode(hash: string): [number, number] {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let isLng = true;
  for (const ch of hash) {
    const v = B32_INV[ch] ?? 0;
    for (let b = 4; b >= 0; b--) {
      const bit = (v >> b) & 1;
      if (isLng) { const m = (minLng + maxLng) / 2; if (bit) minLng = m; else maxLng = m; }
      else { const m = (minLat + maxLat) / 2; if (bit) minLat = m; else maxLat = m; }
      isLng = !isLng;
    }
  }
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

// Derive a representative [lat, lng] from any item geometry for ID purposes.
import type { LatLng } from "./types";

export function representativePoint(geometry: LatLng | LatLng[]): [number, number] {
  if (!Array.isArray(geometry[0])) {
    // plain [lat, lng]
    return geometry as [number, number];
  }
  const pts = geometry as LatLng[];
  if (pts.length === 0) return [0, 0];
  // centroid (works for both polylines and polygons)
  let lat = 0, lng = 0;
  for (const [a, b] of pts) { lat += a; lng += b; }
  return [lat / pts.length, lng / pts.length];
}
