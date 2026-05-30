"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { NuevoCuadroPayload, NuevaTrampaPayload } from "@/components/MapaFrutiBook";

const MapaFrutiBook = dynamic(() => import("@/components/MapaFrutiBook"), { ssr: false });

type Cuadro = {
  id: string;
  nombre: string;
  variedad: string;
  especie: string;
  superficie: number;
  numeroPlantas?: number;
  distanciaFilas?: number;
  distanciaPlantas?: number;
  anoPlantacion?: number;
  lat?: number;
  lng?: number;
  coordenadas: string;
  marcadoMonitoreo: boolean;
  trampas: Array<{ id: string; numero: string; tipo: string; lat: number; lng: number }>;
  establecimiento: { id: string; nombre: string; codigo: string };
  aplicaciones: Array<{
    id: string; fecha: string; tecnico: { name: string };
    productos: Array<{ producto: { nombre: string }; dosis: number; unidadDosis: string }>;
  }>;
  brotes: Array<{ id: string; fecha: string; objetivo: string; arbolesControlados: number; arbolesConDano: number }>;
  frutos: Array<{ id: string; fecha: string; objetivo: string; frutosControlados: number }>;
};

type Establecimiento = { id: string; nombre: string; codigo: string };

const ESPECIES = ["durazno", "nectarino", "ciruela", "damasco", "manzana", "pera", "otro"];
const TIPOS_TRAMPA = ["Feromona Grafolita", "Feromona Mosca", "Cromática amarilla", "Cromática azul", "Delta", "Otro"];
const ANO_ACTUAL = new Date().getFullYear();

type ModoEdicion = "ninguno" | "cuadro" | "trampa";

export default function MapaPage() {
  const [cuadros, setCuadros] = useState<Cuadro[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [selected, setSelected] = useState<Cuadro | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [modoEdicion, setModoEdicion] = useState<ModoEdicion>("ninguno");
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null);

  // Form nuevo cuadro
  const [pendingCuadro, setPendingCuadro] = useState<NuevoCuadroPayload | null>(null);
  const [formCuadro, setFormCuadro] = useState({
    nombre: "", variedad: "", especie: "durazno", establecimientoId: "",
    marcadoMonitoreo: false, numeroPlantas: "", distanciaFilas: "", distanciaPlantas: "",
    anoPlantacion: String(ANO_ACTUAL),
  });
  const [savingCuadro, setSavingCuadro] = useState(false);

  // Form nueva trampa
  const [pendingTrampa, setPendingTrampa] = useState<NuevaTrampaPayload | null>(null);
  const [formTrampa, setFormTrampa] = useState({ numero: "", tipo: "Feromona Grafolita", cuadroId: "" });
  const [savingTrampa, setSavingTrampa] = useState(false);

  const load = useCallback(async () => {
    const [cua, est, usr] = await Promise.all([
      fetch("/api/cuadros").then((r) => r.json()),
      fetch("/api/establecimientos").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    if (Array.isArray(cua)) setCuadros(cua);
    if (Array.isArray(est)) setEstablecimientos(est);
    setUser(usr);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Superficie calculada automáticamente
  const superficieCalculada = (() => {
    const n = parseFloat(formCuadro.numeroPlantas);
    const f = parseFloat(formCuadro.distanciaFilas);
    const p = parseFloat(formCuadro.distanciaPlantas);
    if (n > 0 && f > 0 && p > 0) return ((n * f * p) / 10000).toFixed(2);
    if (pendingCuadro) return (pendingCuadro.areaSqm / 10000).toFixed(2);
    return null;
  })();

  async function guardarCuadro() {
    if (!formCuadro.nombre || !formCuadro.establecimientoId) return;
    setSavingCuadro(true);
    await fetch("/api/cuadros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: formCuadro.nombre,
        variedad: formCuadro.variedad,
        especie: formCuadro.especie,
        superficie: superficieCalculada ? parseFloat(superficieCalculada) : 0,
        numeroPlantas: formCuadro.numeroPlantas || null,
        distanciaFilas: formCuadro.distanciaFilas || null,
        distanciaPlantas: formCuadro.distanciaPlantas || null,
        anoPlantacion: formCuadro.anoPlantacion || null,
        coordenadas: pendingCuadro?.coordenadas ?? [],
        marcadoMonitoreo: formCuadro.marcadoMonitoreo,
        establecimientoId: formCuadro.establecimientoId,
      }),
    });
    setPendingCuadro(null);
    setFormCuadro({ nombre: "", variedad: "", especie: "durazno", establecimientoId: "", marcadoMonitoreo: false, numeroPlantas: "", distanciaFilas: "", distanciaPlantas: "", anoPlantacion: String(ANO_ACTUAL) });
    setModoEdicion("ninguno");
    setSavingCuadro(false);
    load();
  }

  async function guardarTrampa() {
    if (!pendingTrampa || !formTrampa.numero || !formTrampa.cuadroId) return;
    setSavingTrampa(true);
    await fetch("/api/trampas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formTrampa, lat: pendingTrampa.lat, lng: pendingTrampa.lng }),
    });
    setPendingTrampa(null);
    setFormTrampa({ numero: "", tipo: "Feromona Grafolita", cuadroId: "" });
    setModoEdicion("ninguno");
    setSavingTrampa(false);
    load();
  }

  const handleCuadroClick = useCallback((c: Cuadro) => {
    setSelected(c as unknown as Cuadro);
    // Zoom al cuadro
    if (c.lat && c.lng) setZoomTarget({ lat: c.lat, lng: c.lng });
    else {
      try {
        const coords: [number, number][] = JSON.parse(c.coordenadas);
        if (coords.length > 0) {
          const lat = coords.reduce((s, p) => s + p[0], 0) / coords.length;
          const lng = coords.reduce((s, p) => s + p[1], 0) / coords.length;
          setZoomTarget({ lat, lng });
        }
      } catch { /* ok */ }
    }
  }, []);

  const canEdit = user?.role === "tecnico" || user?.role === "productor";
  const canAddTrap = user?.role === "monitoreador";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">🗺️ Mapa de cuadros</h1>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => { setModoEdicion(modoEdicion === "cuadro" ? "ninguno" : "cuadro"); setPendingCuadro(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${modoEdicion === "cuadro" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"}`}>
              {modoEdicion === "cuadro" ? "✕ Cancelar" : "✏️ Dibujar cuadro"}
            </button>
          )}
          {canAddTrap && (
            <button
              onClick={() => { setModoEdicion(modoEdicion === "trampa" ? "ninguno" : "trampa"); setPendingTrampa(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${modoEdicion === "trampa" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"}`}>
              {modoEdicion === "trampa" ? "✕ Cancelar" : "🪤 Agregar trampa"}
            </button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600 bg-white rounded-xl px-4 py-2 border border-gray-100">
        {[{ color: "#f59e0b", label: "Durazno" }, { color: "#f97316", label: "Nectarino" }, { color: "#8b5cf6", label: "Ciruela" }, { color: "#ec4899", label: "Damasco" }, { color: "#10b981", label: "Manzana" }, { color: "#84cc16", label: "Pera" }].map((i) => (
          <span key={i.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: i.color }} /> {i.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">T</span> Trampa
        </span>
      </div>

      {/* Mapa */}
      {loading ? (
        <div className="h-[520px] bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <MapaFrutiBook
          cuadros={cuadros}
          onCuadroClick={(c) => handleCuadroClick(c as unknown as Cuadro)}
          showTrampas
          modoEdicion={modoEdicion}
          onNuevoCuadro={(payload) => { setPendingCuadro(payload); }}
          onNuevaTrampa={(payload) => { setPendingTrampa(payload); }}
          zoomTarget={zoomTarget}
          onZoomDone={() => setZoomTarget(null)}
        />
      )}

      {/* Form nuevo cuadro */}
      {(pendingCuadro || modoEdicion === "cuadro") && canEdit && (
        <div className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">✏️ Nuevo cuadro</h2>
          {pendingCuadro && (
            <p className="text-sm text-emerald-600 mb-4">
              Polígono dibujado — superficie estimada por coordenadas: <strong>{(pendingCuadro.areaSqm / 10000).toFixed(2)} ha</strong>
            </p>
          )}
          {!pendingCuadro && (
            <p className="text-sm text-gray-400 mb-4">Dibujá el cuadro en el mapa o completá plantas y distancias para calcular la superficie.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Datos básicos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cuadro *</label>
              <input value={formCuadro.nombre} onChange={(e) => setFormCuadro({ ...formCuadro, nombre: e.target.value })}
                placeholder="Ej: Cuadro Norte" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especie *</label>
              <select value={formCuadro.especie} onChange={(e) => setFormCuadro({ ...formCuadro, especie: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {ESPECIES.map((e) => <option key={e} className="capitalize">{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
              <input value={formCuadro.variedad} onChange={(e) => setFormCuadro({ ...formCuadro, variedad: e.target.value })}
                placeholder="Ej: Flordaprince" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año de plantación</label>
              <input type="number" min="1980" max={ANO_ACTUAL} value={formCuadro.anoPlantacion}
                onChange={(e) => setFormCuadro({ ...formCuadro, anoPlantacion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento *</label>
              <select value={formCuadro.establecimientoId} onChange={(e) => setFormCuadro({ ...formCuadro, establecimientoId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Seleccionar...</option>
                {establecimientos.map((est) => <option key={est.id} value={est.id}>{est.codigo} — {est.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" id="mon" checked={formCuadro.marcadoMonitoreo}
                onChange={(e) => setFormCuadro({ ...formCuadro, marcadoMonitoreo: e.target.checked })}
                className="w-4 h-4 text-emerald-600" />
              <label htmlFor="mon" className="text-sm text-gray-700">Marcado para monitoreo</label>
            </div>
          </div>

          {/* Cálculo de superficie */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-700 mb-3">📐 Cálculo de superficie por plantas</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nº de plantas</label>
                <input type="number" min="0" value={formCuadro.numeroPlantas}
                  onChange={(e) => setFormCuadro({ ...formCuadro, numeroPlantas: e.target.value })}
                  placeholder="Ej: 500" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Distancia entre filas (m)</label>
                <input type="number" min="0" step="0.1" value={formCuadro.distanciaFilas}
                  onChange={(e) => setFormCuadro({ ...formCuadro, distanciaFilas: e.target.value })}
                  placeholder="Ej: 5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Distancia entre plantas (m)</label>
                <input type="number" min="0" step="0.1" value={formCuadro.distanciaPlantas}
                  onChange={(e) => setFormCuadro({ ...formCuadro, distanciaPlantas: e.target.value })}
                  placeholder="Ej: 3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className={`px-4 py-2 rounded-xl text-center font-bold ${superficieCalculada ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"}`}>
                {superficieCalculada ? <><span className="text-2xl">{superficieCalculada}</span><span className="text-sm"> ha</span></> : "— ha"}
              </div>
            </div>
            {formCuadro.numeroPlantas && formCuadro.distanciaFilas && formCuadro.distanciaPlantas && (
              <p className="text-xs text-gray-500 mt-2">
                Densidad: {Math.round(10000 / (parseFloat(formCuadro.distanciaFilas) * parseFloat(formCuadro.distanciaPlantas)))} plantas/ha
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={guardarCuadro} disabled={savingCuadro || !formCuadro.nombre || !formCuadro.establecimientoId || !superficieCalculada}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium">
              {savingCuadro ? "Guardando..." : "Guardar cuadro"}
            </button>
            <button onClick={() => { setPendingCuadro(null); setModoEdicion("ninguno"); }}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form nueva trampa */}
      {pendingTrampa && modoEdicion === "trampa" && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            🪤 Nueva trampa — {pendingTrampa.lat.toFixed(5)}, {pendingTrampa.lng.toFixed(5)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de trampa *</label>
              <input value={formTrampa.numero} onChange={(e) => setFormTrampa({ ...formTrampa, numero: e.target.value })}
                placeholder="Ej: T-03" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de trampa *</label>
              <select value={formTrampa.tipo} onChange={(e) => setFormTrampa({ ...formTrampa, tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {TIPOS_TRAMPA.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuadro asociado *</label>
              <select value={formTrampa.cuadroId} onChange={(e) => setFormTrampa({ ...formTrampa, cuadroId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Seleccionar...</option>
                {cuadros.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.variedad}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={guardarTrampa} disabled={savingTrampa || !formTrampa.numero || !formTrampa.cuadroId}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium">
              {savingTrampa ? "Guardando..." : "Guardar trampa"}
            </button>
            <button onClick={() => { setPendingTrampa(null); setModoEdicion("ninguno"); }}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Grid cuadros */}
      {cuadros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cuadros.map((c) => (
            <div key={c.id} onClick={() => handleCuadroClick(c)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${selected?.id === c.id ? "border-emerald-500 shadow-md" : "border-gray-200 hover:border-emerald-300"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.nombre}</h3>
                  <p className="text-sm text-gray-500 capitalize">{c.variedad} · {c.especie}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{c.superficie} ha</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{c.establecimiento.nombre}</p>
              {c.anoPlantacion && <p className="text-xs text-gray-400">Plantado: {c.anoPlantacion}</p>}
              {c.numeroPlantas && <p className="text-xs text-gray-400">{c.numeroPlantas} plantas</p>}
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>💊 {c.aplicaciones?.length ?? 0}</span>
                <span>🔍 {(c.brotes?.length ?? 0) + (c.frutos?.length ?? 0)}</span>
                <span>🪤 {c.trampas?.length ?? 0}</span>
              </div>
              {c.marcadoMonitoreo && <span className="mt-2 inline-block text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Monitoreado</span>}
            </div>
          ))}
        </div>
      )}

      {/* Detalle cuadro */}
      {selected && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selected.nombre}</h2>
              <p className="text-gray-500 capitalize">{selected.variedad} · {selected.especie} · {selected.superficie} ha</p>
              <div className="flex gap-4 mt-1 text-sm text-gray-500">
                {selected.anoPlantacion && <span>📅 Plantado en {selected.anoPlantacion}</span>}
                {selected.numeroPlantas && <span>🌳 {selected.numeroPlantas} plantas</span>}
                {selected.distanciaFilas && selected.distanciaPlantas && (
                  <span>📏 {selected.distanciaFilas}m × {selected.distanciaPlantas}m</span>
                )}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">💊 Últimas aplicaciones</h3>
              {selected.aplicaciones?.length ? selected.aplicaciones.slice(0, 3).map((a) => (
                <div key={a.id} className="text-xs bg-purple-50 rounded-lg p-2 mb-1">
                  <span className="font-medium">{new Date(a.fecha).toLocaleDateString("es-UY")}</span> · {a.tecnico.name}<br />
                  {a.productos.map((p) => <span key={p.producto.nombre} className="text-purple-700">{p.producto.nombre} </span>)}
                </div>
              )) : <p className="text-xs text-gray-400">Sin aplicaciones</p>}
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">🌿 Monitoreo brotes</h3>
              {selected.brotes?.length ? selected.brotes.slice(0, 3).map((b) => (
                <div key={b.id} className="text-xs bg-green-50 rounded-lg p-2 mb-1">
                  {new Date(b.fecha).toLocaleDateString("es-UY")} · {b.objetivo}<br />
                  {b.arbolesControlados} árb. · <span className="text-red-600">{b.arbolesConDano} con daño</span>
                </div>
              )) : <p className="text-xs text-gray-400">Sin datos</p>}
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">🍑 Monitoreo frutos</h3>
              {selected.frutos?.length ? selected.frutos.slice(0, 3).map((f) => (
                <div key={f.id} className="text-xs bg-amber-50 rounded-lg p-2 mb-1">
                  {new Date(f.fecha).toLocaleDateString("es-UY")} · {f.objetivo}<br />
                  {f.frutosControlados} frutos controlados
                </div>
              )) : <p className="text-xs text-gray-400">Sin datos</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
