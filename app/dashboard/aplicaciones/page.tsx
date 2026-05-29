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
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [cuadros, setCuadros] = useState<Cuadro[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get("nueva") === "1");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [cuadroId, setCuadroId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [volumenCaldo, setVolumenCaldo] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [viento, setViento] = useState("");
  const [humedad, setHumedad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [productosSeleccionados, setProductosSeleccionados] = useState<
    Array<{ productoId: string; dosis: string; unidadDosis: string }>
  >([{ productoId: "", dosis: "", unidadDosis: "cc/L" }]);

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
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body = {
      cuadroId,
      fecha,
      volumenCaldo: parseFloat(volumenCaldo),
      temperatura: temperatura ? parseFloat(temperatura) : null,
      viento: viento ? parseFloat(viento) : null,
      humedad: humedad ? parseFloat(humedad) : null,
      observaciones: observaciones || null,
      productos: productosSeleccionados
        .filter((p) => p.productoId)
        .map((p) => ({ productoId: p.productoId, dosis: parseFloat(p.dosis), unidadDosis: p.unidadDosis })),
    };

    const res = await fetch("/api/aplicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    } else {
      setShowForm(false);
      setCuadroId(""); setFecha(new Date().toISOString().split("T")[0]);
      setVolumenCaldo(""); setTemperatura(""); setViento(""); setHumedad("");
      setObservaciones(""); setProductosSeleccionados([{ productoId: "", dosis: "", unidadDosis: "cc/L" }]);
      load();
    }
    setSubmitting(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">💊 Aplicaciones fitosanitarias</h1>
        {user?.role === "tecnico" && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
          >
            + Nueva aplicación
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && user?.role === "tecnico" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar aplicación</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuadro *</label>
                <select
                  required
                  value={cuadroId}
                  onChange={(e) => setCuadroId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar cuadro...</option>
                  {cuadros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.establecimiento.nombre} — {c.nombre} ({c.variedad})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volumen de caldo (L/ha) *</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={volumenCaldo}
                  onChange={(e) => setVolumenCaldo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatura}
                  onChange={(e) => setTemperatura(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Viento (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={viento}
                  onChange={(e) => setViento(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Humedad (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={humedad}
                  onChange={(e) => setHumedad(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Productos aplicados *</label>
                <button
                  type="button"
                  onClick={() => setProductosSeleccionados([...productosSeleccionados, { productoId: "", dosis: "", unidadDosis: "cc/L" }])}
                  className="text-sm text-emerald-600 hover:text-emerald-800"
                >
                  + Agregar producto
                </button>
              </div>
              <div className="space-y-2">
                {productosSeleccionados.map((prod, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={prod.productoId}
                      onChange={(e) => {
                        const updated = [...productosSeleccionados];
                        updated[idx].productoId = e.target.value;
                        setProductosSeleccionados(updated);
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Seleccionar producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} — {p.tipoProducto} (carencia {p.carencia}d)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Dosis"
                      value={prod.dosis}
                      onChange={(e) => {
                        const updated = [...productosSeleccionados];
                        updated[idx].dosis = e.target.value;
                        setProductosSeleccionados(updated);
                      }}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <select
                      value={prod.unidadDosis}
                      onChange={(e) => {
                        const updated = [...productosSeleccionados];
                        updated[idx].unidadDosis = e.target.value;
                        setProductosSeleccionados(updated);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>cc/L</option>
                      <option>kg/ha</option>
                      <option>L/ha</option>
                      <option>g/hL</option>
                    </select>
                    {productosSeleccionados.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProductosSeleccionados(productosSeleccionados.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg"
              >
                {submitting ? "Guardando..." : "Guardar aplicación"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {aplicaciones.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
            No hay aplicaciones registradas
          </div>
        ) : (
          aplicaciones.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {a.cuadro.establecimiento.nombre} — {a.cuadro.nombre}
                  </h3>
                  <p className="text-sm text-gray-500">{a.cuadro.variedad}</p>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium text-gray-700">
                    {new Date(a.fecha).toLocaleDateString("es-UY")}
                  </span>
                  <p className="text-gray-400">{a.tecnico.name}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {a.productos.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full">
                    {p.producto.nombre} — {p.dosis} {p.unidadDosis}
                    <span className="text-purple-400">(carencia {p.producto.carencia}d)</span>
                  </span>
                ))}
              </div>

              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>💧 {a.volumenCaldo} L/ha</span>
                {a.temperatura && <span>🌡️ {a.temperatura}°C</span>}
                {a.viento && <span>💨 {a.viento} km/h</span>}
                {a.humedad && <span>💦 {a.humedad}%</span>}
              </div>

              {a.observaciones && (
                <p className="mt-2 text-sm text-gray-600 italic">{a.observaciones}</p>
              )}
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
