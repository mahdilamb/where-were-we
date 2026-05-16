import yaml from "js-yaml";
import { encode, representativePoint } from "./geohash";
import type { GameDefinition, GameIndexEntry, GameItem, LatLng } from "./types";

function gamesUrl(path: string): string {
  return `${import.meta.env.BASE_URL}games/${path}`;
}

export async function loadGameIndex(): Promise<GameIndexEntry[]> {
  const res = await fetch(gamesUrl("index.yaml"));
  if (!res.ok) throw new Error(`Failed to load game index: ${res.status}`);
  const text = await res.text();
  const parsed = yaml.load(text) as { games?: GameIndexEntry[] } | null;
  return parsed?.games ?? [];
}

export async function loadGame(slug: string): Promise<GameDefinition> {
  const res = await fetch(gamesUrl(`${slug}.yaml`));
  if (!res.ok) throw new Error(`Failed to load game ${slug}: ${res.status}`);
  const text = await res.text();
  const parsed = yaml.load(text) as Omit<GameDefinition, "slug"> | null;
  if (!parsed) throw new Error(`Empty game ${slug}`);
  const game: GameDefinition = { slug, ...parsed };
  assignIds(game.items);
  return game;
}

function assignIds(items: GameItem[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id) {
      const geometry: LatLng | LatLng[] =
        "point" in item ? item.point : "line" in item ? item.line : item.polygon;
      item.id = encode(...representativePoint(geometry));
    }
    // Guarantee uniqueness — append a counter suffix if collision
    let id = item.id;
    let n = 1;
    while (seen.has(id)) id = `${item.id}_${n++}`;
    item.id = id;
    seen.add(id);
  }
}
