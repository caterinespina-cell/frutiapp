import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const aplicaciones = await prisma.aplicacion.findMany({
    include: {
      cuadro: { include: { establecimiento: true } },
      tecnico: { select: { name: true } },
      productos: { include: { producto: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(aplicaciones);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tecnico") {
    return NextResponse.json({ error: "Solo técnicos pueden registrar aplicaciones" }, { status: 403 });
  }

  const body = await req.json();

  const aplicacion = await prisma.aplicacion.create({
    data: {
      cuadroId: body.cuadroId,
      fecha: new Date(body.fecha),
      volumenCaldo: body.volumenCaldo,
      temperatura: body.temperatura ?? null,
      viento: body.viento ?? null,
      humedad: body.humedad ?? null,
      observaciones: body.observaciones ?? null,
      tecnicoId: session.id,
      productos: {
        create: body.productos.map((p: { productoId: string; dosis: number; unidadDosis: string }) => ({
          productoId: p.productoId,
          dosis: p.dosis,
          unidadDosis: p.unidadDosis,
        })),
      },
    },
    include: { productos: { include: { producto: true } } },
  });

  return NextResponse.json(aplicacion);
}
