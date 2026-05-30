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

type Clima = { temperatura: number; humedad: number; viento: number; descripcion: string };

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ cuadros: 0, aplicaciones: 0, visitas: 0 });
  const [seeding, setSeeding] = useState(false);
  const [clima, setClima] = useState<Clima | null>(null);

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

    // Clima automático al cargar — Melilla, Montevideo
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.776&longitude=-56.048&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=America%2FMontevideo"
    )
      .then((r) => r.json())
      .then((data) => {
        const code = data.current.weather_code;
        const descripciones: Record<number, string> = {
          0: "☀️ Despejado", 1: "🌤️ Mayormente despejado", 2: "⛅ Parcialmente nublado",
          3: "☁️ Nublado", 45: "🌫️ Niebla", 48: "🌫️ Niebla", 51: "🌦️ Llovizna",
          53: "🌦️ Llovizna", 55: "🌧️ Llovizna intensa", 61: "🌧️ Lluvia leve",
          63: "🌧️ Lluvia", 65: "🌧️ Lluvia intensa", 71: "🌨️ Nieve leve",
          80: "🌦️ Chubascos", 81: "🌧️ Chubascos", 95: "⛈️ Tormenta",
        };
        setClima({
          temperatura: data.current.temperature_2m,
          humedad: data.current.relative_humidity_2m,
          viento: data.current.wind_speed_10m,
          descripcion: descripciones[code] ?? "🌤️ Variable",
        });
      })
      .catch(() => {});
  }, []);

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

      {/* Saludo + Clima */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-emerald-100 text-sm mb-1">
              {saludo}, <strong>{user.name.split(" ")[0]}</strong>! 👋
            </p>
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

        {/* Clima */}
        <div className="mt-4 pt-4 border-t border-emerald-400">
          <p className="text-emerald-100 text-xs mb-2">📍 Melilla, Montevideo</p>
          {clima ? (
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-lg font-medium">{clima.descripcion}</span>
              <div className="flex gap-5">
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.temperatura}°C</div>
                  <div className="text-emerald-200 text-xs">Temperatura</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.humedad}%</div>
                  <div className="text-emerald-200 text-xs">Humedad</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{clima.viento}<span className="text-lg"> km/h</span></div>
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

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cuadros registrados", value: stats.cuadros, icon: "🌳", href: "/dashboard/mapa", color: "border-emerald-200 hover:border-emerald-400" },
          { label: "Aplicaciones realizadas", value: stats.aplicaciones, icon: "💊", href: "/dashboard/aplicaciones", color: "border-purple-200 hover:border-purple-400" },
          { label: "Visitas de monitoreo", value: stats.visitas, icon: "🔍", href: "/dashboard/monitoreo", color: "border-amber-200 hover:border-amber-400" },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className={`bg-white rounded-2xl border-2 ${s.color} p-5 text-center transition-all hover:shadow-md`}>
            <div className="text-4xl mb-2">{s.icon}</div>
            <div className="text-4xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Acciones principales — grandes y claras */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">¿Qué querés hacer?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Ver mapa — todos */}
          <Link href="/dashboard/mapa"
            className="flex items-center gap-5 bg-white border-2 border-emerald-200 hover:border-emerald-500 hover:shadow-md rounded-2xl p-5 transition-all group">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-4xl flex-shrink-0">🗺️</div>
            <div>
              <p className="text-lg font-bold text-gray-900 group-hover:text-emerald-700">Ver el mapa</p>
              <p className="text-sm text-gray-500">Ver todos los cuadros y trampas en el mapa satelital</p>
            </div>
          </Link>

          {/* Registrar aplicación — productor y técnico */}
          {(user.role === "tecnico" || user.role === "productor") && (
            <Link href="/dashboard/aplicaciones?nueva=1"
              className="flex items-center gap-5 bg-white border-2 border-purple-200 hover:border-purple-500 hover:shadow-md rounded-2xl p-5 transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-4xl flex-shrink-0">💊</div>
              <div>
                <p className="text-lg font-bold text-gray-900 group-hover:text-purple-700">Registrar aplicación</p>
                <p className="text-sm text-gray-500">Anotar productos fitosanitarios aplicados en uno o varios cuadros</p>
              </div>
            </Link>
          )}

          {/* Nueva visita — monitoreador */}
          {user.role === "monitoreador" && (
            <Link href="/dashboard/monitoreo?nueva=1"
              className="flex items-center gap-5 bg-white border-2 border-amber-200 hover:border-amber-500 hover:shadow-md rounded-2xl p-5 transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl flex-shrink-0">📋</div>
              <div>
                <p className="text-lg font-bold text-gray-900 group-hover:text-amber-700">Registrar visita</p>
                <p className="text-sm text-gray-500">Anotar monitoreo de trampas, brotes y frutos</p>
              </div>
            </Link>
          )}

          {/* Ver aplicaciones */}
          <Link href="/dashboard/aplicaciones"
            className="flex items-center gap-5 bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-md rounded-2xl p-5 transition-all group">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0">📋</div>
            <div>
              <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700">Ver aplicaciones</p>
              <p className="text-sm text-gray-500">Historial completo de productos aplicados</p>
            </div>
          </Link>

          {/* Ver monitoreos */}
          <Link href="/dashboard/monitoreo"
            className="flex items-center gap-5 bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-5 transition-all group">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-4xl flex-shrink-0">🔍</div>
            <div>
              <p className="text-lg font-bold text-gray-900 group-hover:text-blue-700">Ver monitoreos</p>
              <p className="text-sm text-gray-500">Trampas, brotes y frutos de cada cuadro</p>
            </div>
          </Link>

          {/* Exportar */}
          <Link href="/dashboard/exportar"
            className="flex items-center gap-5 bg-white border-2 border-teal-200 hover:border-teal-400 hover:shadow-md rounded-2xl p-5 transition-all group">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-4xl flex-shrink-0">📤</div>
            <div>
              <p className="text-lg font-bold text-gray-900 group-hover:text-teal-700">Exportar datos</p>
              <p className="text-sm text-gray-500">Descargar planillas de aplicaciones y monitoreos</p>
            </div>
          </Link>

        </div>
      </div>

      {/* Datos demo si está vacío */}
      {stats.cuadros === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-800">La base de datos está vacía</p>
            <p className="text-sm text-amber-600">Cargá datos de ejemplo para probar la aplicación</p>
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
