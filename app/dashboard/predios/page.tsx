"use client";

import { useEffect, useState, useCallback } from "react";

type Predio = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  productor: { name: string };
  cuadros: Array<{ id: string; nombre: string; especie: string; superficie: number }>;
};

export default function PrediosPage() {
  const [predios, setPredios] = useState<Predio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Form
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");

  const load = useCallback(async () => {
    const data = await fetch("/api/establecimientos").then((r) => r.json()).catch(() => []);
    if (Array.isArray(data)) setPredios(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/establecimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, nombre, direccion }),
    });
    if (res.ok) {
      setSuccess("✅ Predio creado correctamente");
      setCodigo(""); setNombre(""); setDireccion("");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏡 Predios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestioná los predios productores</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm">
          {showForm ? "Cancelar" : "+ Nuevo predio"}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Formulario nuevo predio */}
      {showForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Nuevo predio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código del predio</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: K28D052"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <p className="text-xs text-gray-400 mt-1">Código del MGAP o identificador propio</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del predio *</label>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: El Duraznal"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Cno. Los Horneros 1234, Melilla, Montevideo"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !nombre}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded-xl text-sm">
              {saving ? "Guardando..." : "💾 Guardar predio"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de predios */}
      {predios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-3">🏡</div>
          <p className="font-semibold text-gray-500 text-lg">Sin predios registrados</p>
          <p className="text-sm text-gray-400 mt-1">Agregá el primer predio para poder crear cuadros</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm">
            + Agregar primer predio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {predios.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{p.nombre}</h3>
                  {p.codigo && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.codigo}</span>}
                  {p.direccion && <p className="text-sm text-gray-500 mt-1">📍 {p.direccion}</p>}
                  <p className="text-xs text-gray-400 mt-1">Productor: {p.productor.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{p.cuadros.length}</p>
                  <p className="text-xs text-gray-400">cuadros</p>
                </div>
              </div>
              {p.cuadros.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                  {p.cuadros.map((c) => (
                    <span key={c.id} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      {c.nombre} · {c.especie} · {c.superficie} ha
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
