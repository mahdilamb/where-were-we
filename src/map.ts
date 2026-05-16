import L from "leaflet";
import type { GameDefinition, GameItem, LatLng, MapType } from "./types";

const TILE_LAYERS: Record<MapType, { url: string; attribution: string; maxZoom?: number }> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  // Light no-labels – ideal as a canvas for network games
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CARTO",
    maxZoom: 19,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CARTO",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri & contributors",
    maxZoom: 19,
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
  blank: {
    url: "",
    attribution: "",
  },
};

export class GameMap {
  private readonly map: L.Map;
  private readonly routesLayer: L.LayerGroup;
  private readonly hitsLayer: L.LayerGroup;
  private readonly missLayer: L.LayerGroup;

  constructor(container: HTMLElement, game: GameDefinition) {
    this.map = L.map(container, {
      zoomControl: true,
      worldCopyJump: true,
    }).setView(game.center, game.zoom);

    const tile = TILE_LAYERS[game.mapType] ?? TILE_LAYERS.street;
    if (tile.url) {
      L.tileLayer(tile.url, {
        attribution: tile.attribution,
        maxZoom: tile.maxZoom ?? 19,
      }).addTo(this.map);
    }

    this.routesLayer = L.layerGroup().addTo(this.map);
    this.hitsLayer = L.layerGroup().addTo(this.map);
    this.missLayer = L.layerGroup().addTo(this.map);

    this.drawRoutes(game);
  }

  private drawRoutes(game: GameDefinition): void {
    if (!game.routes || !game.lineDefinitions) return;
    for (const route of game.routes) {
      const def = game.lineDefinitions[route.line];
      if (!def || route.path.length < 2) continue;
      L.polyline(route.path as LatLng[], {
        color: def.color,
        weight: 5,
        opacity: 0.8,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(this.routesLayer);
    }
  }

  private resolveColor(item: GameItem, game: GameDefinition): string {
    if ("point" in item && item.lines?.length && game.lineDefinitions) {
      const def = game.lineDefinitions[item.lines[0]];
      if (def) return def.color;
    }
    return "#16a34a";
  }

  reveal(item: GameItem, game: GameDefinition, opts: { flash?: boolean } = {}): void {
    const color = this.resolveColor(item, game);
    const flashColor = "#facc15";
    if ("point" in item) {
      const marker = L.circleMarker(item.point, {
        radius: 6,
        weight: 2,
        color: "#fff",
        fillColor: opts.flash ? flashColor : color,
        fillOpacity: 1,
      }).addTo(this.hitsLayer);
      marker.bindTooltip(item.name, {
        permanent: true,
        direction: "right",
        className: "ww-tip",
      });
      if (opts.flash) {
        setTimeout(() => marker.setStyle({ fillColor: color }), 700);
      }
    } else if ("line" in item) {
      L.polyline(item.line as LatLng[], {
        color,
        weight: 4,
        opacity: 0.9,
      })
        .bindTooltip(item.name, { sticky: true, className: "ww-tip" })
        .addTo(this.hitsLayer);
    } else if ("polygon" in item) {
      L.polygon(item.polygon as LatLng[], {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
      })
        .bindTooltip(item.name, { sticky: true, className: "ww-tip" })
        .addTo(this.hitsLayer);
    }
  }

  revealMissed(item: GameItem): void {
    const color = "#dc2626";
    if ("point" in item) {
      L.circleMarker(item.point, {
        radius: 5,
        weight: 2,
        color: "#fff",
        fillColor: color,
        fillOpacity: 0.7,
        dashArray: "2,2",
      })
        .bindTooltip(item.name, {
          permanent: true,
          direction: "right",
          className: "ww-tip ww-miss",
        })
        .addTo(this.missLayer);
    } else if ("line" in item) {
      L.polyline(item.line as LatLng[], {
        color,
        weight: 3,
        opacity: 0.7,
        dashArray: "6,6",
      })
        .bindTooltip(item.name, { sticky: true, className: "ww-tip ww-miss" })
        .addTo(this.missLayer);
    } else if ("polygon" in item) {
      L.polygon(item.polygon as LatLng[], {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.2,
        dashArray: "6,6",
      })
        .bindTooltip(item.name, { sticky: true, className: "ww-tip ww-miss" })
        .addTo(this.missLayer);
    }
  }

  clearMissed(): void {
    this.missLayer.clearLayers();
  }

  fitTo(item: GameItem): void {
    if ("point" in item) {
      this.map.panTo(item.point);
    } else if ("line" in item) {
      this.map.fitBounds(L.latLngBounds(item.line as LatLng[]), {
        padding: [40, 40],
      });
    } else if ("polygon" in item) {
      this.map.fitBounds(L.latLngBounds(item.polygon as LatLng[]), {
        padding: [40, 40],
      });
    }
  }

  invalidate(): void {
    this.map.invalidateSize();
  }

  destroy(): void {
    this.map.remove();
  }
}
