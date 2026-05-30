import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cuadros = await prisma.cuadro.findMany({
    include: {
      establecimiento: { include: { productor: { select: { name: true } } } },
      trampas: true,
      aplicaciones: {
        include: { productos: { include: { producto: true } }, tecnico: { select: { name: true } } },
        orderBy: { fecha: "desc" },
        take: 5,
      },
      brotes: { orderBy: { fecha: "desc" }, take: 5 },
      frutos: { orderBy: { fecha: "desc" }, take: 5 },
    },
  });

  return NextResponse.json(cuadros);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "tecnico" && session.role !== "productor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  // Calcular superficie si no viene pero sí vienen plantas y distancias
  let superficie = body.superficie;
  if (!superficie && body.numeroPlantas && body.distanciaFilas && body.distanciaPlantas) {
    superficie = (body.numeroPlantas * body.distanciaFilas * body.distanciaPlantas) / 10000;
  }

  // Calcular centroide del polígono para el pin
  let lat: number | null = null;
  let lng: number | null = null;
  const coords: [number, number][] = body.coordenadas ?? [];
  if (coords.length > 0) {
    lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  }

  const cuadro = await prisma.cuadro.create({
    data: {
      nombre: body.nombre,
      variedad: body.variedad ?? "",
      especie: body.especie,
      superficie: parseFloat((superficie ?? 0).toFixed(4)),
      numeroPlantas: body.numeroPlantas ? parseInt(body.numeroPlantas) : null,
      distanciaFilas: body.distanciaFilas ? parseFloat(body.distanciaFilas) : null,
      distanciaPlantas: body.distanciaPlantas ? parseFloat(body.distanciaPlantas) : null,
      anoPlantacion: body.anoPlantacion ? parseInt(body.anoPlantacion) : null,
      lat,
      lng,
      coordenadas: JSON.stringify(coords),
      marcadoMonitoreo: body.marcadoMonitoreo ?? false,
      establecimientoId: body.predioId ?? body.establecimientoId,
    },
  });

  return NextResponse.json(cuadro);
}
