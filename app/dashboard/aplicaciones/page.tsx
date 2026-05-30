"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Producto = { id: string; nombre: string; principioActivo: string; tipoProducto: string; carencia: number };
type Cuadro = { id: string; nombre: string; variedad: string; especie: string; establecimiento: { nombre: string } };
type Aplicacion = {
  id: string;
  fecha: string;
  volumenCaldo: number;
  temperatura?: number;
  viento?: number;
  humedad?: number;
  observaciones?: string;
  cuadro: { nombre: string; variedad: string; establecimiento: { nombre: string } };
  tecnico: { name: string };
  productos: Array<{ producto: Producto; dosis: number; unidadDosis: string }>;
};

function AplicacionesContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [cuadros, setCuadros] = useState<Cuadro[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get("nueva") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [cuadrosSeleccionados, setCuadrosSeleccionados] = useState<string[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [volumenCaldo, setVolumenCaldo] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [viento, setViento] = useState("");
  const [humedad, setHumedad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [productosForm, setProductosForm] = useState([
    { productoId: "", dosis: "", unidadDosis: "cc/L" },
  ]);

  const load = useCallback(async () => {
    const [apl, cua, pro, usr] = await Promise.all([
      fetch("/api/aplicaciones").then((r) => r.json()),
      fetch("/api/cuadros").then((r) => r.json()),
      fetch("/api/productos").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    if (Array.isArray(apl)) setAplicaciones(apl);
    if (Array.isArray(cua)) setCuadros(cua);
    if (Array.isArray(pro)) setProductos(pro);
    setUser(usr);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleCuadro(id: string) {
    setCuadrosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function resetForm() {
    setCuadrosSeleccionados([]);
    setFecha(new Date().toISOString().split("T")[0]);
    setVolumenCaldo(""); setTemperatura(""); setViento(""); setHumedad(""); setObservaciones("");
    setProductosForm([{ productoId: "", dosis: "", unidadDosis: "cc/L" }]);
    setError(""); setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cuadrosSeleccionados.length) { setError("Seleccioná al menos un cuadro"); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/aplicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuadroIds: cuadrosSeleccionados,
        fecha,
        volumenCaldo: parseFloat(volumenCaldo),
        temperatura: temperatura ? parseFloat(temperatura) : null,
        viento: viento ? parseFloat(viento) : null,
        humedad: humedad ? parseFloat(humedad) : null,
        observaciones: observaciones || null,
        productos: productosForm.filter((p) => p.productoId).map((p) => ({
          productoId: p.productoId,
          dosis: parseFloat(p.dosis),
          unidadDosis: p.unidadDosis,
        })),
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    } else {
      const n = cuadrosSeleccionados.length;
      setSuccess(`✅ Aplicación guardada en ${n} cuadro${n > 1 ? "s" : ""}`);
      resetForm();
      setShowForm(false);
      load();
    }
    setSubmitting(false);
  }

  const canRegister = user?.role === "tecnico" || user?.role === "productor";

  // Agrupar cuadros por establecimiento
  const cuadrosPorEstab: Record<string, { estab: string; cuadros: Cuadro[] }> = {};
  cuadros.forEach((c) => {
    const key = c.establecimiento.nombre;
    if (!cuadrosPorEstab[key]) cuadrosPorEstab[key] = { estab: key, cuadros: [] };
    cuadrosPorEstab[key].cuadros.push(c);
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">💊 Aplicaciones fitosanitarias</h1>
        {canRegister && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-sm shadow-sm">
            + Nueva aplicación
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl font-medium">
          {success}
        </div>
      )}

      {/* Formulario */}
      {showForm && canRegister && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Registrar aplicación</h2>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* PASO 1: Cuadros */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3">
                1️⃣ ¿En qué cuadros se aplicó?
                <span className="ml-2 text-sm font-normal text-gray-400">(podés seleccionar varios)</span>
              </h3>

              {cuadros.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay cuadros registrados. Primero agregá cuadros en el Mapa.</p>
              ) : (
                <div className="space-y-3">
                  {Object.values(cuadrosPorEstab).map(({ estab, cuadros: cs }) => (
                    <div key={estab}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{estab}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cs.map((c) => {
                          const sel = cuadrosSeleccionados.includes(c.id);
                          return (
                            <button key={c.id} type="button" onClick={() => toggleCuadro(c.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                                sel
                                  ? "border-purple-500 bg-purple-50 text-purple-800"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
                              }`}>
                              <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${sel ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}>
                                {sel && <span className="text-white text-xs font-bold">✓</span>}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{c.nombre}</p>
                                <p className="text-xs text-gray-400 truncate capitalize">{c.variedad} · {c.especie}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cuadrosSeleccionados.length > 0 && (
                <p className="text-sm text-purple-600 font-medium mt-2">
                  ✓ {cuadrosSeleccionados.length} cuadro{cuadrosSeleccionados.length > 1 ? "s" : ""} seleccionado{cuadrosSeleccionados.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* PASO 2: Productos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">2️⃣ ¿Qué productos se aplicaron?</h3>
                <button type="button"
                  onClick={() => setProductosForm([...productosForm, { productoId: "", dosis: "", unidadDosis: "cc/L" }])}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                  + Agregar otro producto
                </button>
              </div>

              {productos.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay productos cargados. El técnico debe cargarlos en "Productos".</p>
              ) : (
                <div className="space-y-2">
                  {productosForm.map((prod, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Producto</label>
                        <select value={prod.productoId}
                          onChange={(e) => { const u = [...productosForm]; u[idx].productoId = e.target.value; setProductosForm(u); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">Seleccionar...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} — {p.tipoProducto} (carencia {p.carencia}d)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">Dosis</label>
                        <input type="number" step="0.01" placeholder="0" value={prod.dosis}
                          onChange={(e) => { const u = [...productosForm]; u[idx].dosis = e.target.value; setProductosForm(u); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                        <select value={prod.unidadDosis}
                          onChange={(e) => { const u = [...productosForm]; u[idx].unidadDosis = e.target.value; setProductosForm(u); }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option>cc/L</option>
                          <option>kg/ha</option>
                          <option>L/ha</option>
                          <option>g/hL</option>
                        </select>
                      </div>
                      {productosForm.length > 1 && (
                        <button type="button" onClick={() => setProductosForm(productosForm.filter((_, i) => i !== idx))}
                          className="mt-6 text-red-400 hover:text-red-600 text-xl px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PASO 3: Condiciones */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3">3️⃣ Fecha y condiciones</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Fecha de aplicación *</label>
                  <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Volumen (L/ha) *</label>
                  <input type="number" required step="0.1" placeholder="500" value={volumenCaldo} onChange={(e) => setVolumenCaldo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Temperatura (°C)</label>
                  <input type="number" step="0.1" placeholder="22" value={temperatura} onChange={(e) => setTemperatura(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Viento (km/h)</label>
                  <input type="number" step="0.1" placeholder="10" value={viento} onChange={(e) => setViento(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Humedad (%)</label>
                  <input type="number" min="0" max="100" placeholder="65" value={humedad} onChange={(e) => setHumedad(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
                  <input placeholder="Ej: aplicación preventiva" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting || !cuadrosSeleccionados.length}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-xl text-base shadow-sm">
                {submitting ? "Guardando..." : `Guardar aplicación${cuadrosSeleccionados.length > 1 ? ` (${cuadrosSeleccionados.length} cuadros)` : ""}`}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de aplicaciones */}
      <div className="space-y-3">
        {aplicaciones.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border">
            <div className="text-5xl mb-3">💊</div>
            <p className="font-medium text-gray-500">No hay aplicaciones registradas</p>
            {canRegister && <p className="text-sm mt-1">Usá el botón "Nueva aplicación" para registrar la primera</p>}
          </div>
        ) : (
          aplicaciones.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-200 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {a.cuadro.establecimiento.nombre} — <span className="text-purple-700">{a.cuadro.nombre}</span>
                  </h3>
                  <p className="text-sm text-gray-400 capitalize">{a.cuadro.variedad}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-800">{new Date(a.fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <p className="text-xs text-gray-400 mt-0.5">por {a.tecnico.name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {a.productos.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                    <strong>{p.producto.nombre}</strong> — {p.dosis} {p.unidadDosis}
                    <span className="text-purple-400 ml-1">carencia {p.producto.carencia}d</span>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                <span>💧 {a.volumenCaldo} L/ha</span>
                {a.temperatura != null && <span>🌡️ {a.temperatura}°C</span>}
                {a.viento != null && <span>💨 {a.viento} km/h</span>}
                {a.humedad != null && <span>💦 {a.humedad}%</span>}
                {a.observaciones && <span className="italic">"{a.observaciones}"</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AplicacionesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Cargando...</div>}>
      <AplicacionesContent />
    </Suspense>
  );
}
