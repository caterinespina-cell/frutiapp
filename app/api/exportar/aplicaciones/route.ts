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

  const aplicaciones = await prisma.aplicacion.findMany({
    where: {
      ...(desde || hasta ? {
        fecha: {
          ...(desde ? { gte: new Date(desde) } : {}),
          ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
        },
      } : {}),
    },
    include: {
      cuadro: { include: { establecimiento: true } },
      tecnico: { select: { name: true } },
      productos: { include: { producto: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // Formato CSV/Excel (datos planos)
  if (formato === "csv") {
    const rows = aplicaciones.flatMap((a) =>
      a.productos.map((p) => ({
        Fecha: new Date(a.fecha).toLocaleDateString("es-UY"),
        Establecimiento: a.cuadro.establecimiento.nombre,
        Código: a.cuadro.establecimiento.codigo,
        Cuadro: a.cuadro.nombre,
        Variedad: a.cuadro.variedad,
        Especie: a.cuadro.especie,
        Técnico: a.tecnico.name,
        Producto: p.producto.nombre,
        "Principio activo": p.producto.principioActivo,
        Tipo: p.producto.tipoProducto,
        Dosis: p.dosis,
        Unidad: p.unidadDosis,
        "Carencia (días)": p.producto.carencia,
        "Vencimiento carencia": new Date(
          new Date(a.fecha).getTime() + p.producto.carencia * 86400000
        ).toLocaleDateString("es-UY"),
        "Vol. caldo (L/ha)": a.volumenCaldo,
        "Temp (°C)": a.temperatura ?? "",
        "Viento (km/h)": a.viento ?? "",
        "Humedad (%)": a.humedad ?? "",
        Observaciones: a.observaciones ?? "",
      }))
    );

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csv = [
      headers.join(";"),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aplicaciones_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json(aplicaciones);
}
