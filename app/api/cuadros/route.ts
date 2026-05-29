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
  const cuadro = await prisma.cuadro.create({
    data: {
      nombre: body.nombre,
      variedad: body.variedad,
      especie: body.especie,
      superficie: body.superficie,
      coordenadas: JSON.stringify(body.coordenadas ?? []),
      marcadoMonitoreo: body.marcadoMonitoreo ?? false,
      establecimientoId: body.establecimientoId,
    },
  });

  return NextResponse.json(cuadro);
}
