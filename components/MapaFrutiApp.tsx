"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Trampa = { id: string; numero: string; tipo: string; lat: number; lng: number };

type Cuadro = {
  id: string;
  nombre: string;
  variedad: string;
  especie: string;
  superficie: number;
  coordenadas: string;
  marcadoMonitoreo: boolean;
  trampas: Trampa[];
  establecimiento: { nombre: string; codigo: string };
};

export type NuevoCuadroPayload = {
  coordenadas: [number, number][];
  areaSqm: number;
};

export type NuevaTrampaPayload = {
  lat: number;
  lng: number;
};

type Props = {
  cuadros: Cuadro[];
  onCuadroClick?: (cuadro: Cuadro) => void;
  showTrampas?: boolean;
  // Modo edición
  modoEdicion?: "ninguno" | "cuadro" | "trampa";
  onNuevoCuadro?: (payload: NuevoCuadroPayload) => void;
  onNuevaTrampa?: (payload: NuevaTrampaPayload) => void;
};

const ESPECIE_COLORS: Record<string, string> = {
  durazno: "#f59e0b",
  nectarino: "#f97316",
  ciruela: "#8b5cf6",
  damasco: "#ec4899",
  manzana: "#10b981",
  pera: "#84cc16",
  default: "#6b7280",
};

// Calcula área de polígono en m² usando fórmula de Shoelace con lat/lng
function calcularAreaSqm(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const R = 6371000; // Radio tierra en metros
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const dlng = ((coords[j][1] - coords[i][1]) * Math.PI) / 180;
    area += Math.sin(dlng) * Math.cos(lat2);
    area *= R * R;
  }
  return Math.abs(area) / 2;
}

export default function MapaFrutiApp({
  cuadros,
  onCuadroClick,
  showTrampas = true,
  modoEdicion = "ninguno",
  onNuevoCuadro,
  onNuevaTrampa,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawControlRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawnLayersRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReady(true);
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    // Fix default icons
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    // Melilla, Montevideo
    const map = L.map(mapRef.current, { zoomControl: true }).setView([-34.776, -56.048], 14);

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 20,
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri", maxZoom: 20 }
    );

    osm.addTo(map);
    L.control.layers({ "Mapa": osm, "Satélite": satellite }, {}).addTo(map);

    // Capa para dibujos
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayersRef.current = drawnItems;

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      drawControlRef.current = null;
      drawnLayersRef.current = null;
    };
  }, [ready]);

  // Gestionar modo edición (dibujo de cuadros / trampas)
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    // Quitar control anterior
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Quitar listeners previos
    map.off("draw:created");
    map.off("click");

    if (modoEdicion === "cuadro" && drawnLayersRef.current) {
      // Cargar leaflet-draw y su CSS
      require("leaflet-draw");
      // Inyectar CSS de leaflet-draw si no está
      if (!document.getElementById("leaflet-draw-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-draw-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css";
        document.head.appendChild(link);
      }

      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.3 },
          },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: { featureGroup: drawnLayersRef.current, remove: false },
      });

      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      map.on("draw:created", (e: { layer: unknown }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layer = e.layer as any;
        drawnLayersRef.current.clearLayers();
        drawnLayersRef.current.addLayer(layer);
        const latLngs: [number, number][] = layer.getLatLngs()[0].map(
          (ll: { lat: number; lng: number }) => [ll.lat, ll.lng] as [number, number]
        );
        const areaSqm = calcularAreaSqm(latLngs);
        onNuevoCuadro?.({ coordenadas: latLngs, areaSqm });
      });
    }

    if (modoEdicion === "trampa") {
      // Cursor crosshair
      map.getContainer().style.cursor = "crosshair";

      const onClick = (e: { latlng: { lat: number; lng: number } }) => {
        onNuevaTrampa?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        // Mostrar pin temporal
        const trapIcon = L.divIcon({
          html: `<div style="background:#dc2626;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white">T</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([e.latlng.lat, e.latlng.lng], { icon: trapIcon }).addTo(drawnLayersRef.current);
      };

      map.on("click", onClick);
    } else {
      map.getContainer().style.cursor = "";
    }
  }, [modoEdicion, ready, onNuevoCuadro, onNuevaTrampa]);

  // Renderizar cuadros y trampas existentes
  const renderLayers = useCallback(() => {
    if (!mapInstance.current || !ready) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const map = mapInstance.current;

    // Limpiar capas de datos (no las de dibujo ni tiles)
    map.eachLayer((layer: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l = layer as any;
      if (!l._url && l !== drawnLayersRef.current && !drawnLayersRef.current?.hasLayer(l)) {
        map.removeLayer(layer);
      }
    });

    const bounds: [number, number][] = [];

    cuadros.forEach((cuadro) => {
      let coords: [number, number][] = [];
      try { coords = JSON.parse(cuadro.coordenadas); } catch { return; }
      if (!coords.length) return;

      const color = ESPECIE_COLORS[cuadro.especie] ?? ESPECIE_COLORS.default;

      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 2,
      }).addTo(map);

      polygon.bindPopup(`
        <div style="min-width:180px;font-family:system-ui">
          <strong style="font-size:14px">${cuadro.nombre}</strong><br/>
          <span style="color:#666;font-size:12px">${cuadro.variedad} · ${cuadro.especie}</span><br/>
          📐 ${cuadro.superficie} ha &nbsp;|&nbsp; 🏠 ${cuadro.establecimiento.nombre}
          ${cuadro.marcadoMonitoreo ? '<br/><span style="color:#16a34a;font-size:11px">✓ Marcado para monitoreo</span>' : ""}
          ${cuadro.trampas?.length ? `<br/><span style="color:#dc2626;font-size:11px">🪤 ${cuadro.trampas.length} trampa(s)</span>` : ""}
        </div>
      `);

      if (onCuadroClick) polygon.on("click", () => onCuadroClick(cuadro));
      coords.forEach(([lat, lng]) => bounds.push([lat, lng]));

      if (showTrampas && cuadro.trampas?.length) {
        cuadro.trampas.forEach((trampa) => {
          const trapIcon = L.divIcon({
            html: `<div style="background:#dc2626;color:white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.35);border:2px solid white">T</div>`,
            className: "",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          L.marker([trampa.lat, trampa.lng], { icon: trapIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:system-ui;min-width:140px">
                <strong>🪤 Trampa ${trampa.numero}</strong><br/>
                <span style="color:#666;font-size:12px">${trampa.tipo}</span><br/>
                <span style="font-size:11px">Cuadro: ${cuadro.nombre}</span>
              </div>
            `);
          bounds.push([trampa.lat, trampa.lng]);
        });
      }
    });

    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 }); } catch { /* ok */ }
    }
  }, [cuadros, ready, showTrampas, onCuadroClick]);

  useEffect(() => { renderLayers(); }, [renderLayers]);

  if (!ready) return <div className="h-[500px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Cargando mapa...</div>;

  return (
    <div className="relative">
      {modoEdicion === "cuadro" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-full shadow-lg pointer-events-none">
          🖊️ Dibujá el polígono del cuadro en el mapa
        </div>
      )}
      {modoEdicion === "trampa" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white text-sm px-4 py-1.5 rounded-full shadow-lg pointer-events-none">
          🪤 Hacé click donde querés ubicar la trampa
        </div>
      )}
      <div ref={mapRef} className="w-full h-[520px] rounded-xl overflow-hidden" style={{ zIndex: 0 }} />
    </div>
  );
}
