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
  modoEdicion?: "ninguno" | "cuadro" | "trampa";
  onNuevoCuadro?: (payload: NuevoCuadroPayload) => void;
  onNuevaTrampa?: (payload: NuevaTrampaPayload) => void;
  zoomTarget?: { lat: number; lng: number } | null;
  onZoomDone?: () => void;
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

function calcularAreaHa(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const dlng = ((coords[j][1] - coords[i][1]) * Math.PI) / 180;
    area += Math.sin(dlng) * (Math.cos(lat1) + Math.cos(lat2));
  }
  return Math.abs(area * R * R) / 2 / 10000;
}

// Centro de Melilla, Montevideo
const MELILLA_CENTER: [number, number] = [-34.776, -56.048];

export default function MapaFrutiApp({
  cuadros,
  onCuadroClick,
  showTrampas = true,
  modoEdicion = "ninguno",
  onNuevoCuadro,
  onNuevaTrampa,
  zoomTarget,
  onZoomDone,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawnLayersRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawingPointsRef = useRef<[number, number][]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawingMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawingPolyRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [puntosActuales, setPuntosActuales] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReady(true);
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, { zoomControl: true, doubleClickZoom: false })
      .setView(MELILLA_CENTER, 14);

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 20,
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri", maxZoom: 20 }
    );

    // Empezar con satélite para ver los cuadros reales
    satellite.addTo(map);
    L.control.layers({ "Satélite": satellite, "Mapa": osm }, {}).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayersRef.current = drawnItems;

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      drawnLayersRef.current = null;
    };
  }, [ready]);

  // Limpiar dibujo en progreso
  const limpiarDibujo = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const map = mapInstance.current;
    if (!map) return;
    drawingMarkersRef.current.forEach((m) => map.removeLayer(m));
    drawingMarkersRef.current = [];
    if (drawingPolyRef.current) {
      map.removeLayer(drawingPolyRef.current);
      drawingPolyRef.current = null;
    }
    drawingPointsRef.current = [];
    setPuntosActuales(0);
    // Quitar listeners
    map.off("click");
    map.off("dblclick");
    map.getContainer().style.cursor = "";
    // Re-habilitar doble click zoom
    map.doubleClickZoom.enable();
  }, []);

  // Cerrar polígono y guardar
  const cerrarPoligono = useCallback(() => {
    const pts = drawingPointsRef.current;
    if (pts.length < 3) return;
    const areaHa = calcularAreaHa(pts);
    onNuevoCuadro?.({ coordenadas: [...pts], areaSqm: areaHa * 10000 });
    limpiarDibujo();
  }, [onNuevoCuadro, limpiarDibujo]);

  // Gestionar modo edición
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const map = mapInstance.current;

    limpiarDibujo();

    if (modoEdicion === "cuadro") {
      map.getContainer().style.cursor = "crosshair";
      map.doubleClickZoom.disable();

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
        drawingPointsRef.current = [...drawingPointsRef.current, pt];
        setPuntosActuales(drawingPointsRef.current.length);

        // Marcador numerado
        const num = drawingPointsRef.current.length;
        const icon = L.divIcon({
          html: `<div style="background:#10b981;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${num}</div>`,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker(pt, { icon }).addTo(map);
        drawingMarkersRef.current.push(marker);

        // Actualizar polígono preview
        if (drawingPolyRef.current) map.removeLayer(drawingPolyRef.current);
        if (drawingPointsRef.current.length >= 2) {
          drawingPolyRef.current = L.polygon(drawingPointsRef.current, {
            color: "#10b981",
            fillColor: "#10b981",
            fillOpacity: 0.2,
            dashArray: "6,4",
            weight: 2,
          }).addTo(map);
        }
      });

      map.on("dblclick", () => {
        cerrarPoligono();
      });
    }

    if (modoEdicion === "trampa") {
      map.getContainer().style.cursor = "crosshair";

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        onNuevaTrampa?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        // Pin temporal
        const icon = L.divIcon({
          html: `<div style="background:#dc2626;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">T</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([e.latlng.lat, e.latlng.lng], { icon }).addTo(drawnLayersRef.current);
        // Un solo click y listo
        map.off("click");
        map.getContainer().style.cursor = "";
      });
    }
  }, [modoEdicion, ready, limpiarDibujo, cerrarPoligono, onNuevaTrampa]);

  // Renderizar cuadros existentes
  const renderLayers = useCallback(() => {
    if (!mapInstance.current || !ready) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const map = mapInstance.current;

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
        color, fillColor: color, fillOpacity: 0.35, weight: 2,
      }).addTo(map);

      polygon.bindPopup(`
        <div style="min-width:180px;font-family:system-ui">
          <strong style="font-size:14px">${cuadro.nombre}</strong><br/>
          <span style="color:#666;font-size:12px">${cuadro.variedad} · ${cuadro.especie}</span><br/>
          📐 ${cuadro.superficie} ha &nbsp;|&nbsp; 🏠 ${cuadro.establecimiento.nombre}
          ${cuadro.marcadoMonitoreo ? '<br/><span style="color:#16a34a;font-size:11px">✓ Monitoreado</span>' : ""}
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

    // Solo hacer fitBounds si hay cuadros CON coordenadas en Melilla
    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 }); } catch { /* ok */ }
    }
  }, [cuadros, ready, showTrampas, onCuadroClick]);

  useEffect(() => { renderLayers(); }, [renderLayers]);

  // Zoom al cuadro seleccionado
  useEffect(() => {
    if (!zoomTarget || !mapInstance.current) return;
    mapInstance.current.setView([zoomTarget.lat, zoomTarget.lng], 17, { animate: true });
    onZoomDone?.();
  }, [zoomTarget, onZoomDone]);

  if (!ready) return (
    <div className="h-[520px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">
      Cargando mapa...
    </div>
  );

  return (
    <div className="relative">
      {modoEdicion === "cuadro" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-700 text-white text-sm px-4 py-2 rounded-full shadow-lg text-center">
          {puntosActuales === 0
            ? "📍 Hacé click en el mapa para marcar los vértices del cuadro"
            : puntosActuales < 3
            ? `📍 ${puntosActuales} punto(s) — seguí marcando (mínimo 3)`
            : `✅ ${puntosActuales} puntos — doble click para cerrar el cuadro`}
        </div>
      )}
      {modoEdicion === "trampa" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          🪤 Hacé click donde querés ubicar la trampa
        </div>
      )}
      <div ref={mapRef} className="w-full h-[520px] rounded-xl overflow-hidden" style={{ zIndex: 0 }} />
    </div>
  );
}
