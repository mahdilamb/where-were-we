import { useEffect, useRef } from "react";
import { GameMap } from "./map";
import type { GameDefinition, GameItem } from "./types";

interface Props {
  game: GameDefinition;
  found: ReadonlySet<number>;
  missed: ReadonlySet<number>;
  focusItem: GameItem | null;
  flashItem: GameItem | null;
}

export function MapView({ game, found, missed, focusItem, flashItem }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GameMap | null>(null);
  const renderedFound = useRef<Set<number>>(new Set());
  const renderedMissed = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new GameMap(containerRef.current, game);
    mapRef.current = map;
    renderedFound.current.clear();
    renderedMissed.current.clear();
    for (const idx of found) {
      map.reveal(game.items[idx], game);
      renderedFound.current.add(idx);
    }
    requestAnimationFrame(() => map.invalidate());
    return () => {
      map.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const idx of found) {
      if (!renderedFound.current.has(idx)) {
        map.reveal(game.items[idx], game, {
          flash: flashItem === game.items[idx],
        });
        renderedFound.current.add(idx);
      }
    }
  }, [found, game, flashItem]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (missed.size === 0 && renderedMissed.current.size > 0) {
      map.clearMissed();
      renderedMissed.current.clear();
      return;
    }
    for (const idx of missed) {
      if (!renderedMissed.current.has(idx)) {
        map.revealMissed(game.items[idx]);
        renderedMissed.current.add(idx);
      }
    }
  }, [missed, game]);

  useEffect(() => {
    if (focusItem && mapRef.current) mapRef.current.fitTo(focusItem);
  }, [focusItem]);

  return <div ref={containerRef} className="map" />;
}
