"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type User = { id: string; name: string; email: string; role: string };

const ROL_LABELS: Record<string, string> = {
  productor: "Productor",
  tecnico: "Técnico",
  monitoreador: "Monitoreador",
};

const ROL_COLORS: Record<string, string> = {
  productor: "bg-blue-100 text-blue-700",
  tecnico: "bg-purple-100 text-purple-700",
  monitoreador: "bg-amber-100 text-amber-700",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: "🏠", roles: ["productor", "tecnico", "monitoreador"] },
  { href: "/dashboard/predios", label: "Predios", icon: "🏡", roles: ["productor", "tecnico"] },
  { href: "/dashboard/mapa", label: "Mapa de cuadros", icon: "🗺️", roles: ["productor", "tecnico", "monitoreador"] },
  { href: "/dashboard/aplicaciones", label: "Aplicaciones", icon: "💊", roles: ["productor", "tecnico"] },
  { href: "/dashboard/monitoreo", label: "Monitoreo", icon: "🔍", roles: ["productor", "tecnico", "monitoreador"] },
  { href: "/dashboard/productos", label: "Productos", icon: "🧪", roles: ["tecnico"] },
  { href: "/dashboard/exportar", label: "Exportar datos", icon: "📤", roles: ["productor", "tecnico", "monitoreador"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id) router.push("/login");
        else setUser(data);
      });
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-lg">Cargando...</div>
    </div>
  );

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Sidebar — escritorio */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <span className="text-3xl">🍑</span>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">FrutiBook</h1>
            <p className="text-xs text-gray-400">Gestión frutícola</p>
          </div>
        </div>

        {/* Usuario */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLORS[user.role]}`}>
                {ROL_LABELS[user.role] ?? user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Salir */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — mobile */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍑</span>
            <span className="font-bold text-gray-900">FrutiBook</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-2xl">×</button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLORS[user.role]}`}>
            {ROL_LABELS[user.role] ?? user.role}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}>
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 mt-4">
            <span className="text-xl">🚪</span>
            Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Topbar mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🍑</span>
            <span className="font-bold text-gray-900">FrutiBook</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
