import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const where =
    session.role === "productor"
      ? { productorId: session.id }
      : {};

  const predios = await prisma.establecimiento.findMany({
    where,
    include: {
      cuadros: {
        include: { trampas: true },
      },
      productor: { select: { name: true } },
    },
  });

  return NextResponse.json(predios);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "productor") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const estab = await prisma.establecimiento.create({
    data: {
      codigo: body.codigo,
      nombre: body.nombre,
      direccion: body.direccion,
      lat: body.lat,
      lng: body.lng,
      productorId: session.id,
    },
  });

  return NextResponse.json(estab);
}
