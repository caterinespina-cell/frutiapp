"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stat = { label: string; value: number; icon: string; href: string };

export default function DashboardHome() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [cuadros, setCuadros] = useState<unknown[]>([]);
  const [aplicaciones, setAplicaciones] = useState<unknown[]>([]);
  const [visitas, setVisitas] = useState<unknown[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser);
    fetch("/api/cuadros").then((r) => r.json()).then((d) => Array.isArray(d) && setCuadros(d));
    fetch("/api/aplicaciones").then((r) => r.json()).then((d) => Array.isArray(d) && setAplicaciones(d));
    fetch("/api/monitoreo/visitas").then((r) => r.json()).then((d) => Array.isArray(d) && setVisitas(d));
  }, [seeded]);

  async function runSeed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    setSeeded(true);
    setSeeding(false);
  }

  if (!user) return <div className="text-gray-400 py-12 text-center">Cargando...</div>;

  const stats: Stat[] = [
    { label: "Cuadros", value: cuadros.length, icon: "🌳", href: "/dashboard/mapa" },
    { label: "Aplicaciones", value: aplicaciones.length, icon: "💊", href: "/dashboard/aplicaciones" },
    { label: "Visitas de monitoreo", value: visitas.length, icon: "🔍", href: "/dashboard/monitoreo" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1 capitalize">
          Accediendo como <strong>{user.role}</strong>
        </p>
      </div>

      {/* Seed button if empty */}
      {cuadros.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">Base de datos vacía</p>
            <p className="text-sm text-amber-600">Cargá datos de demo para probar la aplicación</p>
          </div>
          <button
            onClick={runSeed}
            disabled={seeding}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {seeding ? "Cargando..." : "Cargar datos demo"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className="text-4xl">{stat.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions by role */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/dashboard/mapa" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-center">
            <span className="text-2xl">🗺️</span>
            <span className="text-sm font-medium text-emerald-800">Ver mapa</span>
          </Link>

          {(user.role === "tecnico") && (
            <Link href="/dashboard/aplicaciones?nueva=1" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-center">
              <span className="text-2xl">💊</span>
              <span className="text-sm font-medium text-purple-800">Nueva aplicación</span>
            </Link>
          )}

          {user.role === "monitoreador" && (
            <Link href="/dashboard/monitoreo?nueva=1" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-center">
              <span className="text-2xl">📋</span>
              <span className="text-sm font-medium text-amber-800">Nueva visita</span>
            </Link>
          )}

          <Link href="/dashboard/monitoreo" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-center">
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-blue-800">Ver monitoreos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
