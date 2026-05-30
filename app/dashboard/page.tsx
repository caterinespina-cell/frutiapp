"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { name: string; role: string };
type ClimaActual = { temperatura: number; humedad: number; viento: number; descripcion: string };
type DiaPronos = { fecha: string; lluvia: number; probLluvia: number; weatherCode: number };
type RegistroClima = { id: string; fecha: string; precipitacion?: number; granizo: boolean; vientoFuerte: boolean; helada: boolean; observaciones?: string; user: { name: string } };

const WEATHER_DESC: Record<number, string> = {
  0: "☀️ Despejado", 1: "🌤️ Despejado", 2: "⛅ Parcial. nublado",
  3: "☁️ Nublado", 45: "🌫️ Niebla", 48: "🌫️ Niebla",
  51: "🌦️ Llovizna", 53: "🌦️ Llovizna", 55: "🌧️ Lluvia leve",
  61: "🌧️ Lluvia leve", 63: "🌧️ Lluvia", 65: "🌧️ Lluvia fuerte",
  80: "🌦️ Chubascos", 81: "🌧️ Chubascos", 95: "⛈️ Tormenta",
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ cuadros: 0, aplicaciones: 0, visitas: 0 });
  const [clima, setClima] = useState<ClimaActual | null>(null);
  const [pronostico, setPronostico] = useState<DiaPronos[]>([]);
  const [registros, setRegistros] = useState<RegistroClima[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [fechaReg, setFechaReg] = useState(new Date().toISOString().split("T")[0]);
  const [precipitacion, setPrecipitacion] = useState("");
  const [granizo, setGranizo] = useState(false);
  const [vientoFuerte, setVientoFuerte] = useState(false);
  const [helada, setHelada] = useState(false);
  const [obs, setObs] = useState("");

  const loadRegistros = () =>
    fetch("/api/clima").then((r) => r.json()).then((d) => Array.isArray(d) && setRegistros(d));

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser);

    Promise.all([
      fetch("/api/cuadros").then((r) => r.json()).catch(() => []),
      fetch("/api/aplicaciones").then((r) => r.json()).catch(() => []),
      fetch("/api/monitoreo/visitas").then((r) => r.json()).catch(() => []),
    ]).then(([c, a, v]) => setStats({
      cuadros: Array.isArray(c) ? c.length : 0,
      aplicaciones: Array.isArray(a) ? a.length : 0,
      visitas: Array.isArray(v) ? v.length : 0,
    }));

    // Clima + pronóstico 7 días
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-34.776&longitude=-56.048&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=precipitation_sum,precipitation_probability_max,weather_code&timezone=America%2FMontevideo&forecast_days=7")
      .then((r) => r.json())
      .then((data) => {
        setClima({
          temperatura: data.current.temperature_2m,
          humedad: data.current.relative_humidity_2m,
          viento: data.current.wind_speed_10m,
          descripcion: WEATHER_DESC[data.current.weather_code] ?? "🌤️ Variable",
        });
        setPronostico(data.daily.time.map((fecha: string, i: number) => ({
          fecha,
          lluvia: data.daily.precipitation_sum[i] ?? 0,
          probLluvia: data.daily.precipitation_probability_max[i] ?? 0,
          weatherCode: data.daily.weather_code[i] ?? 0,
        })));
      }).catch(() => {});

    loadRegistros();
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/clima", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: fechaReg, precipitacion, granizo, vientoFuerte, helada, observaciones: obs }),
    });
    setSaving(false);
    setShowForm(false);
    setPrecipitacion(""); setGranizo(false); setVientoFuerte(false); setHelada(false); setObs("");
    loadRegistros();
  }

  if (!user) return <div className="text-gray-400 text-center py-20">Cargando...</div>;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{saludo}, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Cuadros", value: stats.cuadros, icon: "🌳", href: "/dashboard/mapa" },
          { label: "Aplicaciones", value: stats.aplicaciones, icon: "💊", href: "/dashboard/aplicaciones" },
          { label: "Monitoreos", value: stats.visitas, icon: "🔍", href: "/dashboard/monitoreo" },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm p-4 text-center transition-all">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Clima actual + pronóstico */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-md">
        <p className="text-slate-300 text-xs mb-3 font-medium">📍 Melilla, Montevideo — Clima actual</p>

        {/* Ahora */}
        {clima ? (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-sm text-slate-300">{clima.descripcion}</p>
              <p className="text-5xl font-bold mt-1">{clima.temperatura}°C</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{clima.humedad}%</p>
                <p className="text-slate-400 text-xs">Humedad</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{clima.viento}</p>
                <p className="text-slate-400 text-xs">km/h viento</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 animate-pulse mb-4">
            <div className="h-12 w-24 bg-slate-600 rounded-xl" />
            <div className="h-12 w-16 bg-slate-600 rounded-xl" />
          </div>
        )}

        {/* Pronóstico 7 días */}
        {pronostico.length > 0 && (
          <>
            <div className="border-t border-slate-600 pt-3">
              <p className="text-slate-300 text-xs mb-2 font-medium">Pronóstico de lluvia — próximos 7 días</p>
              <div className="grid grid-cols-7 gap-1">
                {pronostico.map((dia, i) => {
                  const fecha = new Date(dia.fecha + "T12:00:00");
                  const tieneRiesgo = dia.probLluvia >= 40;
                  return (
                    <div key={dia.fecha}
                      className={`rounded-xl py-2 px-1 text-center ${tieneRiesgo ? "bg-white/20" : "bg-white/10"}`}>
                      <p className="text-xs font-semibold text-slate-300">
                        {i === 0 ? "Hoy" : DIAS[fecha.getDay()]}
                      </p>
                      <div className="text-base my-0.5">
                        {WEATHER_DESC[dia.weatherCode]?.split(" ")[0] ?? "🌤️"}
                      </div>
                      <p className={`text-xs font-bold ${tieneRiesgo ? "text-yellow-300" : "text-slate-400"}`}>
                        {dia.probLluvia}%
                      </p>
                      {dia.lluvia > 0 && (
                        <p className="text-xs text-blue-300">{dia.lluvia}mm</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Registro de precipitaciones */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">🌧️ Registros climáticos</h2>
            <p className="text-xs text-gray-400">Lluvias, granizo, viento fuerte, heladas</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium">
            {showForm ? "Cancelar" : "＋ Registrar"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={guardar} className="bg-blue-50 rounded-xl p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <input type="date" required value={fechaReg} onChange={(e) => setFechaReg(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Precipitación (mm)</label>
                <input type="number" step="0.1" min="0" placeholder="Ej: 12.5" value={precipitacion}
                  onChange={(e) => setPrecipitacion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "🌨️ Granizo", val: granizo, set: setGranizo },
                { label: "💨 Viento fuerte", val: vientoFuerte, set: setVientoFuerte },
                { label: "🧊 Helada", val: helada, set: setHelada },
              ].map(({ label, val, set }) => (
                <button key={label} type="button" onClick={() => set(!val)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  {label}
                </button>
              ))}
            </div>
            <input placeholder="Observaciones (ej: tormenta intensa, caída de fruta...)" value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="submit" disabled={saving}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
              {saving ? "Guardando..." : "💾 Guardar"}
            </button>
          </form>
        )}

        {registros.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Sin registros aún</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-[44px] text-center">
                  <p className="text-sm font-bold text-gray-700">{new Date(r.fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {r.precipitacion != null && <span className="text-sm font-semibold text-blue-600">💧 {r.precipitacion} mm</span>}
                    {r.granizo && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🌨️ Granizo</span>}
                    {r.vientoFuerte && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">💨 Viento</span>}
                    {r.helada && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">🧊 Helada</span>}
                  </div>
                  {r.observaciones && <p className="text-xs text-gray-400 italic mt-0.5">{r.observaciones}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
