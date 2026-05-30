"use client";

import { useEffect, useState, useCallback } from "react";

type Cuadro = {
  id: string;
  nombre: string;
  especie: string;
  variedad: string;
  superficie: number;
  numeroPlantas?: number;
  anoPlantacion?: number;
  marcadoMonitoreo: boolean;
};

type Predio = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  productor: { name: string };
  cuadros: Cuadro[];
};

const ESPECIES = ["durazno", "nectarino", "ciruela", "damasco", "manzana", "pera", "otro"];
const ESPECIE_EMOJI: Record<string, string> = {
  durazno: "🍑", nectarino: "🍑", ciruela: "🟣", damasco: "🟠",
  manzana: "🍎", pera: "🍐", otro: "🌳",
};

const ANO_ACTUAL = new Date().getFullYear();

export default function PrediosPage() {
  const [predios, setPredios] = useState<Predio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormPredio, setShowFormPredio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showFormCuadro, setShowFormCuadro] = useState<string | null>(null); // predioId
  const [success, setSuccess] = useState("");

  // Form predio
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");

  // Form cuadro
  const [cuadroNombre, setCuadroNombre] = useState("");
  const [cuadroEspecie, setCuadroEspecie] = useState("durazno");
  const [cuadroVariedad, setCuadroVariedad] = useState("");
  const [cuadroPlantas, setCuadroPlantas] = useState("");
  const [cuadroFilas, setCuadroFilas] = useState("");
  const [cuadroPlantas2, setCuadroPlantas2] = useState("");
  const [cuadroAno, setCuadroAno] = useState(String(ANO_ACTUAL));
  const [cuadroMonitoreo, setCuadroMonitoreo] = useState(false);
  const [savingCuadro, setSavingCuadro] = useState(false);

  // Superficie calculada
  const superficieCalc = (() => {
    const n = parseFloat(cuadroPlantas);
    const f = parseFloat(cuadroFilas);
    const p = parseFloat(cuadroPlantas2);
    if (n > 0 && f > 0 && p > 0) return ((n * f * p) / 10000).toFixed(2);
    return null;
  })();

  const load = useCallback(async () => {
    const data = await fetch("/api/establecimientos").then((r) => r.json()).catch(() => []);
    if (Array.isArray(data)) {
      setPredios(data);
      // Auto-expandir si hay solo uno
      if (data.length === 1) setExpandido(data[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function guardarPredio(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/establecimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, nombre, direccion }),
    });
    if (res.ok) {
      const nuevo = await res.json();
      setSuccess(`✅ Predio "${nombre}" creado`);
      setCodigo(""); setNombre(""); setDireccion("");
      setShowFormPredio(false);
      setExpandido(nuevo.id);
      load();
    }
    setSaving(false);
  }

  async function guardarCuadro(predioId: string) {
    if (!cuadroNombre || !superficieCalc) return;
    setSavingCuadro(true);
    await fetch("/api/cuadros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: cuadroNombre,
        especie: cuadroEspecie,
        variedad: cuadroVariedad,
        superficie: parseFloat(superficieCalc),
        numeroPlantas: cuadroPlantas || null,
        distanciaFilas: cuadroFilas || null,
        distanciaPlantas: cuadroPlantas2 || null,
        anoPlantacion: cuadroAno || null,
        marcadoMonitoreo: cuadroMonitoreo,
        establecimientoId: predioId,
        coordenadas: [],
      }),
    });
    setCuadroNombre(""); setCuadroEspecie("durazno"); setCuadroVariedad("");
    setCuadroPlantas(""); setCuadroFilas(""); setCuadroPlantas2("");
    setCuadroAno(String(ANO_ACTUAL)); setCuadroMonitoreo(false);
    setShowFormCuadro(null);
    setSavingCuadro(false);
    load();
  }

  if (loading) return <div className="text-gray-400 text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏡 Predios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Cada predio puede tener múltiples cuadros</p>
        </div>
        <button onClick={() => setShowFormPredio(!showFormPredio)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm">
          {showFormPredio ? "Cancelar" : "+ Nuevo predio"}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* Formulario nuevo predio */}
      {showFormPredio && (
        <form onSubmit={guardarPredio} className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">➕ Nuevo predio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del predio *</label>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: El Duraznal"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código MGAP</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: K28D052 (opcional)"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Cno. Los Horneros 1234, Melilla"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving || !nombre}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded-xl text-sm">
              {saving ? "Guardando..." : "💾 Guardar predio"}
            </button>
          </div>
        </form>
      )}

      {/* Lista vacía */}
      {predios.length === 0 && !showFormPredio && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-3">🏡</div>
          <p className="font-semibold text-gray-500 text-lg">Sin predios registrados</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Empezá agregando el primer predio para poder cargar cuadros</p>
          <button onClick={() => setShowFormPredio(true)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm">
            + Agregar primer predio
          </button>
        </div>
      )}

      {/* Lista de predios */}
      <div className="space-y-4">
        {predios.map((predio) => {
          const abierto = expandido === predio.id;
          const totalHa = predio.cuadros.reduce((s, c) => s + c.superficie, 0);

          return (
            <div key={predio.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header del predio */}
              <button
                onClick={() => setExpandido(abierto ? null : predio.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🏡
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{predio.nombre}</h3>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {predio.codigo && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{predio.codigo}</span>
                      )}
                      {predio.direccion && (
                        <span className="text-xs text-gray-400">📍 {predio.direccion}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">{predio.cuadros.length}</p>
                    <p className="text-xs text-gray-400">cuadro{predio.cuadros.length !== 1 ? "s" : ""}</p>
                  </div>
                  {totalHa > 0 && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-700">{totalHa.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">ha total</p>
                    </div>
                  )}
                  <span className="text-gray-400 text-xl">{abierto ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Cuadros del predio */}
              {abierto && (
                <div className="border-t border-gray-100 px-5 pb-5">
                  <div className="flex items-center justify-between py-3">
                    <p className="text-sm font-semibold text-gray-600">
                      Cuadros ({predio.cuadros.length})
                    </p>
                    <button
                      onClick={() => setShowFormCuadro(showFormCuadro === predio.id ? null : predio.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                      + Agregar cuadro
                    </button>
                  </div>

                  {/* Formulario nuevo cuadro */}
                  {showFormCuadro === predio.id && (
                    <div className="bg-emerald-50 rounded-xl p-4 mb-4 space-y-3">
                      <p className="text-sm font-semibold text-emerald-800">Nuevo cuadro en {predio.nombre}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                          <input value={cuadroNombre} onChange={(e) => setCuadroNombre(e.target.value)}
                            placeholder="Ej: Cuadro Norte"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Especie</label>
                          <select value={cuadroEspecie} onChange={(e) => setCuadroEspecie(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {ESPECIES.map((e) => <option key={e}>{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Variedad</label>
                          <input value={cuadroVariedad} onChange={(e) => setCuadroVariedad(e.target.value)}
                            placeholder="Ej: Flordaprince"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nº plantas</label>
                          <input type="number" value={cuadroPlantas} onChange={(e) => setCuadroPlantas(e.target.value)}
                            placeholder="Ej: 400"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dist. filas (m)</label>
                          <input type="number" step="0.1" value={cuadroFilas} onChange={(e) => setCuadroFilas(e.target.value)}
                            placeholder="Ej: 5"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dist. plantas (m)</label>
                          <input type="number" step="0.1" value={cuadroPlantas2} onChange={(e) => setCuadroPlantas2(e.target.value)}
                            placeholder="Ej: 3"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Año plantación</label>
                          <input type="number" value={cuadroAno} onChange={(e) => setCuadroAno(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id={`mon-${predio.id}`} checked={cuadroMonitoreo}
                            onChange={(e) => setCuadroMonitoreo(e.target.checked)}
                            className="w-4 h-4 text-emerald-600" />
                          <label htmlFor={`mon-${predio.id}`} className="text-xs text-gray-600">Para monitoreo</label>
                        </div>
                        {superficieCalc && (
                          <div className="flex items-center justify-center bg-emerald-100 rounded-xl p-2">
                            <div className="text-center">
                              <p className="text-xl font-bold text-emerald-700">{superficieCalc} ha</p>
                              <p className="text-xs text-emerald-600">superficie calculada</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => guardarCuadro(predio.id)}
                          disabled={savingCuadro || !cuadroNombre || !superficieCalc}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded-xl text-sm">
                          {savingCuadro ? "Guardando..." : "💾 Guardar cuadro"}
                        </button>
                        <button onClick={() => setShowFormCuadro(null)}
                          className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-xl text-sm">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de cuadros */}
                  {predio.cuadros.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Sin cuadros — hacé click en "+ Agregar cuadro"
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {predio.cuadros.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-2xl">{ESPECIE_EMOJI[c.especie] ?? "🌳"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{c.nombre}</p>
                            <p className="text-xs text-gray-500 capitalize">{c.variedad} · {c.especie}</p>
                            <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                              <span>{c.superficie} ha</span>
                              {c.numeroPlantas && <span>· {c.numeroPlantas} plantas</span>}
                              {c.anoPlantacion && <span>· {c.anoPlantacion}</span>}
                            </div>
                          </div>
                          {c.marcadoMonitoreo && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">
                              Monit.
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
