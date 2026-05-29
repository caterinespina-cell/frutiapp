"use client";

import { useEffect, useState, useCallback } from "react";

type Producto = { id: string; nombre: string; principioActivo: string; tipoProducto: string; carencia: number };

const TIPOS = ["Insecticida", "Fungicida", "Acaricida", "Herbicida", "Bactericida", "Regulador de crecimiento"];

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState("");
  const [principioActivo, setPrincipioActivo] = useState("");
  const [tipoProducto, setTipoProducto] = useState("Insecticida");
  const [carencia, setCarencia] = useState("");

  const load = useCallback(async () => {
    const data = await fetch("/api/productos").then((r) => r.json());
    if (Array.isArray(data)) setProductos(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, principioActivo, tipoProducto, carencia: parseInt(carencia) }),
    });
    setNombre(""); setPrincipioActivo(""); setTipoProducto("Insecticida"); setCarencia("");
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  const colorByTipo: Record<string, string> = {
    Insecticida: "bg-red-100 text-red-700",
    Fungicida: "bg-blue-100 text-blue-700",
    Acaricida: "bg-orange-100 text-orange-700",
    Herbicida: "bg-yellow-100 text-yellow-700",
    Bactericida: "bg-teal-100 text-teal-700",
    "Regulador de crecimiento": "bg-pink-100 text-pink-700",
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🧪 Productos fitosanitarios</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
        >
          + Nuevo producto
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Agregar producto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principio activo *</label>
              <input required value={principioActivo} onChange={(e) => setPrincipioActivo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={tipoProducto} onChange={(e) => setTipoProducto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período de carencia (días) *</label>
              <input required type="number" min="0" value={carencia} onChange={(e) => setCarencia(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50">
                {submitting ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {productos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{p.nombre}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorByTipo[p.tipoProducto] ?? "bg-gray-100 text-gray-700"}`}>
                {p.tipoProducto}
              </span>
            </div>
            <p className="text-sm text-gray-500">{p.principioActivo}</p>
            <p className="text-xs text-gray-400 mt-1">
              ⏱️ Carencia: <strong>{p.carencia} días</strong>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
