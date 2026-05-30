"use client";

import { useState, useRef, useEffect } from "react";

type Producto = {
  id: string;
  nombre: string;
  principioActivo: string;
  tipoProducto: string;
  carencia: number;
};

const TIPO_COLORS: Record<string, string> = {
  Fungicida: "bg-blue-100 text-blue-700",
  Insecticida: "bg-red-100 text-red-700",
  "Insecticida-Acaricida": "bg-orange-100 text-orange-700",
  Acaricida: "bg-orange-100 text-orange-700",
  Herbicida: "bg-yellow-100 text-yellow-700",
  Coadyuvante: "bg-gray-100 text-gray-600",
  Bactericida: "bg-teal-100 text-teal-700",
  "Regulador de crecimiento": "bg-pink-100 text-pink-700",
  Hormiguicida: "bg-amber-100 text-amber-700",
};

type Props = {
  productos: Producto[];
  value: string; // productoId seleccionado
  onChange: (id: string) => void;
  placeholder?: string;
};

export default function BuscadorProducto({ productos, value, onChange, placeholder = "Buscar producto..." }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Nombre del producto seleccionado
  const seleccionado = productos.find((p) => p.id === value);

  // Filtrar por búsqueda
  const filtrados = query.length < 1
    ? []
    : productos
        .filter((p) =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          p.principioActivo.toLowerCase().includes(query.toLowerCase()) ||
          p.tipoProducto.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 30); // máximo 30 resultados

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function seleccionar(p: Producto) {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  }

  function limpiar() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input de búsqueda */}
      <div className="relative">
        <input
          type="text"
          placeholder={seleccionado ? seleccionado.nombre : placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-8 ${
            seleccionado ? "border-purple-400 bg-purple-50" : "border-gray-300"
          }`}
        />
        {seleccionado ? (
          <button onClick={limpiar} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-lg leading-none">
            ×
          </button>
        ) : (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
        )}
      </div>

      {/* Producto seleccionado */}
      {seleccionado && !query && (
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[seleccionado.tipoProducto] ?? "bg-gray-100 text-gray-600"}`}>
            {seleccionado.tipoProducto}
          </span>
          <span className="text-xs text-gray-500">{seleccionado.principioActivo}</span>
        </div>
      )}

      {/* Desplegable de resultados */}
      {open && query.length >= 1 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              Sin resultados para "{query}"
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b bg-gray-50">
                {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""} {productos.length > 30 && `(de ${productos.length} productos)`}
              </div>
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => seleccionar(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900">{p.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${TIPO_COLORS[p.tipoProducto] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.tipoProducto}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.principioActivo}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
