import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const formato = searchParams.get("formato") ?? "json";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const tipo = searchParams.get("tipo") ?? "todo"; // "trampas" | "brotes" | "frutos" | "todo"

  const fechaWhere = desde || hasta ? {
    fecha: {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
    },
  } : {};

  const [trampas, brotes, frutos] = await Promise.all([
    tipo === "todo" || tipo === "trampas"
      ? prisma.lecturaTrampa.findMany({
          where: fechaWhere,
          include: {
            trampa: { include: { cuadro: { include: { establecimiento: true } } } },
            visita: { include: { monitoreador: { select: { name: true } } } },
          },
          orderBy: { fecha: "asc" },
        })
      : Promise.resolve([]),
    tipo === "todo" || tipo === "brotes"
      ? prisma.monitoreoBrote.findMany({
          where: fechaWhere,
          include: {
            cuadro: { include: { establecimiento: true } },
            visita: { include: { monitoreador: { select: { name: true } } } },
          },
          orderBy: { fecha: "asc" },
        })
      : Promise.resolve([]),
    tipo === "todo" || tipo === "frutos"
      ? prisma.monitoreoFruto.findMany({
          where: fechaWhere,
          include: {
            cuadro: { include: { establecimiento: true } },
            visita: { include: { monitoreador: { select: { name: true } } } },
          },
          orderBy: { fecha: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (formato === "csv") {
    const sections: string[] = [];

    if (trampas.length > 0) {
      sections.push("=== MONITOREO DE TRAMPAS ===");
      const headers = ["Fecha", "Establecimiento", "Cuadro", "Trampa", "Tipo trampa", "Actividad", "Cant. plagas", "Monitoreador", "Observaciones"];
      sections.push(headers.join(";"));
      trampas.forEach((t) => {
        sections.push([
          new Date(t.fecha).toLocaleDateString("es-UY"),
          t.trampa.cuadro.establecimiento.nombre,
          t.trampa.cuadro.nombre,
          t.trampa.numero,
          t.trampa.tipo,
          t.actividad,
          t.cantidadPlagas,
          t.visita.monitoreador.name,
          t.observaciones ?? "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
      });
      sections.push("");
    }

    if (brotes.length > 0) {
      sections.push("=== MONITOREO DE BROTES ===");
      const headers = ["Fecha", "Establecimiento", "Cuadro", "Variedad", "Objetivo", "Árb. ctrl.", "Árb. daño", "Brotes daño nuevo", "Brotes daño viejo", "Monitoreador", "Observaciones"];
      sections.push(headers.join(";"));
      brotes.forEach((b) => {
        sections.push([
          new Date(b.fecha).toLocaleDateString("es-UY"),
          b.cuadro.establecimiento.nombre,
          b.cuadro.nombre,
          b.cuadro.variedad,
          b.objetivo,
          b.arbolesControlados,
          b.arbolesConDano,
          b.brotesConDanoNuevo,
          b.brotesConDanoViejo,
          b.visita.monitoreador.name,
          b.observaciones ?? "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
      });
      sections.push("");
    }

    if (frutos.length > 0) {
      sections.push("=== MONITOREO DE FRUTOS ===");
      const headers = ["Fecha", "Establecimiento", "Cuadro", "Variedad", "Objetivo", "Frutos ctrl.", "D.nuevo Vivo", "D.nuevo Daño", "D.viejo Muerto", "D.viejo Daño", "Monitoreador", "Observaciones"];
      sections.push(headers.join(";"));
      frutos.forEach((f) => {
        sections.push([
          new Date(f.fecha).toLocaleDateString("es-UY"),
          f.cuadro.establecimiento.nombre,
          f.cuadro.nombre,
          f.cuadro.variedad,
          f.objetivo,
          f.frutosControlados,
          f.danoNuevoVivo,
          f.danoNuevoDano,
          f.danoViejoMuerto,
          f.danoViejoDano,
          f.visita.monitoreador.name,
          f.observaciones ?? "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
      });
    }

    const csv = sections.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="monitoreo_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ trampas, brotes, frutos });
}
