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
  // Productores y técnicos pueden registrar aplicaciones
  if (!session || (session.role !== "tecnico" && session.role !== "productor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();

  // Soporta un cuadro (cuadroId) o múltiples (cuadroIds[])
  const cuadroIds: string[] = body.cuadroIds?.length
    ? body.cuadroIds
    : body.cuadroId
    ? [body.cuadroId]
    : [];

  if (!cuadroIds.length) {
    return NextResponse.json({ error: "Seleccioná al menos un cuadro" }, { status: 400 });
  }

  // Crear una aplicación por cuadro con los mismos datos
  const aplicaciones = await Promise.all(
    cuadroIds.map((cuadroId) =>
      prisma.aplicacion.create({
        data: {
          cuadroId,
          fecha: new Date(body.fecha),
          volumenCaldo: body.volumenCaldo,
          temperatura: body.temperatura ?? null,
          viento: body.viento ?? null,
          humedad: body.humedad ?? null,
          observaciones: body.observaciones ?? null,
          tecnicoId: session.id,
          productos: {
            create: body.productos.map(
              (p: { productoId: string; dosis: number; unidadDosis: string }) => ({
                productoId: p.productoId,
                dosis: p.dosis,
                unidadDosis: p.unidadDosis,
              })
            ),
          },
        },
        include: { productos: { include: { producto: true } } },
      })
    )
  );

  return NextResponse.json(aplicaciones);
}
