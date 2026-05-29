import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const visitas = await prisma.visitaMonitoreo.findMany({
    include: {
      monitoreador: { select: { name: true } },
      lecturasTrampa: { include: { trampa: { include: { cuadro: true } } } },
      brotes: { include: { cuadro: true } },
      frutos: { include: { cuadro: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(visitas);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "monitoreador") {
    return NextResponse.json({ error: "Solo monitoreadores pueden registrar visitas" }, { status: 403 });
  }

  const body = await req.json();

  const visita = await prisma.visitaMonitoreo.create({
    data: {
      fecha: new Date(body.fecha),
      monitoreadorId: session.id,
      observacionesGenerales: body.observacionesGenerales ?? null,
      lecturasTrampa: body.lecturasTrampa?.length
        ? {
            create: body.lecturasTrampa.map((l: { trampaId: string; actividad: string; cantidadPlagas: number; observaciones?: string }) => ({
              trampaId: l.trampaId,
              fecha: new Date(body.fecha),
              actividad: l.actividad,
              cantidadPlagas: l.cantidadPlagas,
              observaciones: l.observaciones ?? null,
            })),
          }
        : undefined,
      brotes: body.brotes?.length
        ? {
            create: body.brotes.map((b: { cuadroId: string; objetivo: string; arbolesControlados: number; arbolesConDano: number; brotesConDanoNuevo: number; brotesConDanoViejo: number; observaciones?: string }) => ({
              cuadroId: b.cuadroId,
              fecha: new Date(body.fecha),
              objetivo: b.objetivo,
              arbolesControlados: b.arbolesControlados,
              arbolesConDano: b.arbolesConDano,
              brotesConDanoNuevo: b.brotesConDanoNuevo,
              brotesConDanoViejo: b.brotesConDanoViejo,
              observaciones: b.observaciones ?? null,
            })),
          }
        : undefined,
      frutos: body.frutos?.length
        ? {
            create: body.frutos.map((f: { cuadroId: string; objetivo: string; frutosControlados: number; danoNuevoVivo: number; danoNuevoDano: number; danoViejoMuerto: number; danoViejoDano: number; observaciones?: string }) => ({
              cuadroId: f.cuadroId,
              fecha: new Date(body.fecha),
              objetivo: f.objetivo,
              frutosControlados: f.frutosControlados,
              danoNuevoVivo: f.danoNuevoVivo,
              danoNuevoDano: f.danoNuevoDano,
              danoViejoMuerto: f.danoViejoMuerto,
              danoViejoDano: f.danoViejoDano,
              observaciones: f.observaciones ?? null,
            })),
          }
        : undefined,
    },
    include: {
      lecturasTrampa: true,
      brotes: true,
      frutos: true,
    },
  });

  return NextResponse.json(visita);
}
