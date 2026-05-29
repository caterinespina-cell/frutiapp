"use client";

import { useState } from "react";

type Formato = "csv" | "xlsx";
type TipoExport = "aplicaciones" | "monitoreo";

export default function ExportarPage() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [formato, setFormato] = useState<Formato>("xlsx");
  const [tipoMonitoreo, setTipoMonitoreo] = useState("todo");
  const [loading, setLoading] = useState<TipoExport | null>(null);

  async function descargar(tipo: TipoExport) {
    setLoading(tipo);
    try {
      if (formato === "csv") {
        // Descarga directa CSV desde la API
        const params = new URLSearchParams({ formato: "csv" });
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        if (tipo === "monitoreo") params.set("tipo", tipoMonitoreo);

        const url = `/api/exportar/${tipo}?${params}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tipo}_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
      } else {
        // Excel: obtener datos JSON y generar xlsx en cliente
        const params = new URLSearchParams({ formato: "json" });
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        if (tipo === "monitoreo") params.set("tipo", tipoMonitoreo);

        const res = await fetch(`/api/exportar/${tipo}?${params}`);
        const data = await res.json();

        // Importar xlsx dinámicamente
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();

        if (tipo === "aplicaciones") {
          const rows = (data as unknown[]).flatMap((a: unknown) => {
            const ap = a as {
              fecha: string; cuadro: { establecimiento: { nombre: string; codigo: string }; nombre: string; variedad: string; especie: string };
              tecnico: { name: string }; volumenCaldo: number; temperatura?: number; viento?: number; humedad?: number; observaciones?: string;
              productos: Array<{ producto: { nombre: string; principioActivo: string; tipoProducto: string; carencia: number }; dosis: number; unidadDosis: string }>;
            };
            return ap.productos.map((p) => ({
              "Fecha": new Date(ap.fecha).toLocaleDateString("es-UY"),
              "Establecimiento": ap.cuadro.establecimiento.nombre,
              "Código": ap.cuadro.establecimiento.codigo,
              "Cuadro": ap.cuadro.nombre,
              "Variedad": ap.cuadro.variedad,
              "Especie": ap.cuadro.especie,
              "Técnico": ap.tecnico.name,
              "Producto": p.producto.nombre,
              "Principio activo": p.producto.principioActivo,
              "Tipo": p.producto.tipoProducto,
              "Dosis": p.dosis,
              "Unidad dosis": p.unidadDosis,
              "Carencia (días)": p.producto.carencia,
              "Venc. carencia": new Date(
                new Date(ap.fecha).getTime() + p.producto.carencia * 86400000
              ).toLocaleDateString("es-UY"),
              "Vol. caldo (L/ha)": ap.volumenCaldo,
              "Temp (°C)": ap.temperatura ?? "",
              "Viento (km/h)": ap.viento ?? "",
              "Humedad (%)": ap.humedad ?? "",
              "Observaciones": ap.observaciones ?? "",
            }));
          });
          const ws = XLSX.utils.json_to_sheet(rows);
          ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
          XLSX.utils.book_append_sheet(wb, ws, "Aplicaciones");
        } else {
          const d = data as {
            trampas: unknown[]; brotes: unknown[]; frutos: unknown[];
          };

          if (d.trampas?.length) {
            const rows = d.trampas.map((t: unknown) => {
              const tr = t as {
                fecha: string; trampa: { numero: string; tipo: string; cuadro: { nombre: string; establecimiento: { nombre: string } } };
                actividad: string; cantidadPlagas: number; visita: { monitoreador: { name: string } }; observaciones?: string;
              };
              return {
                "Fecha": new Date(tr.fecha).toLocaleDateString("es-UY"),
                "Establecimiento": tr.trampa.cuadro.establecimiento.nombre,
                "Cuadro": tr.trampa.cuadro.nombre,
                "Trampa": tr.trampa.numero,
                "Tipo trampa": tr.trampa.tipo,
                "Actividad": tr.actividad,
                "Cant. plagas": tr.cantidadPlagas,
                "Monitoreador": tr.visita.monitoreador.name,
                "Observaciones": tr.observaciones ?? "",
              };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Trampas");
          }

          if (d.brotes?.length) {
            const rows = d.brotes.map((b: unknown) => {
              const br = b as {
                fecha: string; cuadro: { nombre: string; variedad: string; establecimiento: { nombre: string } };
                objetivo: string; arbolesControlados: number; arbolesConDano: number;
                brotesConDanoNuevo: number; brotesConDanoViejo: number;
                visita: { monitoreador: { name: string } }; observaciones?: string;
              };
              return {
                "Fecha": new Date(br.fecha).toLocaleDateString("es-UY"),
                "Establecimiento": br.cuadro.establecimiento.nombre,
                "Cuadro": br.cuadro.nombre,
                "Variedad": br.cuadro.variedad,
                "Objetivo": br.objetivo,
                "Árb. controlados": br.arbolesControlados,
                "Árb. con daño": br.arbolesConDano,
                "% árb. daño": br.arbolesControlados ? ((br.arbolesConDano / br.arbolesControlados) * 100).toFixed(1) + "%" : "0%",
                "Brotes daño nuevo": br.brotesConDanoNuevo,
                "Brotes daño viejo": br.brotesConDanoViejo,
                "Monitoreador": br.visita.monitoreador.name,
                "Observaciones": br.observaciones ?? "",
              };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Brotes");
          }

          if (d.frutos?.length) {
            const rows = d.frutos.map((f: unknown) => {
              const fr = f as {
                fecha: string; cuadro: { nombre: string; variedad: string; establecimiento: { nombre: string } };
                objetivo: string; frutosControlados: number;
                danoNuevoVivo: number; danoNuevoDano: number; danoViejoMuerto: number; danoViejoDano: number;
                visita: { monitoreador: { name: string } }; observaciones?: string;
              };
              const totalDano = fr.danoNuevoDano + fr.danoViejoDano;
              return {
                "Fecha": new Date(fr.fecha).toLocaleDateString("es-UY"),
                "Establecimiento": fr.cuadro.establecimiento.nombre,
                "Cuadro": fr.cuadro.nombre,
                "Variedad": fr.cuadro.variedad,
                "Objetivo": fr.objetivo,
                "Frutos ctrl.": fr.frutosControlados,
                "D.nuevo Vivo": fr.danoNuevoVivo,
                "D.nuevo Daño": fr.danoNuevoDano,
                "D.viejo Muerto": fr.danoViejoMuerto,
                "D.viejo Daño": fr.danoViejoDano,
                "% daño total": fr.frutosControlados ? ((totalDano / fr.frutosControlados) * 100).toFixed(1) + "%" : "0%",
                "Monitoreador": fr.visita.monitoreador.name,
                "Observaciones": fr.observaciones ?? "",
              };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Frutos");
          }
        }

        XLSX.writeFile(wb, `${tipo}_${new Date().toISOString().split("T")[0]}.xlsx`);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">📤 Exportar datos</h1>

      {/* Filtros comunes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
            <div className="flex gap-2 mt-1">
              {(["xlsx", "csv"] as Formato[]).map((f) => (
                <button key={f} onClick={() => setFormato(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${formato === f ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"}`}>
                  {f === "xlsx" ? "📊 Excel" : "📄 CSV"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exportar aplicaciones */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">💊 Aplicaciones fitosanitarias</h2>
            <p className="text-sm text-gray-500 mt-1">
              Historial completo con productos, dosis, condiciones climáticas y fechas de carencia
            </p>
          </div>
          <button onClick={() => descargar("aplicaciones")} disabled={loading === "aplicaciones"}
            className="ml-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
            {loading === "aplicaciones" ? "Generando..." : `⬇ Descargar ${formato.toUpperCase()}`}
          </button>
        </div>
      </div>

      {/* Exportar monitoreo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">🔍 Datos de monitoreo</h2>
            <p className="text-sm text-gray-500 mt-1">Trampas, brotes y frutos en hojas separadas</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[
                { value: "todo", label: "Todo" },
                { value: "trampas", label: "🪤 Trampas" },
                { value: "brotes", label: "🌿 Brotes" },
                { value: "frutos", label: "🍑 Frutos" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setTipoMonitoreo(opt.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${tipoMonitoreo === opt.value ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => descargar("monitoreo")} disabled={loading === "monitoreo"}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
            {loading === "monitoreo" ? "Generando..." : `⬇ Descargar ${formato.toUpperCase()}`}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 px-1">
        💡 Los archivos Excel (.xlsx) incluyen columnas calculadas como % de daño y fecha de vencimiento de carencia.
        Los archivos CSV se abren directamente en Excel separados por punto y coma.
      </div>
    </div>
  );
}
