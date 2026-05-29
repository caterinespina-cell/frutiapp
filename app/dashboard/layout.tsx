"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type User = { id: string; name: string; email: string; role: string };

const roleLabels: Record<string, string> = {
  productor: "Productor",
  tecnico: "Técnico",
  monitoreador: "Monitoreador",
};

const roleColors: Record<string, string> = {
  productor: "bg-blue-100 text-blue-800",
  tecnico: "bg-purple-100 text-purple-800",
  monitoreador: "bg-amber-100 text-amber-800",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data) router.push("/login");
        else setUser(data);
      });
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", label: "Inicio", icon: "🏠", roles: ["productor", "tecnico", "monitoreador"] },
    { href: "/dashboard/mapa", label: "Mapa", icon: "🗺️", roles: ["productor", "tecnico", "monitoreador"] },
    { href: "/dashboard/aplicaciones", label: "Aplicaciones", icon: "💊", roles: ["productor", "tecnico"] },
    { href: "/dashboard/monitoreo", label: "Monitoreo", icon: "🔍", roles: ["productor", "tecnico", "monitoreador"] },
    { href: "/dashboard/productos", label: "Productos", icon: "🧪", roles: ["tecnico"] },
    { href: "/dashboard/exportar", label: "Exportar", icon: "📤", roles: ["productor", "tecnico", "monitoreador"] },
  ].filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-emerald-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍑</span>
            <span className="font-bold text-lg">FrutiApp</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-emerald-800 text-white"
                    : "text-emerald-100 hover:bg-emerald-600"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span
              className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                roleColors[user.role] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {roleLabels[user.role] ?? user.role}
            </span>
            <span className="hidden md:block text-sm text-emerald-200">{user.name}</span>
            <button
              onClick={logout}
              className="text-xs bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
            <button
              className="md:hidden p-1"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-emerald-800 px-4 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-emerald-100 hover:bg-emerald-700"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
