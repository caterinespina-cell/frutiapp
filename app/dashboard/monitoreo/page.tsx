"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Trampa = { id: string; numero: string; tipo: string; lat: number; lng: number; cuadro: { id: string; nombre: string } };
type Cuadro = { id: string; nombre: string; variedad: string; especie: string; marcadoMonitoreo: boolean };
type Visita = {
  id: string;
  fecha: string;
  monitoreador: { name: string };
  observacionesGenerales?: string;
  lecturasTrampa: Array<{ trampa: { numero: string; cuadro: { nombre: string } }; actividad: string; cantidadPlagas: number; observaciones?: string }>;
  brotes: Array<{ cuadro: { nombre: string; variedad: string }; objetivo: string; arbolesControlados: number; arbolesConDano: number; brotesConDanoNuevo: number; brotesConDanoViejo: number }>;
  frutos: Array<{ cuadro: { nombre: string; variedad: string }; objetivo: string; frutosControlados: number; danoNuevoVivo: number; danoNuevoDano: number; danoViejoMuerto: number; danoViejoDano: number }>;
};

type LecturaTrampaForm = { trampaId: string; actividad: string; cantidadPlagas: string; observaciones: string };
type BroteForm = { cuadroId: string; objetivo: string; arbolesControlados: string; arbolesConDano: string; brotesConDanoNuevo: string; brotesConDanoViejo: string; observaciones: string };
type FrutoForm = { cuadroId: string; objetivo: string; frutosControlados: string; danoNuevoVivo: string; danoNuevoDano: string; danoViejoMuerto: string; danoViejoDano: string; observaciones: string };

const OBJETIVOS = ["Grafolita", "Mosca de la fruta", "Pulgón", "Cochinilla", "Arañuela", "Trips", "Otro"];
const ESPECIES_BROTES = ["durazno", "nectarino", "ciruela", "damasco"];

function MonitoreoContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cuadros, setCuadros] = useState<Cuadro[]>([]);
  const [trampas, setTrampas] = useState<Trampa[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get("nueva") === "1");
  const [activeTab, setActiveTab] = useState<"trampas" | "brotes" | "frutos">("trampas");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [obsGenerales, setObsGenerales] = useState("");
  const [lecturas, setLecturas] = useState<LecturaTrampaForm[]>([
    { trampaId: "", actividad: "", cantidadPlagas: "0", observaciones: "" },
  ]);
  const [brotes, setBrotes] = useState<BroteForm[]>([
    { cuadroId: "", objetivo: "Grafolita", arbolesControlados: "", arbolesConDano: "", brotesConDanoNuevo: "", brotesConDanoViejo: "", observaciones: "" },
  ]);
  const [frutos, setFrutos] = useState<FrutoForm[]>([
    { cuadroId: "", objetivo: "Grafolita", frutosControlados: "", danoNuevoVivo: "0", danoNuevoDano: "0", danoViejoMuerto: "0", danoViejoDano: "0", observaciones: "" },
  ]);

  const load = useCallback(async () => {
    const [vis, cua, usr] = await Promise.all([
      fetch("/api/monitoreo/visitas").then((r) => r.json()),
      fetch("/api/cuadros").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    if (Array.isArray(vis)) setVisitas(vis);
    if (Array.isArray(cua)) {
      setCuadros(cua);
      // Extract trampas from cuadros
      const allTrampas: Trampa[] = [];
      cua.forEach((c: Cuadro & { trampas?: Trampa[] }) => {
        if (c.trampas) c.trampas.forEach((t) => allTrampas.push({ ...t, cuadro: { id: c.id, nombre: c.nombre } }));
      });
      setTrampas(allTrampas);
    }
    setUser(usr);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body = {
      fecha,
      observacionesGenerales: obsGenerales || null,
      lecturasTrampa: lecturas.filter((l) => l.trampaId).map((l) => ({
        trampaId: l.trampaId,
        actividad: l.actividad,
        cantidadPlagas: parseInt(l.cantidadPlagas) || 0,
        observaciones: l.observaciones || null,
      })),
      brotes: brotes.filter((b) => b.cuadroId).map((b) => ({
        cuadroId: b.cuadroId,
        objetivo: b.objetivo,
        arbolesControlados: parseInt(b.arbolesControlados) || 0,
        arbolesConDano: parseInt(b.arbolesConDano) || 0,
        brotesConDanoNuevo: parseInt(b.brotesConDanoNuevo) || 0,
        brotesConDanoViejo: parseInt(b.brotesConDanoViejo) || 0,
        observaciones: b.observaciones || null,
      })),
      frutos: frutos.filter((f) => f.cuadroId).map((f) => ({
        cuadroId: f.cuadroId,
        objetivo: f.objetivo,
        frutosControlados: parseInt(f.frutosControlados) || 0,
        danoNuevoVivo: parseInt(f.danoNuevoVivo) || 0,
        danoNuevoDano: parseInt(f.danoNuevoDano) || 0,
        danoViejoMuerto: parseInt(f.danoViejoMuerto) || 0,
        danoViejoDano: parseInt(f.danoViejoDano) || 0,
        observaciones: f.observaciones || null,
      })),
    };

    const res = await fetch("/api/monitoreo/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    } else {
      setShowForm(false);
      load();
    }
    setSubmitting(false);
  }

  const cuadrosBrotes = cuadros.filter((c) => ESPECIES_BROTES.includes(c.especie) && c.marcadoMonitoreo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🔍 Monitoreo</h1>
        {user?.role === "monitoreador" && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
          >
            + Nueva visita
          </button>
        )}
      </div>

      {/* Formulario de nueva visita */}
      {showForm && user?.role === "monitoreador" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar visita de monitoreo</h2>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de visita *</label>
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones generales</label>
              <input value={obsGenerales} onChange={(e) => setObsGenerales(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 mb-4">
            {(["trampas", "brotes", "frutos"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "trampas" ? "🪤 Trampas" : tab === "brotes" ? "🌿 Brotes" : "🍑 Frutos"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* TRAMPAS */}
            {activeTab === "trampas" && (
              <div className="space-y-3">
                <div className="text-sm text-gray-500 mb-2">
                  Cuadro / Variedad / Nro. de trampa — Fecha — Actividad — Cantidad de plagas
                </div>
                {lecturas.map((lec, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-gray-50 rounded-lg p-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Trampa</label>
                      <select value={lec.trampaId} onChange={(e) => {
                        const updated = [...lecturas]; updated[idx].trampaId = e.target.value; setLecturas(updated);
                      }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                        <option value="">Seleccionar...</option>
                        {trampas.map((t) => (
                          <option key={t.id} value={t.id}>{t.cuadro.nombre} / {t.numero} ({t.tipo})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Actividad *</label>
                      <input value={lec.actividad} onChange={(e) => {
                        const updated = [...lecturas]; updated[idx].actividad = e.target.value; setLecturas(updated);
                      }} placeholder="Ej: Revisión semanal" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cantidad de plagas</label>
                      <input type="number" min="0" value={lec.cantidadPlagas} onChange={(e) => {
                        const updated = [...lecturas]; updated[idx].cantidadPlagas = e.target.value; setLecturas(updated);
                      }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Observaciones</label>
                        <input value={lec.observaciones} onChange={(e) => {
                          const updated = [...lecturas]; updated[idx].observaciones = e.target.value; setLecturas(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      {lecturas.length > 1 && (
                        <button type="button" onClick={() => setLecturas(lecturas.filter((_, i) => i !== idx))}
                          className="mt-4 text-red-400 hover:text-red-600 px-1">×</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setLecturas([...lecturas, { trampaId: "", actividad: "", cantidadPlagas: "0", observaciones: "" }])}
                  className="text-sm text-emerald-600 hover:text-emerald-800">+ Agregar trampa</button>
              </div>
            )}

            {/* BROTES */}
            {activeTab === "brotes" && (
              <div className="space-y-3">
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Solo cuadros de Duraznos, Nectarinos, Ciruelas y Damascos marcados para monitoreo.
                </div>
                {brotes.map((brote, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cuadro / Variedad *</label>
                        <select value={brote.cuadroId} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].cuadroId = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                          <option value="">Seleccionar...</option>
                          {cuadrosBrotes.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.variedad}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Objetivo *</label>
                        <select value={brote.objetivo} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].objetivo = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                          {OBJETIVOS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Árboles controlados *</label>
                        <input type="number" min="0" value={brote.arbolesControlados} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].arbolesControlados = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Árboles con daño *</label>
                        <input type="number" min="0" value={brote.arbolesConDano} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].arbolesConDano = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Brotes daño nuevo *</label>
                        <input type="number" min="0" value={brote.brotesConDanoNuevo} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].brotesConDanoNuevo = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Brotes daño viejo *</label>
                        <input type="number" min="0" value={brote.brotesConDanoViejo} onChange={(e) => {
                          const updated = [...brotes]; updated[idx].brotesConDanoViejo = e.target.value; setBrotes(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <input value={brote.observaciones} onChange={(e) => {
                        const updated = [...brotes]; updated[idx].observaciones = e.target.value; setBrotes(updated);
                      }} placeholder="Observaciones..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      {brotes.length > 1 && (
                        <button type="button" onClick={() => setBrotes(brotes.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 px-2">×</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setBrotes([...brotes, { cuadroId: "", objetivo: "Grafolita", arbolesControlados: "", arbolesConDano: "", brotesConDanoNuevo: "", brotesConDanoViejo: "", observaciones: "" }])}
                  className="text-sm text-emerald-600 hover:text-emerald-800">+ Agregar cuadro</button>
              </div>
            )}

            {/* FRUTOS */}
            {activeTab === "frutos" && (
              <div className="space-y-3">
                {frutos.map((fruto, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cuadro / Variedad *</label>
                        <select value={fruto.cuadroId} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].cuadroId = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                          <option value="">Seleccionar...</option>
                          {cuadros.filter(c => c.marcadoMonitoreo).map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.variedad}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Objetivo *</label>
                        <select value={fruto.objetivo} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].objetivo = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                          {OBJETIVOS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Frutos controlados *</label>
                        <input type="number" min="0" value={fruto.frutosControlados} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].frutosControlados = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">D.nuevo Vivo</label>
                        <input type="number" min="0" value={fruto.danoNuevoVivo} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].danoNuevoVivo = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">D.nuevo Daño</label>
                        <input type="number" min="0" value={fruto.danoNuevoDano} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].danoNuevoDano = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">D.viejo Muerto</label>
                        <input type="number" min="0" value={fruto.danoViejoMuerto} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].danoViejoMuerto = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">D.viejo Daño</label>
                        <input type="number" min="0" value={fruto.danoViejoDano} onChange={(e) => {
                          const updated = [...frutos]; updated[idx].danoViejoDano = e.target.value; setFrutos(updated);
                        }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <input value={fruto.observaciones} onChange={(e) => {
                        const updated = [...frutos]; updated[idx].observaciones = e.target.value; setFrutos(updated);
                      }} placeholder="Observaciones..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      {frutos.length > 1 && (
                        <button type="button" onClick={() => setFrutos(frutos.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 px-2">×</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setFrutos([...frutos, { cuadroId: "", objetivo: "Grafolita", frutosControlados: "", danoNuevoVivo: "0", danoNuevoDano: "0", danoViejoMuerto: "0", danoViejoDano: "0", observaciones: "" }])}
                  className="text-sm text-emerald-600 hover:text-emerald-800">+ Agregar cuadro</button>
              </div>
            )}

            {error && <div className="mt-3 bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg">
                {submitting ? "Guardando..." : "Guardar visita"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de visitas */}
      <div className="space-y-4">
        {visitas.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
            No hay visitas de monitoreo registradas
          </div>
        ) : (
          visitas.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Visita — {new Date(v.fecha).toLocaleDateString("es-UY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </h3>
                  <p className="text-sm text-gray-500">👤 {v.monitoreador.name}</p>
                  {v.observacionesGenerales && <p className="text-sm text-gray-600 mt-1 italic">{v.observacionesGenerales}</p>}
                </div>
                <div className="flex gap-2 text-xs">
                  {v.lecturasTrampa.length > 0 && <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full">🪤 {v.lecturasTrampa.length} trampas</span>}
                  {v.brotes.length > 0 && <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">🌿 {v.brotes.length} brotes</span>}
                  {v.frutos.length > 0 && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full">🍑 {v.frutos.length} frutos</span>}
                </div>
              </div>

              {/* Lecturas trampas */}
              {v.lecturasTrampa.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trampas</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b">
                          <th className="pb-1 pr-4">Cuadro / Trampa</th>
                          <th className="pb-1 pr-4">Actividad</th>
                          <th className="pb-1 pr-4">Cant. plagas</th>
                          <th className="pb-1">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.lecturasTrampa.map((l, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 pr-4">{l.trampa.cuadro.nombre} / {l.trampa.numero}</td>
                            <td className="py-1 pr-4">{l.actividad}</td>
                            <td className="py-1 pr-4 font-medium">{l.cantidadPlagas}</td>
                            <td className="py-1 text-gray-500">{l.observaciones ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Brotes */}
              {v.brotes.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Monitoreo de brotes</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b">
                          <th className="pb-1 pr-3">Cuadro</th>
                          <th className="pb-1 pr-3">Objetivo</th>
                          <th className="pb-1 pr-3">Árb. ctrl.</th>
                          <th className="pb-1 pr-3">Árb. daño</th>
                          <th className="pb-1 pr-3">Br. nuevo</th>
                          <th className="pb-1">Br. viejo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.brotes.map((b, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 pr-3">{b.cuadro.nombre} / {b.cuadro.variedad}</td>
                            <td className="py-1 pr-3">{b.objetivo}</td>
                            <td className="py-1 pr-3">{b.arbolesControlados}</td>
                            <td className="py-1 pr-3 text-red-600 font-medium">{b.arbolesConDano}</td>
                            <td className="py-1 pr-3 text-orange-600 font-medium">{b.brotesConDanoNuevo}</td>
                            <td className="py-1 text-yellow-600 font-medium">{b.brotesConDanoViejo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Frutos */}
              {v.frutos.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Monitoreo de frutos</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b">
                          <th className="pb-1 pr-3">Cuadro</th>
                          <th className="pb-1 pr-3">Objetivo</th>
                          <th className="pb-1 pr-3">Frutos ctrl.</th>
                          <th className="pb-1 pr-3">D.nuevo Vivo</th>
                          <th className="pb-1 pr-3">D.nuevo Daño</th>
                          <th className="pb-1 pr-3">D.viejo Muerto</th>
                          <th className="pb-1">D.viejo Daño</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.frutos.map((f, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 pr-3">{f.cuadro.nombre} / {f.cuadro.variedad}</td>
                            <td className="py-1 pr-3">{f.objetivo}</td>
                            <td className="py-1 pr-3">{f.frutosControlados}</td>
                            <td className="py-1 pr-3">{f.danoNuevoVivo}</td>
                            <td className="py-1 pr-3 text-orange-600 font-medium">{f.danoNuevoDano}</td>
                            <td className="py-1 pr-3">{f.danoViejoMuerto}</td>
                            <td className="py-1 text-yellow-600 font-medium">{f.danoViejoDano}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MonitoreoPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Cargando...</div>}>
      <MonitoreoContent />
    </Suspense>
  );
}
