"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BuscadorProducto from "@/components/BuscadorProducto";

type Producto = { id: string; nombre: string; principioActivo: string; tipoProducto: string; carencia: number };
type Cuadro = { id: string; nombre: string; variedad: string; especie: string; predio: { nombre: string } };
type Aplicacion = {
  id: string;
  fecha: string;
  volumenCaldo: number;
  temperatura?: number;
  viento?: number;
  humedad?: number;
  observaciones?: string;
  cuadro: { nombre: string; variedad: string; predio: { nombre: string } };
  tecnico: { name: string };
  productos: Array<{ producto: Producto; dosis: number; unidadDosis: string }>;
};

type ClimaActual = { temperatura: number; humedad: number; viento: number };

async function fetchClimaActual(): Promise<ClimaActual | null> {
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-34.776&longitude=-56.048&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=America%2FMontevideo");
    const data = await res.json();
    return { temperatura: data.current.temperature_2m, humedad: data.current.relative_humidity_2m, viento: data.current.wind_speed_10m };
  } catch { return null; }
}

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
  const [cargandoClima, setCargandoClima] = useState(false);

  // Form state
  const [cuadrosSeleccionados, setCuadrosSeleccionados] = useState<string[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [volumenCaldo, setVolumenCaldo] = useState("");
  const [clima, setClima] = useState<ClimaActual | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [productosForm, setProductosForm] = useState([
    { productoId: "", dosis: "", unidadDosis: "cc/L" },
  ]);

  const load = useCallback(async () => {
    // Cargar usuario primero por separado para que no falle con los otros fetches
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((usr) => { if (usr?.role) setUser(usr); })
      .catch(() => {});

    Promise.all([
      fetch("/api/aplicaciones").then((r) => r.json()).catch(() => []),
      fetch("/api/cuadros").then((r) => r.json()).catch(() => []),
      fetch("/api/productos").then((r) => r.json()).catch(() => []),
    ]).then(([apl, cua, pro]) => {
      if (Array.isArray(apl)) setAplicaciones(apl);
      if (Array.isArray(cua)) setCuadros(cua);
      if (Array.isArray(pro)) setProductos(pro);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleCuadro(id: string) {
    setCuadrosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function obtenerClima() {
    setCargandoClima(true);
    const c = await fetchClimaActual();
    setClima(c);
    setCargandoClima(false);
  }

  function resetForm() {
    setCuadrosSeleccionados([]);
    setFecha(new Date().toISOString().split("T")[0]);
    setVolumenCaldo("");
    setClima(null);
    setObservaciones("");
    setProductosForm([{ productoId: "", dosis: "", unidadDosis: "cc/L" }]);
    setError(""); setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cuadrosSeleccionados.length) { setError("Seleccioná al menos un cuadro"); return; }
    if (!productosForm.some((p) => p.productoId)) { setError("Agregá al menos un producto"); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/aplicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuadroIds: cuadrosSeleccionados,
        fecha,
        volumenCaldo: parseFloat(volumenCaldo) || 0,
        temperatura: clima?.temperatura ?? null,
        viento: clima?.viento ?? null,
        humedad: clima?.humedad ?? null,
        observaciones: observaciones || null,
        productos: productosForm
          .filter((p) => p.productoId && p.dosis)
          .map((p) => ({
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

  // Mostrar el botón apenas la página carga — el API valida permisos
  const canRegister = !user || user?.role === "tecnico" || user?.role === "productor";

  // Agrupar cuadros por establecimiento
  const cuadrosPorEstab: Record<string, { estab: string; cuadros: Cuadro[] }> = {};
  cuadros.forEach((c) => {
    const key = c.predio.nombre;
    if (!cuadrosPorEstab[key]) cuadrosPorEstab[key] = { estab: key, cuadros: [] };
    cuadrosPorEstab[key].cuadros.push(c);
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">💊 Aplicaciones fitosanitarias</h1>
        {canRegister && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm shadow-sm">
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
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-1">
                1️⃣ ¿En qué cuadros se aplicó?
              </h3>
              <p className="text-sm text-gray-400 mb-3">Podés seleccionar uno o varios cuadros a la vez</p>

              {cuadros.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay cuadros registrados. Primero agregá cuadros en el Mapa.</p>
              ) : (
                <div className="space-y-3">
                  {Object.values(cuadrosPorEstab).map(({ estab, cuadros: cs }) => (
                    <div key={estab}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{estab}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cs.map((c) => {
                          const sel = cuadrosSeleccionados.includes(c.id);
                          return (
                            <button key={c.id} type="button" onClick={() => toggleCuadro(c.id)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                sel ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-300"
                              }`}>
                              <span className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm ${
                                sel ? "border-purple-500 bg-purple-500" : "border-gray-300"
                              }`}>
                                {sel ? "✓" : ""}
                              </span>
                              <div>
                                <p className={`font-semibold text-sm ${sel ? "text-purple-700" : "text-gray-800"}`}>{c.nombre}</p>
                                <p className="text-xs text-gray-400 capitalize">{c.variedad} · {c.especie}</p>
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
                <p className="text-sm text-purple-600 font-semibold mt-3">
                  ✓ {cuadrosSeleccionados.length} cuadro{cuadrosSeleccionados.length > 1 ? "s" : ""} seleccionado{cuadrosSeleccionados.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* PASO 2: Productos */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-700">2️⃣ Productos aplicados</h3>
                  <p className="text-sm text-gray-400">Podés agregar todos los productos que se usaron</p>
                </div>
                <button type="button"
                  onClick={() => setProductosForm([...productosForm, { productoId: "", dosis: "", unidadDosis: "cc/L" }])}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg font-medium">
                  + Agregar producto
                </button>
              </div>

              {productos.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay productos cargados aún.</p>
              ) : (
                <div className="space-y-2">
                  {productosForm.map((prod, idx) => (
                    <div key={idx} className="flex gap-2 items-end bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Producto {idx + 1} — escribí para buscar</label>
                        <BuscadorProducto
                          productos={productos}
                          value={prod.productoId}
                          onChange={(id) => { const u = [...productosForm]; u[idx].productoId = id; setProductosForm(u); }}
                          placeholder="Ej: Mancozeb, Captan, Coragen..."
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">Dosis</label>
                        <input type="number" step="0.01" placeholder="0" value={prod.dosis}
                          onChange={(e) => { const u = [...productosForm]; u[idx].dosis = e.target.value; setProductosForm(u); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                        <select value={prod.unidadDosis}
                          onChange={(e) => { const u = [...productosForm]; u[idx].unidadDosis = e.target.value; setProductosForm(u); }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option>cc/L</option>
                          <option>kg/ha</option>
                          <option>L/ha</option>
                          <option>g/hL</option>
                        </select>
                      </div>
                      {productosForm.length > 1 && (
                        <button type="button"
                          onClick={() => setProductosForm(productosForm.filter((_, i) => i !== idx))}
                          className="pb-1 text-red-400 hover:text-red-600 text-2xl font-light">×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PASO 3: Fecha, volumen y clima */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3">3️⃣ Fecha y condiciones</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de aplicación *</label>
                  <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Volumen de caldo (L/ha)</label>
                  <input type="number" step="0.1" placeholder="Ej: 500" value={volumenCaldo}
                    onChange={(e) => setVolumenCaldo(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              {/* Clima — ya visible arriba, mostrar resumen si está cargado */}
              {clima && (
                <div className="flex gap-4 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sm">
                  <span>🌡️ <strong>{clima.temperatura}°C</strong></span>
                  <span>💦 <strong>{clima.humedad}%</strong></span>
                  <span>💨 <strong>{clima.viento} km/h</strong></span>
                  <span className="text-sky-500 text-xs">(se va a guardar con la aplicación)</span>
                </div>
              )}

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Observaciones</label>
                <input placeholder="Ej: aplicación preventiva post lluvia" value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">{error}</div>}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting || !cuadrosSeleccionados.length}
                className="flex-1 md:flex-none px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl text-base shadow-sm">
                {submitting
                  ? "Guardando..."
                  : cuadrosSeleccionados.length > 1
                  ? `💾 Guardar en ${cuadrosSeleccionados.length} cuadros`
                  : "💾 Guardar aplicación"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {aplicaciones.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-6xl mb-3">💊</div>
            <p className="font-semibold text-gray-500 text-lg">Sin aplicaciones registradas</p>
            {canRegister && <p className="text-sm text-gray-400 mt-1">Usá el botón de arriba para registrar la primera</p>}
          </div>
        ) : (
          aplicaciones.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {a.cuadro.predio.nombre} — <span className="text-purple-700">{a.cuadro.nombre}</span>
                  </h3>
                  <p className="text-sm text-gray-400 capitalize">{a.cuadro.variedad}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-semibold text-gray-800 text-sm">
                    {new Date(a.fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <p className="text-xs text-gray-400">{a.tecnico.name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {a.productos.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full font-medium">
                    {p.producto.nombre} — {p.dosis} {p.unidadDosis}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                {a.volumenCaldo > 0 && <span>💧 {a.volumenCaldo} L/ha</span>}
                {a.temperatura != null && <span>🌡️ {a.temperatura}°C</span>}
                {a.humedad != null && <span>💦 {a.humedad}%</span>}
                {a.viento != null && <span>💨 {a.viento} km/h</span>}
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
