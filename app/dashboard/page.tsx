"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { name: string; role: string };

const ROL_LABEL: Record<string, string> = {
  productor: "Productor",
  tecnico: "Técnico",
  monitoreador: "Monitoreador",
};

const ROL_COLOR: Record<string, string> = {
  productor: "bg-blue-100 text-blue-800",
  tecnico: "bg-purple-100 text-purple-800",
  monitoreador: "bg-amber-100 text-amber-800",
};

type ClimaActual = { temperatura: number; humedad: number; viento: number; descripcion: string };
type DiaPronos = { fecha: string; lluvia: number; probLluvia: number; weatherCode: number };
type RegistroClima = { id: string; fecha: string; precipitacion?: number; granizo: boolean; vientoFuerte: boolean; helada: boolean; observaciones?: string; user: { name: string } };

const WEATHER_DESC: Record<number, string> = {
  0: "☀️ Despejado", 1: "🌤️ Despejado", 2: "⛅ Parcialmente nublado",
  3: "☁️ Nublado", 45: "🌫️ Niebla", 48: "🌫️ Niebla",
  51: "🌦️ Llovizna", 53: "🌦️ Llovizna", 55: "🌧️ Lluvia leve",
  61: "🌧️ Lluvia leve", 63: "🌧️ Lluvia", 65: "🌧️ Lluvia intensa",
  71: "🌨️ Nieve", 80: "🌦️ Chubascos", 81: "🌧️ Chubascos", 95: "⛈️ Tormenta",
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ cuadros: 0, aplicaciones: 0, visitas: 0 });
  const [clima, setClima] = useState<ClimaActual | null>(null);
  const [pronostico, setPronostico] = useState<DiaPronos[]>([]);
  const [registros, setRegistros] = useState<RegistroClima[]>([]);
  const [showFormClima, setShowFormClima] = useState(false);
  const [savingClima, setSavingClima] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form registro
  const [fechaReg, setFechaReg] = useState(new Date().toISOString().split("T")[0]);
  const [precipitacion, setPrecipitacion] = useState("");
  const [granizo, setGranizo] = useState(false);
  const [vientoFuerte, setVientoFuerte] = useState(false);
  const [helada, setHelada] = useState(false);
  const [obsClima, setObsClima] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser);

    Promise.all([
      fetch("/api/cuadros").then((r) => r.json()),
      fetch("/api/aplicaciones").then((r) => r.json()),
      fetch("/api/monitoreo/visitas").then((r) => r.json()),
    ]).then(([c, a, v]) => setStats({
      cuadros: Array.isArray(c) ? c.length : 0,
      aplicaciones: Array.isArray(a) ? a.length : 0,
      visitas: Array.isArray(v) ? v.length : 0,
    }));

    // Clima actual + pronóstico 7 días
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-34.776&longitude=-56.048&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=precipitation_sum,precipitation_probability_max,weather_code&timezone=America%2FMontevideo&forecast_days=7")
      .then((r) => r.json())
      .then((data) => {
        const code = data.current.weather_code;
        setClima({
          temperatura: data.current.temperature_2m,
          humedad: data.current.relative_humidity_2m,
          viento: data.current.wind_speed_10m,
          descripcion: WEATHER_DESC[code] ?? "🌤️ Variable",
        });
        const dias: DiaPronos[] = data.daily.time.map((fecha: string, i: number) => ({
          fecha,
          lluvia: data.daily.precipitation_sum[i] ?? 0,
          probLluvia: data.daily.precipitation_probability_max[i] ?? 0,
          weatherCode: data.daily.weather_code[i] ?? 0,
        }));
        setPronostico(dias);
      })
      .catch(() => {});

    // Registros climáticos
    fetch("/api/clima").then((r) => r.json()).then((d) => Array.isArray(d) && setRegistros(d));
  }, []);

  async function guardarRegistroClima(e: React.FormEvent) {
    e.preventDefault();
    setSavingClima(true);
    await fetch("/api/clima", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: fechaReg, precipitacion, granizo, vientoFuerte, helada, observaciones: obsClima }),
    });
    setSavingClima(false);
    setShowFormClima(false);
    setPrecipitacion(""); setGranizo(false); setVientoFuerte(false); setHelada(false); setObsClima("");
    fetch("/api/clima").then((r) => r.json()).then((d) => Array.isArray(d) && setRegistros(d));
  }

  async function runSeed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    window.location.reload();
  }

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-gray-400 text-lg">Cargando...</div>
    </div>
  );

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Banner saludo + clima actual */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-emerald-100 text-sm mb-1">{saludo}, <strong>{user.name.split(" ")[0]}</strong>! 👋</p>
            <h1 className="text-3xl font-bold">FrutiApp</h1>
            <p className="text-emerald-100 mt-1">Sistema de gestión frutícola</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${ROL_COLOR[user.role]}`}>
              {ROL_LABEL[user.role] ?? user.role}
            </span>
            <p className="text-emerald-100 text-xs mt-2">
              {new Date().toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        {/* Clima actual */}
        <div className="border-t border-emerald-400 pt-4">
          <p className="text-emerald-100 text-xs mb-2">📍 Melilla, Montevideo — Clima actual</p>
          {clima ? (
            <div className="flex flex-wrap gap-5 items-center">
              <span className="text-base font-medium">{clima.descripcion}</span>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.temperatura}°C</div>
                  <div className="text-emerald-200 text-xs">Temperatura</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.humedad}%</div>
                  <div className="text-emerald-200 text-xs">Humedad</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.viento} <span className="text-lg">km/h</span></div>
                  <div className="text-emerald-200 text-xs">Viento</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-6 animate-pulse">
              <div className="h-8 w-16 bg-emerald-400 rounded-lg" />
              <div className="h-8 w-16 bg-emerald-400 rounded-lg" />
              <div className="h-8 w-20 bg-emerald-400 rounded-lg" />
            </div>
          )}
        </div>
      </div>

      {/* Pronóstico 7 días */}
      {pronostico.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">🌧️ Pronóstico de lluvia — próximos 7 días</h2>
          <div className="grid grid-cols-7 gap-1">
            {pronostico.map((dia, i) => {
              const fecha = new Date(dia.fecha + "T12:00:00");
              const diaSemana = DIAS[fecha.getDay()];
              const numDia = fecha.getDate();
              const tieneRiesgo = dia.probLluvia >= 50;
              const tieneLluvia = dia.lluvia > 0;
              return (
                <div key={dia.fecha}
                  className={`rounded-xl p-2 text-center ${i === 0 ? "bg-emerald-50 border border-emerald-200" : tieneRiesgo ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-100"}`}>
                  <p className={`text-xs font-semibold ${i === 0 ? "text-emerald-700" : "text-gray-500"}`}>
                    {i === 0 ? "Hoy" : diaSemana}
                  </p>
                  <p className="text-xs text-gray-400">{numDia}</p>
                  <div className="text-xl my-1">
                    {WEATHER_DESC[dia.weatherCode]?.split(" ")[0] ?? "🌤️"}
                  </div>
                  <p className={`text-xs font-bold ${tieneRiesgo ? "text-blue-600" : "text-gray-400"}`}>
                    {dia.probLluvia}%
                  </p>
                  {tieneLluvia && (
                    <p className="text-xs text-blue-500 font-medium">{dia.lluvia}mm</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">Fuente: Open-Meteo · Actualizado al cargar la página</p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cuadros", value: stats.cuadros, icon: "🌳", href: "/dashboard/mapa", color: "border-emerald-200 hover:border-emerald-400" },
          { label: "Aplicaciones", value: stats.aplicaciones, icon: "💊", href: "/dashboard/aplicaciones", color: "border-purple-200 hover:border-purple-400" },
          { label: "Monitoreos", value: stats.visitas, icon: "🔍", href: "/dashboard/monitoreo", color: "border-amber-200 hover:border-amber-400" },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className={`bg-white rounded-2xl border-2 ${s.color} p-4 text-center transition-all hover:shadow-md`}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Registro de precipitaciones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">🌧️ Registro de precipitaciones</h2>
            <p className="text-xs text-gray-400 mt-0.5">Anotá lluvias, granizo, viento fuerte o heladas</p>
          </div>
          <button onClick={() => setShowFormClima(!showFormClima)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold">
            {showFormClima ? "Cancelar" : "＋ Registrar evento"}
          </button>
        </div>

        {showFormClima && (
          <form onSubmit={guardarRegistroClima} className="bg-blue-50 rounded-xl p-4 mb-4 space-y-3">
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

            {/* Eventos especiales */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Eventos especiales</p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { key: "granizo", label: "🌨️ Granizo", val: granizo, set: setGranizo },
                  { key: "vientoFuerte", label: "💨 Viento fuerte", val: vientoFuerte, set: setVientoFuerte },
                  { key: "helada", label: "🧊 Helada", val: helada, set: setHelada },
                ].map(({ key, label, val, set }) => (
                  <button key={key} type="button" onClick={() => set(!val)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <input placeholder="Ej: Tormenta intensa por la tarde, caída de fruta..." value={obsClima}
                onChange={(e) => setObsClima(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <button type="submit" disabled={savingClima}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl">
              {savingClima ? "Guardando..." : "💾 Guardar registro"}
            </button>
          </form>
        )}

        {/* Lista registros */}
        {registros.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin registros de precipitaciones aún</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="text-center min-w-[48px]">
                  <div className="text-sm font-bold text-gray-800">
                    {new Date(r.fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short" })}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(r.fecha).getFullYear()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    {r.precipitacion != null && (
                      <span className="text-sm font-semibold text-blue-600">💧 {r.precipitacion} mm</span>
                    )}
                    {r.granizo && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🌨️ Granizo</span>}
                    {r.vientoFuerte && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">💨 Viento fuerte</span>}
                    {r.helada && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">🧊 Helada</span>}
                  </div>
                  {r.observaciones && <p className="text-xs text-gray-500 mt-0.5 italic">{r.observaciones}</p>}
                  <p className="text-xs text-gray-400">{r.user.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">¿Qué querés hacer?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link href="/dashboard/mapa"
            className="flex flex-col items-center gap-2 bg-white border-2 border-emerald-200 hover:border-emerald-500 hover:shadow-md rounded-2xl p-4 transition-all">
            <span className="text-3xl">🗺️</span>
            <span className="text-sm font-bold text-gray-800">Ver mapa</span>
          </Link>
          {(user.role === "tecnico" || user.role === "productor") && (
            <Link href="/dashboard/aplicaciones?nueva=1"
              className="flex flex-col items-center gap-2 bg-white border-2 border-purple-200 hover:border-purple-500 hover:shadow-md rounded-2xl p-4 transition-all">
              <span className="text-3xl">💊</span>
              <span className="text-sm font-bold text-gray-800">Nueva aplicación</span>
            </Link>
          )}
          {user.role === "monitoreador" && (
            <Link href="/dashboard/monitoreo?nueva=1"
              className="flex flex-col items-center gap-2 bg-white border-2 border-amber-200 hover:border-amber-500 hover:shadow-md rounded-2xl p-4 transition-all">
              <span className="text-3xl">📋</span>
              <span className="text-sm font-bold text-gray-800">Nueva visita</span>
            </Link>
          )}
          <Link href="/dashboard/monitoreo"
            className="flex flex-col items-center gap-2 bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-4 transition-all">
            <span className="text-3xl">🔍</span>
            <span className="text-sm font-bold text-gray-800">Monitoreos</span>
          </Link>
          <Link href="/dashboard/aplicaciones"
            className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-md rounded-2xl p-4 transition-all">
            <span className="text-3xl">📋</span>
            <span className="text-sm font-bold text-gray-800">Aplicaciones</span>
          </Link>
          <Link href="/dashboard/exportar"
            className="flex flex-col items-center gap-2 bg-white border-2 border-teal-200 hover:border-teal-400 hover:shadow-md rounded-2xl p-4 transition-all">
            <span className="text-3xl">📤</span>
            <span className="text-sm font-bold text-gray-800">Exportar</span>
          </Link>
        </div>
      </div>

      {stats.cuadros === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-800">Base de datos vacía</p>
            <p className="text-sm text-amber-600">Cargá datos de ejemplo para probar</p>
          </div>
          <button onClick={runSeed} disabled={seeding}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-medium text-sm">
            {seeding ? "Cargando..." : "Cargar datos de ejemplo"}
          </button>
        </div>
      )}
    </div>
  );
}
