export type LatLng = [number, number];

export type MapType = "street" | "light" | "dark" | "satellite" | "topo" | "blank";

export type GeometryType = "point" | "polyline" | "polygon";

export interface LineDefinition {
  name: string;
  color: string;
}

export interface RouteDefinition {
  line: string;
  path: LatLng[];
}

export interface PointItem {
  name: string;
  aliases?: string[];
  point: LatLng;
  lines?: string[];
  id?: string; // geohash — computed at load time if absent
}

export interface LineItem {
  name: string;
  aliases?: string[];
  line: LatLng[];
  id?: string; // geohash of midpoint — computed at load time if absent
}

export interface PolygonItem {
  name: string;
  aliases?: string[];
  polygon: LatLng[];
  id?: string; // geohash of centroid — computed at load time if absent
}

export type GameItem = PointItem | LineItem | PolygonItem;

export interface GameDefinition {
  slug: string;
  name: string;
  description: string;
  mapType: MapType;
  geographyType: GeometryType;
  center: LatLng;
  zoom: number;
  lineDefinitions?: Record<string, LineDefinition>;
  routes?: RouteDefinition[];
  items: GameItem[];
}

export interface GameIndexEntry {
  slug: string;
  name: string;
  description: string;
  count: number;
}
