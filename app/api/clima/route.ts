import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const registros = await prisma.registroClimatico.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { fecha: "desc" },
    take: 60, // últimos 60 registros
  });

  return NextResponse.json(registros);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const registro = await prisma.registroClimatico.create({
    data: {
      fecha: new Date(body.fecha),
      precipitacion: body.precipitacion ? parseFloat(body.precipitacion) : null,
      granizo: body.granizo ?? false,
      vientoFuerte: body.vientoFuerte ?? false,
      helada: body.helada ?? false,
      observaciones: body.observaciones || null,
      userId: session.id,
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(registro);
}
