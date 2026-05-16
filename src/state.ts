// URL hash state. Format:
//   #/<slug>                          → game, not yet started
//   #/<slug>/<startSec>               → game in progress, no finds yet
//   #/<slug>/<startSec>/<foundB64>    → game in progress with finds bitset
//
// The bitset is indexed by the geohash-sorted order of item IDs, so it
// remains valid even when the YAML is reordered or items are added.

import type { GameItem } from "./types";

export interface ParsedHash {
  route: "lobby" | "game";
  slug?: string;
  startSec?: number;
  foundBits?: Uint8Array;
}

const URL_SAFE = /^[A-Za-z0-9_-]*$/;

function b64Encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64Decode(s: string): Uint8Array {
  if (!URL_SAFE.test(s)) return new Uint8Array();
  const padded =
    s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array();
  }
}

// Build a stable sorted index: geohash-alphabetical order of item IDs.
// Returns an array where position i holds the original item index.
export function stableSortedOrder(items: GameItem[]): number[] {
  return items
    .map((item, idx) => ({ id: item.id ?? "", idx }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((x) => x.idx);
}

// Convert a set of original (YAML-order) indices to a stable bitset.
export function bitsetFromIndices(
  foundYaml: ReadonlySet<number>,
  sortedOrder: number[]
): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(sortedOrder.length / 8));
  sortedOrder.forEach((yamlIdx, stablePos) => {
    if (foundYaml.has(yamlIdx)) bytes[stablePos >> 3] |= 1 << (stablePos & 7);
  });
  return bytes;
}

// Convert a stable bitset back to a set of original (YAML-order) indices.
export function indicesFromBitset(
  bytes: Uint8Array,
  sortedOrder: number[]
): Set<number> {
  const out = new Set<number>();
  sortedOrder.forEach((yamlIdx, stablePos) => {
    if (bytes[stablePos >> 3] & (1 << (stablePos & 7))) out.add(yamlIdx);
  });
  return out;
}

export function parseHash(raw: string): ParsedHash {
  const stripped = raw.replace(/^#\/?/, "").trim();
  if (!stripped || stripped === "lobby") return { route: "lobby" };
  const parts = stripped.split("/");
  const slug = decodeURIComponent(parts[0] ?? "");
  if (!slug) return { route: "lobby" };
  const startSec = parts[1] ? Number(parts[1]) : undefined;
  const foundBits = parts[2] ? b64Decode(parts[2]) : undefined;
  return {
    route: "game",
    slug,
    startSec: Number.isFinite(startSec) ? startSec : undefined,
    foundBits,
  };
}

export function buildHash(
  slug: string,
  startSec?: number,
  foundBits?: Uint8Array
): string {
  let h = `#/${encodeURIComponent(slug)}`;
  if (startSec !== undefined) {
    h += `/${startSec}`;
    if (foundBits && foundBits.some((b) => b !== 0)) {
      h += `/${b64Encode(foundBits)}`;
    }
  }
  return h;
}

export function setHash(hash: string, replace = false): void {
  if (window.location.hash === hash) return;
  if (replace) history.replaceState(null, "", hash);
  else window.location.hash = hash;
}
